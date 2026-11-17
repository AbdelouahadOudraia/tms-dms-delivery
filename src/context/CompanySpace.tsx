import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, companyPath, networkMessage, sessionExpiredMessage, sessionKey, type Company, type TransportSnapshot } from './companyApi';
import { PlatformLogin } from '../components/PlatformLogin';
import { PlatformSetup } from '../components/PlatformSetup';
import {EmailEnrollment} from '../components/EmailEnrollment';
import {useAutoRefresh,mayApplyRefresh} from '../hooks/useAutoRefresh';
const AdminArea = React.lazy(() => import('../components/admin/AdminArea'));

type Access = { setup: boolean; account: { role: 'admin' | 'company'; companyId: string | null } | null; companies: Company[];requiresEmailVerification?:boolean;email?:string|null };
interface Space { company: Company; admin: boolean; initial: TransportSnapshot; flush: React.MutableRefObject<() => Promise<void>>;
  manage(): void; logout(): void; report(error: string,previous?:string): void }
const Context = createContext<Space | null>(null);
export function useCompanySpace() { const value = useContext(Context); if (!value) throw new Error('Espace requis.'); return value; }

export function CompanyGate({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<Access | null>(null);
  const [space, setSpace] = useState<{ company: Company; initial: TransportSnapshot } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const latestAccess=useRef(access);latestAccess.current=access;
  const flush = useRef(async () => {});
  const loadVersion = useRef(0);
  async function open(company: Company) {
    const version = ++loadVersion.current;
    const initial = await api<TransportSnapshot>(companyPath(company.id) + '/transport');
    if (version !== loadVersion.current) return;
    sessionStorage.setItem('tms.company', company.id);
    setSpace({ company, initial });
  }
  async function refresh(resume: boolean) {
    const data = await api<Access>('/access');
    if (!data.account) {
      if (!data.setup && sessionStorage.getItem(sessionKey)) setError(sessionExpiredMessage);
      setAccess(data); sessionStorage.removeItem(sessionKey); setSpace(null); return;
    }
    const resumeCompany = resume && !location.hash.startsWith('#/admin') && sessionStorage.getItem('tms.company');
    const company = data.companies.find(c => c.id === (data.account?.companyId || resumeCompany));
    if (company && company.status !== 'disabled') await open(company);
    else sessionStorage.removeItem('tms.company');
    setAccess(data);
  }
  async function action(fn: () => Promise<void>, networkMessage?: string) {
    setError(''); setBusy(true);
    try { await fn(); } catch (e) {
      setError(networkMessage && e instanceof TypeError ? networkMessage : e instanceof Error ? e.message : 'Opération impossible.');
    }
    finally { setBusy(false); }
  }
  function authenticate(path: '/login', credentials: Record<string, FormDataEntryValue>) {
    setNotice('');
    return action(async () => {
      const result = await api<{ token: string }>(path, 'POST', credentials);
      if (!result || typeof result.token !== 'string' || !result.token) throw new Error('Réponse de connexion inattendue. Réessayez plus tard.');
      sessionStorage.setItem(sessionKey, result.token);
      await refresh(false);
    }, networkMessage);
  }
  useEffect(() => {
    void action(() => refresh(true), networkMessage);
    const expired = () => { loadVersion.current++; setSpace(null); setAccess(a => a && { ...a, account: null, companies: [] }); setError(sessionExpiredMessage); };
    window.addEventListener('tms-session-expired', expired);
    return () => window.removeEventListener('tms-session-expired', expired);
  }, []);
  useAutoRefresh('/access',async signal=>{
    if(busy)return;
    const data=await api<Access>('/access','GET',undefined,signal);
    if(!mayApplyRefresh(signal))return;
    // Recover an initial network failure without requiring a manual reload.
    // Do not reopen a space that another initialization has already loaded.
    if(!latestAccess.current) {
      const resumeCompany=!location.hash.startsWith('#/admin')&&sessionStorage.getItem('tms.company');
      const company=data.companies.find(item=>item.id===(data.account?.companyId||resumeCompany));
      if(data.account&&company&&company.status!=='disabled') {
        const initial=await api<TransportSnapshot>(companyPath(company.id)+'/transport','GET',undefined,signal);
        if(!mayApplyRefresh(signal)||latestAccess.current)return;
        sessionStorage.setItem('tms.company',company.id);setSpace({company,initial});
      }
      setError('');setAccess(data);return;
    }
    if(!data.account) {
      if(sessionStorage.getItem(sessionKey))setError(sessionExpiredMessage);
      sessionStorage.removeItem(sessionKey);setSpace(null);
    } else {
      setSpace(previous=>{
        if(!previous)return previous;
        const updated=data.companies.find(item=>item.id===previous.company.id);
        if(!updated || updated.status==='disabled'){sessionStorage.removeItem('tms.company');return null;}
        return JSON.stringify(updated)===JSON.stringify(previous.company)?previous:{...previous,company:updated};
      });
    }
    setAccess(previous=>JSON.stringify(previous)===JSON.stringify(data)?previous:data);
  },{enabled:access===null||Boolean(access.account||access.setup),interval:access?.account?15000:5000});
  useEffect(() => {
    if (!space || access?.account?.role !== 'admin') return;
    const backToAdmin = () => {
      if (location.hash.startsWith('#/admin')) void action(async () => {
        await flush.current();
        sessionStorage.removeItem('tms.company');
        setSpace(null);
      });
    };
    window.addEventListener('hashchange', backToAdmin);
    return () => window.removeEventListener('hashchange', backToAdmin);
  }, [space, access?.account?.role]);
  const logout = () => void action(async () => {
    await flush.current(); await api('/logout','POST'); loadVersion.current++;
    sessionStorage.removeItem(sessionKey); sessionStorage.removeItem('tms.company');
    history.replaceState(null,'',location.pathname+location.search);
    setSpace(null); setNotice(''); await refresh(false);
  });
  if (access?.account && access.requiresEmailVerification) return <EmailEnrollment email={access.email??null} logout={logout}/>;
  if (access?.account && space) return <Context.Provider value={{ ...space, admin: access.account.role === 'admin', flush,
    manage: () => void action(async () => {
      await flush.current();sessionStorage.removeItem('tms.company');
      history.replaceState(null,'', '#/admin/entreprises');setSpace(null);
    }),
    logout, report: (message,previous)=>setError(current=>previous&&current!==previous?current:message) }}>
    {error && <div role="alert" className="fixed inset-x-0 bottom-0 z-[100] bg-red-50 p-3 text-center text-sm text-red-800">{error}</div>}
    <React.Fragment key={space.company.id}>{children}</React.Fragment>
  </Context.Provider>;
  if (access && !access.account && !access.setup) {
    return <>{notice && <p role="status" className="bg-emerald-50 p-3 text-center text-sm text-emerald-800">{notice}</p>}
      <PlatformLogin busy={busy} error={error} clearError={() => setError('')}
        onLogin={(login, password) => authenticate('/login', { login, password })}/></>;
  }
  if (access?.account?.role === 'admin') return <React.Suspense fallback={<p role="status" className="p-6">Ouverture de l’administration…</p>}>
    <AdminArea busy={busy} error={error} logout={logout} open={item => void action(async () => {
      const updated = await api<Access>('/access');
      const company = updated.companies.find(c => c.id === item.id);
      if (!company || updated.account?.role !== 'admin') throw new Error('Accès à cet espace refusé.');
      await open(company);
      history.replaceState(null,'',location.pathname+location.search);
    }, networkMessage)} passwordChanged={() => {
      loadVersion.current++;
      sessionStorage.removeItem(sessionKey); sessionStorage.removeItem('tms.company');
      history.replaceState(null,'',location.pathname+location.search);
      setSpace(null);setError('');setNotice('Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe.');
      setAccess({setup:false,account:null,companies:[]});
    }}/>
  </React.Suspense>;
  if (access?.setup) return <PlatformSetup busy={busy} error={error} clearError={()=>setError('')}
    onCreate={async data => {
      await api('/setup', 'POST', data);
    }}/>;
  return <main className="grid min-h-screen place-items-center bg-[#F5F7FA] p-4 text-[#1F2937]">
    <section className="bo-panel w-full max-w-md space-y-5 p-6">
      <p className="text-sm text-[#0057A8]">TMS / DMS Delivery</p><h1 className="text-xl font-semibold">Ouverture de la plateforme</h1>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button onClick={() => void action(() => refresh(true), networkMessage)} disabled={busy}>Réessayer</button>
    </section>
  </main>;
}
