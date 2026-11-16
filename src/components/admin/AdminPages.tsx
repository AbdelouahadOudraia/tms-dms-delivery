import { Activity, ArrowRight, Building2, Cable, ChevronRight, CircleAlert, ExternalLink, KeyRound, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { AdminCompany, CompanyStatus } from '../../types/administration';
import { adminLink, ConnectionBadge, DataList, detailLink, formatDate, Info, Panel } from './AdminUI';
import { CompanyEmailForm, ConfirmCompanyDeletion, ConfirmCompanyStatus, RenameCompany } from './AdminForms';
import { SalesDialog, SalesPill } from '../backoffice/SalesUI';

const linkClass = 'inline-flex items-center gap-1 font-medium text-[#0057a8] hover:underline';
function CompanyLink({ company }: { company: AdminCompany }) {
  return <a className={linkClass} href={detailLink(company.id)}>{company.name}<ChevronRight size={14}/></a>;
}
const searchCompany = (c: AdminCompany) => c.name + ' ' + c.id;
const typeName = (c: AdminCompany) => c.connection.state === 'empty' ? '—' : c.connection.kind === 'seller' ? 'Seller' : 'API standard';
const testLabel = (test: boolean | null) => test === null ? 'À tester' : test ? 'Réussi' : 'Échec';
const createButton = <a className="bo-button-primary" href={adminLink('entreprises/nouvelle')}><Plus size={16}/>Créer une entreprise</a>;
function StatusBadge({ status }: { status: CompanyStatus }) {
  return <SalesPill tone={status === 'active' ? 'green' : 'neutral'}>{status === 'active' ? 'Active' : 'Désactivée'}</SalesPill>;
}

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
  const [status, setStatus] = useState('');
  const actions = <div className="flex flex-wrap items-center gap-3">
    <select aria-label="Filtrer par statut" className="bo-input" value={status} onChange={e=>setStatus(e.target.value)}>
      <option value="">Tous les statuts</option><option value="active">Actives</option><option value="disabled">Désactivées</option>
    </select>{createButton}</div>;
  return <DataList title="Entreprises enregistrées" action={actions}
    items={status ? companies.filter(c => c.status === status) : companies} keyOf={c=>c.id} searchText={searchCompany}
    headings={['Entreprise','Identifiant','Statut','Création','Connexion commerciale']} empty={status ? 'Aucune entreprise avec ce statut.' : 'Aucune entreprise enregistrée.'}
    cells={c=>[<CompanyLink company={c}/>,c.id,<StatusBadge status={c.status}/>,formatDate(c.createdAt,false),<ConnectionBadge connection={c.connection}/>]}/>;
}
export function Connections({ companies }: {companies: AdminCompany[]}) {
  return <DataList title="Connexions par entreprise" items={companies} keyOf={c=>c.id} searchText={searchCompany}
    headings={['Entreprise','Système','Configuration','Dernier test enregistré','Dernière synchronisation','Erreur de synchronisation']} empty="Aucune entreprise à superviser."
    cells={c=>[<CompanyLink company={c}/>,typeName(c),<ConnectionBadge connection={c.connection}/>,c.connection.lastTest?<span>{testLabel(c.connection.lastTest.ok)}<small className="block text-slate-600">{formatDate(c.connection.lastTest.at)}</small></span>:'Aucun',
      c.connection.lastSyncAt?formatDate(c.connection.lastSyncAt):'Aucune',c.connection.error??'—']}/>;
}
function CompanyDeletion({ company, busy, done }: { company: AdminCompany; busy: boolean; done(): void }) {
  const [showConditions, setShowConditions] = useState(false);
  const [confirmation, setConfirmation] = useState<AdminCompany | null>(null);
  const available = company.deletionRevision != null;
  return <div className="border-t border-slate-100 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-800">La suppression d’un espace entreprise est irréversible.</p>
        {available ? <p className="mt-1 text-sm text-slate-600">Base locale de test</p> : <button type="button" className={linkClass+' mt-1 text-sm'} aria-haspopup="dialog" onClick={()=>setShowConditions(true)}>
          Pourquoi la suppression est-elle indisponible ?
        </button>}
      </div>
      <button type="button" disabled={!available || busy} onClick={()=>setConfirmation(company)} aria-haspopup="dialog"
        className="bo-button-secondary border-red-200 text-red-700 disabled:cursor-not-allowed">
        <Trash2 size={15} aria-hidden="true"/>Supprimer définitivement
      </button>
    </div>
    {available && confirmation && confirmation.deletionRevision === company.deletionRevision && confirmation.name === company.name &&
      <ConfirmCompanyDeletion company={confirmation} close={()=>setConfirmation(null)} done={done}/>}
    {showConditions && <SalesDialog title="Conditions de suppression" subtitle={company.name} onClose={()=>setShowConditions(false)}>
      <p className="text-sm text-slate-700">Pour tester la suppression, créez une entreprise fictive dans l’administration locale de test, puis désactivez-la depuis sa fiche.</p>
      <button type="button" className="bo-button-secondary mt-5" onClick={()=>setShowConditions(false)}>Annuler</button>
    </SalesDialog>}
  </div>;
}

