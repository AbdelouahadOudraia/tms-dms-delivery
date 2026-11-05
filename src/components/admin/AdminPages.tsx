import { Activity, ArrowRight, Building2, Cable, ChevronRight, CircleAlert, ExternalLink, KeyRound, Plus } from 'lucide-react';
import { useState } from 'react';
import type { AdminCompany, AdminOverview } from '../../types/administration';
import { adminLink, ConnectionBadge, DataList, detailLink, formatDate, Info, Panel } from './AdminUI';
import { RenameCompany } from './AdminForms';

const linkClass = 'inline-flex items-center gap-1 font-medium text-[#0057a8] hover:underline';
function CompanyLink({ company }: { company: AdminCompany }) {
  return <a className={linkClass} href={detailLink(company.id)}>{company.name}<ChevronRight size={14}/></a>;
}
const searchCompany = (c: AdminCompany) => c.name + ' ' + c.id;
const typeName = (c: AdminCompany) => c.connection.state === 'empty' ? '—' : c.connection.kind === 'seller' ? 'Seller' : 'API standard';
const testLabel = (test: boolean | null) => test === null ? 'À tester' : test ? 'Réussi' : 'Échec';
const createButton = <a className="bo-button-primary" href={adminLink('entreprises/nouvelle')}><Plus size={16}/>Créer une entreprise</a>;

export function Overview({ companies }: { companies: AdminCompany[] }) {
  const configured = companies.filter(c => c.connection.state === 'configured');
  const errors = configured.filter(c => c.connection.test === false || c.connection.failures > 0);
  const recent = companies.filter(c => c.createdAt).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,5);
  const cards = [
    {label:'Entreprises enregistrées',count:companies.length,Icon:Building2,style:'bg-blue-50 text-blue-800',href:adminLink('entreprises')},
    {label:'Connexions configurées',count:configured.length,Icon:Cable,style:'bg-teal-50 text-teal-800',href:adminLink('connexions')},
    {label:'Connexions en erreur',count:errors.length,Icon:CircleAlert,style:errors.length?'bg-red-50 text-red-800':'bg-slate-100 text-slate-600',href:adminLink('connexions')},
  ];
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-3">{cards.map(({label,count,Icon,style,href}) => <a key={label} href={href}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-300">
      <div className="flex items-center justify-between"><span className={'grid size-10 place-items-center rounded-lg '+style}><Icon size={20}/></span><ChevronRight className="text-slate-400" size={16}/></div>
      <p className="mt-4 text-3xl font-semibold tabular-nums text-[#123758]">{count}</p><p className="mt-1 text-sm text-slate-600">{label}</p>
    </a>)}</div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
      <Panel title="Dernières entreprises créées" action={<a className={linkClass+' text-sm'} href={adminLink('entreprises')}>Voir toutes <ArrowRight size={14}/></a>}>
        {recent.length ? <ul className="divide-y divide-slate-100">{recent.map(c => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <div><CompanyLink company={c}/><p className="text-xs text-slate-500">{c.id}</p></div><time className="text-sm text-slate-600">{formatDate(c.createdAt,false)}</time>
        </li>)}</ul> : <p className="p-6 text-sm text-slate-600">{companies.length ? 'Les espaces historiques ont été enregistrés sans date de création.' : 'La première entreprise créée apparaîtra ici.'}</p>}
      </Panel>
      <Panel title="Actions rapides"><div className="flex flex-col items-start gap-4 p-5">{createButton}
        <a className={linkClass} href={adminLink('entreprises')}><Building2 size={16}/>Consulter les entreprises</a>
        <a className={linkClass} href={adminLink('connexions')}><Activity size={16}/>Superviser les connexions</a></div></Panel>
    </div>
  </div>;
}

