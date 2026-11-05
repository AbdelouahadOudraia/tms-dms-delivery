import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, companyPath, networkMessage, sessionExpiredMessage, sessionKey, type Company, type TransportSnapshot } from './companyApi';
import { PlatformLogin } from '../components/PlatformLogin';
const AdminArea = React.lazy(() => import('../components/admin/AdminArea'));

type Access = { setup: boolean; account: { role: 'admin' | 'company'; companyId: string | null } | null; companies: Company[] };
interface Space { company: Company; admin: boolean; initial: TransportSnapshot; flush: React.MutableRefObject<() => Promise<void>>;
  manage(): void; logout(): void; report(error: string): void }
const Context = createContext<Space | null>(null);
export function useCompanySpace() { const value = useContext(Context); if (!value) throw new Error('Espace requis.'); return value; }

export function CompanyGate({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<Access | null>(null);
  const [space, setSpace] = useState<{ company: Company; initial: TransportSnapshot } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [notice, setNotice] = useState('');
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
      if (sessionStorage.getItem(sessionKey)) setError(sessionExpiredMessage);
      setAccess(data); sessionStorage.removeItem(sessionKey); setSpace(null); return;
    }
    const resumeCompany = resume && !location.hash.startsWith('#/admin') && sessionStorage.getItem('tms.company');
    const company = data.companies.find(c => c.id === (data.account?.companyId || resumeCompany));
    if (company) await open(company);
    setAccess(data);
  }
  async function action(fn: () => Promise<void>, networkMessage?: string) {
    setError(''); setBusy(true);
    try { await fn(); } catch (e) {
      setError(networkMessage && e instanceof TypeError ? networkMessage : e instanceof Error ? e.message : 'Opération impossible.');
    }
    finally { setBusy(false); }
  }
  function authenticate(path: '/setup' | '/login', credentials: Record<string, FormDataEntryValue>) {
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
  if (access?.account && space) return <Context.Provider value={{ ...space, admin: access.account.role === 'admin', flush,
    manage: () => void action(async () => {
      await flush.current();sessionStorage.removeItem('tms.company');
      history.replaceState(null,'', '#/admin/entreprises');setSpace(null);
    }),
    logout, report: setError }}>
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
  return <main className="grid min-h-screen place-items-center bg-[#F5F7FA] p-4 text-[#1F2937]">
    <section className="bo-panel w-full max-w-md space-y-5 p-6">
      <p className="text-sm text-[#0057A8]">TMS / DMS Delivery</p><h1 className="text-xl font-semibold">{access?.setup ? 'Créer le compte administrateur' : 'Ouverture de la plateforme'}</h1>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {access?.setup ? <form className="space-y-4" onSubmit={e => {
        e.preventDefault(); void authenticate('/setup', Object.fromEntries(new FormData(e.currentTarget)));
      }}>
        <Field label="Identifiant" name="login" defaultValue="admin" readOnly/>
        <Field label="Mot de passe (10 caractères minimum)" name="password" type="password" minLength={10}/>
        <button className="bo-button-primary" disabled={busy}>Créer le compte</button>
      </form> : <button onClick={() => void action(() => refresh(true), networkMessage)} disabled={busy}>Réessayer</button>}
    </section>
  </main>;
}
function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {label: string}) {
  return <label className="block text-sm">{label}<input required className="bo-input mt-1 w-full" {...props}/></label>;
}
