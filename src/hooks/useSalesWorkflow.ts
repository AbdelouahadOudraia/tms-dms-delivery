import { api, companyPath } from '../context/companyApi';
import { useCompanySpace } from '../context/CompanySpace';
import { useEffect, useRef, useState } from 'react';
import type { Delivery } from '../types';
import type { CommercialSource, SalesApiSettings, SalesBlRequest, SalesWorkspace } from '../types/sales';
import { createSalesWorkspace } from '../utils/salesSynchronization';
import {useAutoRefresh,mayApplyRefresh} from './useAutoRefresh';

export const useSalesWorkflow = (_deliveries: Delivery[], onGenerated: (bls: Delivery[]) => void) => {
  const { company } = useCompanySpace();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<SalesWorkspace>(() => { const initial = createSalesWorkspace(company.id); initial.settings = { ...initial.settings, companyName: company.name, connectorId: 'standard', sourceName: '' }; return initial; });
  const [selectionIds, setSelectionIds] = useState<string[]>([]);
  const [serviceError, setServiceError] = useState('');
  const [busy, setBusy] = useState(false);
  const generatedCallback = useRef(onGenerated);
  generatedCallback.current = onGenerated;
  const lastBls = useRef('');
  const lastState = useRef('');
  const mounted = useRef(true);
  const generation = useRef(0);
  const mutations = useRef(0);

  const apply = (snapshot: SalesWorkspace) => {
    if (!mounted.current) return;
    setReady(true);
    const serialized = JSON.stringify(snapshot);
    if (serialized !== lastState.current) { lastState.current = serialized; setState(snapshot); }
    const bls = JSON.stringify(snapshot.generatedBls);
    if (bls !== lastBls.current) { lastBls.current = bls; if (snapshot.generatedBls.length) generatedCallback.current(snapshot.generatedBls); }
    setServiceError('');
  };

  const request = <T,>(route: string, method = "GET", body?: unknown) => api<T>(companyPath(company.id) + route, method, body);

  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const refresh=useAutoRefresh(companyPath(company.id)+'/state',async signal=>{
    if(mutations.current>0)return;
    const version=generation.current;
    const snapshot=await api<SalesWorkspace>(companyPath(company.id)+'/state','GET',undefined,signal);
    if(mayApplyRefresh(signal)&&version===generation.current&&mutations.current===0)apply(snapshot);
  },{onError:error=>setServiceError(error instanceof Error?error.message:'Le serveur de synchronisation est indisponible.')});

  const operation = async (route: string, method = 'POST', body?: unknown) => {
    const version = ++generation.current;
    mutations.current++;
    setBusy(true);
    try { const snapshot = await request<SalesWorkspace>(route, method, body); if (version === generation.current) apply(snapshot); return snapshot; }
    catch (error) { setServiceError(error instanceof Error ? error.message : 'Opération impossible.'); throw error; }
    finally { mutations.current--; generation.current++; if (mounted.current) {setBusy(mutations.current > 0);refresh();} }
  };

  const generateBls = async (requests: SalesBlRequest[]) => {
    const version = ++generation.current;
    mutations.current++;
    setBusy(true);
    try {
      const result = await request<{ state: SalesWorkspace; generated: Delivery[] }>('/generate', 'POST', { requests });
      if (version === generation.current) { apply(result.state); setSelectionIds([]); } return result.generated;
    } catch (error) { setServiceError(error instanceof Error ? error.message : 'Génération impossible.'); throw error; }
    finally { mutations.current--; generation.current++; if (mounted.current) {setBusy(mutations.current > 0);refresh();} }
  };

  return { ...state, ready, selectionIds, busy, serviceError,
    updateSettings: (settings: SalesApiSettings) => operation('/settings', 'PUT', settings),
    authorizeSource: (source: CommercialSource) => operation('/sources', 'POST', source),
    revokeSource: (source: CommercialSource) => operation('/sources', 'DELETE', source),
    testConnection: () => { void operation('/test').catch(() => {}); },
    retrieveDossiers: () => { void operation('/sync').catch(() => {}); },
    setAutomatic: (automatic: boolean) => { void operation('/settings', 'PUT', { ...state.settings, automatic }).catch(() => {}); },
    generateBls,
    setSelectionIds: (ids: string[]) => setSelectionIds([...new Set(ids)]),
  };
};

export type SalesWorkflow = ReturnType<typeof useSalesWorkflow>;