export function Companies({ companies }: {companies: AdminCompany[]}) {
  return <DataList title="Entreprises enregistrées" action={createButton} items={companies} keyOf={c=>c.id} searchText={searchCompany}
    headings={['Entreprise','Identifiant','Création','Connexion commerciale']} empty="Aucune entreprise enregistrée."
    cells={c=>[<CompanyLink company={c}/>,c.id,formatDate(c.createdAt,false),<ConnectionBadge connection={c.connection}/>]}/>;
}
export function Connections({ companies }: {companies: AdminCompany[]}) {
  return <DataList title="Connexions par entreprise" items={companies} keyOf={c=>c.id} searchText={searchCompany}
    headings={['Entreprise','Système','Configuration','Dernier test enregistré','Dernière synchronisation','Erreur de synchronisation']} empty="Aucune entreprise à superviser."
    cells={c=>[<CompanyLink company={c}/>,typeName(c),<ConnectionBadge connection={c.connection}/>,c.connection.lastTest?<span>{testLabel(c.connection.lastTest.ok)}<small className="block text-slate-600">{formatDate(c.connection.lastTest.at)}</small></span>:'Aucun',
      c.connection.lastSyncAt?formatDate(c.connection.lastSyncAt):'Aucune',c.connection.error??'—']}/>;
}
export function Accounts({ data, reset }: {data: AdminOverview; reset(c: AdminCompany):void}) {
  const byId = new Map(data.companies.map(c=>[c.id,c]));
  return <DataList title="Comptes autorisés" items={data.accounts} keyOf={a=>a.login} searchText={a=>a.login+' '+(byId.get(a.companyId)?.name??'Administrateur')}
    headings={['Identifiant','Rôle','Entreprise','Accès']} empty="Aucun compte enregistré."
    cells={a=>{const c=byId.get(a.companyId);return [a.login,a.role==='admin'?'Administrateur plateforme':'Entreprise',
      c?<CompanyLink company={c}/>:'Plateforme', c?<button className={linkClass} onClick={()=>reset(c)}><KeyRound size={14}/>Réinitialiser</button>:
      <a className={linkClass} href={adminLink('parametres')}>Mon compte</a>];}}/>;
}
export function Details({ company: c, open, reset, renamed, busy }: { company: AdminCompany; open(c: AdminCompany):void; reset(c: AdminCompany):void; renamed():void; busy:boolean }) {
  const [editing,setEditing] = useState(false);
  const s = c.connection;
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3"><button className="bo-button-primary" disabled={busy} onClick={()=>open(c)}><ExternalLink size={15}/>Ouvrir l’espace TMS/DMS</button>
      <a href={adminLink('entreprises')} className="bo-button-secondary">Retour aux entreprises</a></div>
    <Panel title="Informations générales" action={<button className={linkClass+' text-sm'} onClick={()=>setEditing(!editing)}>{editing?'Annuler':'Modifier le nom'}</button>}>
      <div className="p-5 sm:p-6">{editing ? <RenameCompany company={c} done={()=>{setEditing(false);renamed();}}/> :
        <dl className="grid gap-5 sm:grid-cols-3"><Info label="Entreprise">{c.name}</Info><Info label="Identifiant d’espace">{c.id}</Info><Info label="Date de création">{formatDate(c.createdAt)}</Info></dl>}</div>
    </Panel>
    <Panel title="Configuration commerciale" action={<ConnectionBadge connection={s}/>}>
      <dl className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3"><Info label="Système commercial">{typeName(c)}</Info>
        <Info label="Synchronisation">{s.state==='empty'?'—':s.automatic?'Automatique':'Manuelle'}</Info><Info label="Test de la configuration">{s.state==='configured'?testLabel(s.test):'—'}</Info>
        <Info label="Dernière synchronisation">{s.lastSyncAt?formatDate(s.lastSyncAt):'Aucune'}</Info><Info label="Dernière réussite">{s.lastSuccessAt?formatDate(s.lastSuccessAt):'Aucune'}</Info>
        <Info label="Erreur de synchronisation">{s.error ? s.error+' · '+s.failures+' échec(s) consécutif(s)' : 'Aucune en cours'}</Info>
        {s.lastTest && <Info label="Dernier test enregistré">{testLabel(s.lastTest.ok)} · {formatDate(s.lastTest.at)}</Info>}</dl>
    </Panel>
    <Panel title="Accès à l’espace"><div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
      <dl><Info label="Identifiant de connexion">{c.login??'Accès à définir'}</Info></dl><button className="bo-button-secondary" onClick={()=>reset(c)}><KeyRound size={15}/>{c.login?'Réinitialiser le mot de passe':'Définir le mot de passe'}</button>
    </div></Panel>
  </div>;
}
