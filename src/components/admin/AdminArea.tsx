import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Cable, ChevronRight, LayoutDashboard, LoaderCircle, LogOut, Menu, RefreshCw, Settings, ShieldCheck, Truck, UsersRound, X } from 'lucide-react';
import { api, networkMessage } from '../../context/companyApi';
import type { AdminCompany, AdminOverview } from '../../types/administration';
import { Accounts, Companies, Connections, Details, Overview } from './AdminPages';
import { AdminPassword, CompanyPassword, CreateCompany } from './AdminForms';
import { adminLink, formatDate, Info, Panel } from './AdminUI';

const sections = [
  { path:'', title:'Tableau de bord', icon:LayoutDashboard },
  { path:'entreprises', title:'Entreprises', icon:Building2 },
  { path:'comptes', title:'Comptes et accès', icon:UsersRound },
  { path:'connexions', title:'Connexions commerciales', icon:Cable },
  { path:'parametres', title:'Paramètres', icon:Settings },
];
function readRoute() {
  const hash = window.location.hash;
  return hash === '#/admin' || !hash ? '' : hash.startsWith('#/admin/') ? hash.slice(8) : 'inconnue';
}
type Props = { open(c: AdminCompany):void; logout():void; passwordChanged():void; busy:boolean; error:string };
export default function AdminArea({ open,logout,passwordChanged,busy,error }: Props) {
  const [route,setRoute] = useState(readRoute), [menu,setMenu] = useState(false);
  const [data,setData] = useState<AdminOverview | null>(null), [loading,setLoading] = useState(true);
  const [loadError,setLoadError] = useState(''), [notice,setNotice] = useState('');
  const [reset,setReset] = useState<AdminCompany | null>(null);
  const version = useRef(0);
  const reload = useCallback(async () => {
    const ticket = ++version.current;
    setLoading(true);setLoadError('');
    try { const result = await api<AdminOverview>('/admin/overview'); if(ticket===version.current) setData(result); }
    catch(e) { if(ticket===version.current) setLoadError(e instanceof TypeError ? networkMessage : e instanceof Error ? e.message : 'Chargement impossible.'); }
    finally { if(ticket===version.current) setLoading(false); }
  },[]);
  useEffect(()=>{
    void reload();
    const onFocus = () => { void reload(); };
    const onRoute = () => { setRoute(readRoute());setMenu(false);setReset(null); };
    window.addEventListener('focus',onFocus); window.addEventListener('hashchange',onRoute);
    return ()=>{ version.current++;window.removeEventListener('focus',onFocus);window.removeEventListener('hashchange',onRoute); };
  },[reload]);
  const active = route.startsWith('entreprise/') || route==='entreprises/nouvelle' ? 'entreprises' : route;
  const selected = data?.companies.find(c => 'entreprise/'+encodeURIComponent(c.id)===route);
  const title = route==='entreprises/nouvelle' ? 'Créer une entreprise' : route.startsWith('entreprise/') ? selected?.name ?? 'Détails de l’entreprise' :
    sections.find(s=>s.path===route)?.title ?? 'Page introuvable';
  const notify = (message: string) => { setNotice(message);void reload(); };
  return <div className="min-h-dvh bg-[#f4f7fb] text-slate-900 md:grid md:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[246px_minmax(0,1fr)]">
    <aside className="z-20 flex flex-col bg-[#0b3152] text-white md:sticky md:top-0 md:h-dvh">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 p-4 md:px-6 md:py-7">
        <a href={adminLink()} className="flex items-center gap-3" aria-label="TMS/DMS, accueil administrateur"><span className="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15"><Truck size={22}/></span>
          <span><strong className="block text-sm tracking-wide">TMS / DMS Delivery</strong><span className="text-xs text-blue-200">Administration</span></span></a>
        <button className="p-2 md:hidden" aria-label="Navigation administrateur" aria-expanded={menu} aria-controls="admin-menu" onClick={()=>setMenu(!menu)}>{menu?<X size={20}/>:<Menu size={20}/>}</button>
      </div>
      <div id="admin-menu" className={(menu?'flex':'hidden')+' flex-1 flex-col md:flex'}>
        <nav aria-label="Administration" className="space-y-1 p-3 md:py-6">{sections.map(({path,title:label,icon:Icon})=>
          <a key={path} href={adminLink(path)} aria-current={active===path?'page':undefined} onClick={()=>{setMenu(false);setNotice('');}}
            className={'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium '+(active===path?'bg-[#175080] text-white':'text-blue-100 hover:bg-white/10')}>
            <Icon size={18} aria-hidden="true"/>{label}</a>)}</nav>
        <div className="mt-auto border-t border-white/10 p-3"><button disabled={busy} onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-blue-100 hover:bg-white/10"><LogOut size={17}/>Se déconnecter</button></div>
      </div>
    </aside>
    <div className="min-w-0"><header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600"><span>Administration</span><ChevronRight size={14}/><span className="truncate font-medium text-slate-900">{title}</span></div>
      <a href={adminLink('parametres')} className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-semibold text-[#17446a]"><ShieldCheck size={17}/>admin</a>
    </header>
    <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-6 sm:px-8 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="break-words text-2xl font-semibold tracking-tight text-[#123758] sm:text-3xl">{title}</h1>
        <button className="bo-button-secondary" onClick={()=>void reload()} disabled={loading}><RefreshCw size={15} className={loading?'animate-spin':''}/>Actualiser</button></div>
      {(loadError || error) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{loadError || error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {!data && loading && <p role="status" className="flex items-center gap-2 text-sm text-slate-600"><LoaderCircle className="animate-spin" size={16}/>Chargement de l’administration…</p>}
      {data && <>
        {route==='' ? <Overview companies={data.companies}/> :
        route==='entreprises' ? <Companies companies={data.companies}/> :
        route==='entreprises/nouvelle' ? <CreateCompany created={name=>{window.location.hash=adminLink('entreprises');notify('Espace créé pour '+name+'.');}}/> :
        selected ? <div key={selected.id}><Details company={selected} open={open} reset={setReset} busy={busy} renamed={()=>notify('Nom de l’entreprise enregistré.')}/></div> :
        route==='comptes' ? <Accounts data={data} reset={setReset}/> :
        route==='connexions' ? <Connections companies={data.companies}/> :
        route==='parametres' ? <div className="max-w-3xl space-y-5"><Panel title="Mon compte" action={<button className="bo-button-secondary" disabled={busy} onClick={logout}><LogOut size={15}/>Se déconnecter</button>}>
          <dl className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6"><Info label="Identifiant">{data.session.login}</Info><Info label="Rôle">Administrateur plateforme</Info><Info label="Fin de session prévue">{formatDate(data.session.expiresAt)}</Info></dl>
          </Panel><AdminPassword changed={passwordChanged}/></div> :
        <Panel title="Élément introuvable"><a className="m-5 inline-block text-blue-800 underline" href={adminLink('entreprises')}>Consulter les entreprises</a></Panel>}
      </>}
    </main></div>
    {reset && <CompanyPassword company={reset} close={()=>setReset(null)} done={()=>{setReset(null);notify('Accès mis à jour pour '+reset.name+'.');}}/>}
  </div>;
}
