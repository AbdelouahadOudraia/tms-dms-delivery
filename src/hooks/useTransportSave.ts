import { useLayoutEffect, useRef, useState } from 'react';
import { useCompanySpace } from '../context/CompanySpace';
import { api, companyPath, type TransportState, type TransportSnapshot } from '../context/companyApi';
import {useAutoRefresh,mayApplyRefresh} from './useAutoRefresh';
import {adoptTransportSnapshot,serializeTransport} from '../utils/transportSnapshot';

export function useTransportSave(data: TransportState,onRemote:(data:TransportState)=>void) {
  const { company, initial, flush, report } = useCompanySpace();
  const state = useRef({ revision: initial.revision, saved: '', pending: '', running: null as Promise<void> | null, started: false });
  const remote=useRef(onRemote);remote.current=onRemote;
  const [lastUpdated,setLastUpdated]=useState<number|null>(null);
  const readError=useRef('');
  const refresh=useAutoRefresh(companyPath(company.id)+'/transport',async signal=>{
    const job=state.current;
    if(job.running || job.saved!==job.pending)return;
    const revision=job.revision;
    const snapshot=await api<TransportSnapshot>(companyPath(company.id)+'/transport','GET',undefined,signal);
    if(!mayApplyRefresh(signal)||job.running||job.saved!==job.pending||job.revision!==revision)return;
    const next=adoptTransportSnapshot(job,snapshot);
    if(next)remote.current(next);
    setLastUpdated(Date.now());
    if(readError.current){report('',readError.current);readError.current='';}
  },{onError:error=>{readError.current=error instanceof Error?error.message:'Lecture des données de transport impossible.';report(readError.current);}});
  useLayoutEffect(() => {
    const job = state.current;
    job.pending = serializeTransport(data);
    if (!job.started) { job.saved = job.pending; job.started = true; }
    function save(): Promise<void> {
      if (job.running) return job.running;
      if (job.saved === job.pending) return Promise.resolve();
      job.running = (async () => {
        while (job.saved !== job.pending) {
          const pending = job.pending;
          const result = await api<{revision: number}>(companyPath(company.id) + '/transport', 'PUT', { revision: job.revision, data: JSON.parse(pending) });
          job.revision = result.revision; job.saved = pending;setLastUpdated(Date.now());
        }
      })().finally(() => { job.running = null;refresh(); });
      return job.running;
    }
    flush.current = save;
    void save().catch(e => report(e.message));
    const beforeUnload = (e: BeforeUnloadEvent) => { if (job.pending !== job.saved) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { window.removeEventListener('beforeunload', beforeUnload); flush.current = async () => {}; };
  }, [data, company.id, flush, report]);
  return lastUpdated;
}