export function Details({ company: c, open, notify, onDeleted, busy }: {
  company: AdminCompany; open(c: AdminCompany):void;
  notify(message: string):void; onDeleted(c: AdminCompany):void; busy:boolean;
}) {
  const [editing,setEditing] = useState(false);
  const [requestedStatus, setRequestedStatus] = useState<CompanyStatus | null>(null);
  const disabled = c.status === 'disabled';
  const s = c.connection;
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3"><button className="bo-button-primary" disabled={busy || disabled} onClick={()=>open(c)}><ExternalLink size={15}/>Ouvrir l’espace TMS/DMS</button>
      <a href={adminLink('entreprises')} className="bo-button-secondary">Retour aux entreprises</a></div>
    <Panel title="Informations générales" action={<button className={linkClass+' text-sm'} onClick={()=>setEditing(!editing)}>{editing?'Annuler':'Modifier le nom'}</button>}>
      <div className="p-5 sm:p-6">{editing ? <RenameCompany company={c} done={()=>{setEditing(false);notify('Nom de l’entreprise enregistré.');}}/> :
        <dl className="grid gap-5 sm:grid-cols-3"><Info label="Entreprise">{c.name}</Info><Info label="Identifiant d’espace">{c.id}</Info><Info label="Date de création">{formatDate(c.createdAt)}</Info></dl>}</div>
    </Panel>
    <Panel title="Configuration commerciale" action={<ConnectionBadge connection={s}/>}>
      <dl className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3"><Info label="Système commercial">{typeName(c)}</Info>
        <Info label="Synchronisation">{disabled?'Suspendue':s.state==='empty'?'—':s.automatic?'Automatique':'Manuelle'}</Info><Info label="Test de la configuration">{s.state==='configured'?testLabel(s.test):'—'}</Info>
        <Info label="Dernière synchronisation">{s.lastSyncAt?formatDate(s.lastSyncAt):'Aucune'}</Info><Info label="Dernière réussite">{s.lastSuccessAt?formatDate(s.lastSuccessAt):'Aucune'}</Info>
        <Info label="Erreur de synchronisation">{s.error ? s.error+' · '+s.failures+' échec(s) consécutif(s)' : 'Aucune en cours'}</Info>
        {s.lastTest && <Info label="Dernier test enregistré">{testLabel(s.lastTest.ok)} · {formatDate(s.lastTest.at)}</Info>}</dl>
    </Panel>
    <Panel title="Accès à l’espace"><div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
      <dl><Info label="Adresse e-mail de connexion">{c.email??'Adresse à renseigner'}{c.activationPending && <span className="mt-1 block text-xs text-amber-800">En attente d’activation par e-mail</span>}</Info></dl>
    </div></Panel>
    <div key={(c.email??'')+'|'+(c.pendingEmail??'')}><CompanyEmailForm company={c} notify={notify}/></div>
    <Panel title="Gestion de l’entreprise"><div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
      <div className="max-w-2xl"><dl><Info label="Statut de l’entreprise"><StatusBadge status={c.status}/></Info></dl>
        <p className="mt-2 text-sm text-slate-600">La désactivation arrête les accès à cet espace et ses synchronisations. Elle conserve les données et ne modifie pas le blocage du compte, géré dans Comptes et accès.</p></div>
      <button className="bo-button-secondary" disabled={busy} onClick={()=>setRequestedStatus(disabled ? 'active' : 'disabled')}>
        {disabled ? 'Réactiver l’entreprise' : 'Désactiver l’entreprise'}
      </button>
    </div>
      {disabled && <CompanyDeletion company={c} busy={busy} done={()=>onDeleted(c)}/>}
    </Panel>
    {requestedStatus && <ConfirmCompanyStatus company={c} status={requestedStatus} close={()=>setRequestedStatus(null)}
      done={message=>{setRequestedStatus(null); notify(message);}}/>}
  </div>;
}
