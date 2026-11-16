import {useCallback,useEffect,useRef,useState} from 'react';
import {LoaderCircle,ShieldCheck} from 'lucide-react';
import {api,networkMessage} from '../../context/companyApi';
import type {AdminAccount,AccountAccessDetails,AccountBlockReason,AccountStatus,SecurityAction} from '../../types/administration';
import {accountHistoryLimit} from '../../types/administration';
import {adminLink,detailLink,DataList,Info,Panel,formatDate} from './AdminUI';
import {SalesDialog,SalesPill} from '../backoffice/SalesUI';

const linkClass='font-medium text-[#0057a8] hover:underline';
const accountLink=(login:string)=>adminLink('compte/'+encodeURIComponent(login));
const accountPath=(login:string)=>'/admin/accounts/'+encodeURIComponent(login);
const reasonLabels:Record<AccountBlockReason,string>={
  account_unavailable:'Espace entreprise introuvable',company_disabled:'Entreprise désactivée',account_suspended:'Compte bloqué par l’administrateur',
  activation_pending:'Activation du compte en attente',email_missing:'Adresse e-mail manquante',email_unverified:'Adresse e-mail non vérifiée',
};
const eventLabels:Record<SecurityAction,string>={
  login_succeeded:'Connexion réussie',login_refused:'Connexion refusée',suspended:'Compte bloqué',reactivated:'Compte débloqué',
  sessions_revoked:'Sessions révoquées',email_change_requested:'Changement d’adresse demandé',email_verified:'Adresse e-mail vérifiée',
  account_activated:'Compte activé',password_reset:'Mot de passe réinitialisé',password_changed:'Mot de passe modifié',
  email_rebound:'Adresse réattribuée par maintenance autorisée',company_disabled:'Entreprise désactivée',company_reactivated:'Entreprise réactivée',
  company_registered:'Entreprise enregistrée',
};
function Status({account}:{account:AdminAccount}) {
  return <SalesPill tone={account.status==='active'?'green':'red'}>{account.status==='active'?'Actif':'Bloqué'}</SalesPill>;
}
function Verification({account}:{account:AdminAccount}) {
  return <div><span className="whitespace-nowrap"><SalesPill tone={account.emailVerified?'green':'orange'}>{account.emailVerified?'Vérifiée':account.email?'À vérifier':'Manquante'}</SalesPill></span>
    {account.pendingEmail && <span className="mt-1 block text-xs text-amber-800">Nouvelle adresse à vérifier</span>}</div>;
}
function Access({account}:{account:AdminAccount}) {
  return <div className="max-w-64"><SalesPill tone={account.access.allowed?'green':'red'}>{account.access.allowed?'Autorisé':'Bloqué'}</SalesPill>
    {!account.access.allowed && <ul className="mt-1 space-y-1 text-xs text-slate-600">{account.access.reasons.map(reason=><li key={reason}>{reasonLabels[reason]}</li>)}</ul>}</div>;
}
export function Accounts({accounts}:{accounts:AdminAccount[]}) {
  return <div className="space-y-4"><p className="text-sm text-slate-600">Gérez les accès de connexion. Bloquer un compte ne désactive pas son entreprise ni ses synchronisations automatiques.</p>
    <DataList title="Comptes et autorisations" responsive items={accounts}
      keyOf={account=>account.login} searchLabel="Rechercher un compte, un e-mail ou une entreprise"
      searchText={account=>[account.login,account.email,account.pendingEmail,account.companyName].join(' ')}
      headings={['Compte','Adresse e-mail','Type','Entreprise','Statut du compte','Accès effectif','Actions']} empty="Aucun compte enregistré."
      cells={account=>[<span className="block break-all font-medium md:min-w-[100px]">{account.login}</span>,<span className="block break-all md:min-w-[150px] md:max-w-[210px] md:truncate" title={account.email??undefined}>{account.email??'À renseigner'}</span>,
        account.role==='admin'?'Administrateur plateforme':'Entreprise',account.companyName??'Plateforme',<Status account={account}/>,<Access account={account}/>,
        <a href={account.role==='admin'?adminLink('parametres'):accountLink(account.login)} className={linkClass}>{account.role==='admin'?'Mon compte':'Gérer l’accès'}</a>]}/></div>;
}

export function AccountAccess({login,revision,refreshVersion,notify}:{login:string;revision:number;refreshVersion:number;notify(message:string):void}) {
  const [data,setData]=useState<AccountAccessDetails|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [action,setAction]=useState<{kind:AccountStatus;revision:number}|null>(null);
  const [busy,setBusy]=useState(false),[operationError,setOperationError]=useState('');
  const requestVersion=useRef(0),lock=useRef(false);
  const load=useCallback(async()=>{
    const version=++requestVersion.current;setLoading(true);setError('');
    try {const result=await api<AccountAccessDetails>(accountPath(login));if(version===requestVersion.current)setData(result);}
    catch(cause){if(version===requestVersion.current)setError(cause instanceof TypeError?networkMessage:cause instanceof Error?cause.message:'Chargement impossible.');}
    finally {if(version===requestVersion.current)setLoading(false);}
  },[login]);
  useEffect(()=>{void load();return()=>{requestVersion.current++;};},[load,revision,refreshVersion]);
  const account=data?.account;
  function confirm(kind:AccountStatus){setOperationError('');setAction({kind,revision:account.revision});}
  async function apply() {
    if(lock.current || !action)return;lock.current=true;setBusy(true);setOperationError('');
    try {
      const result=await api<AccountAccessDetails>(accountPath(login)+'/status','PUT',{revision:action.revision,status:action.kind});
      setData(result);setAction(null);
      notify(action.kind==='suspended'?'Le compte a été bloqué et ses sessions révoquées. Le statut de l’entreprise reste inchangé.':'Le compte a été débloqué. Les autres conditions d’accès restent applicables.');
    } catch(cause){setOperationError(cause instanceof TypeError?networkMessage:cause instanceof Error?cause.message:'Opération impossible.');}
    finally {lock.current=false;setBusy(false);}
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3"><a className="bo-button-secondary" href={adminLink('comptes')}>Retour aux comptes</a></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {loading && <p role="status" className="flex gap-2 text-sm text-slate-600"><LoaderCircle className="animate-spin" size={16}/>Chargement du compte…</p>}
    {account && <>
      <Panel title="Informations du compte"><dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
        <Info label="Identifiant du compte">{account.login}</Info><Info label="Type de compte">{account.role==='admin'?'Administrateur plateforme':'Entreprise'}</Info>
        <Info label="Entreprise associée">{account.companyName??'Plateforme'}</Info><Info label="Adresse e-mail"><span className="break-all">{account.email??'À renseigner'}</span></Info>
        <Info label="Vérification"><Verification account={account}/></Info>
        {account.pendingEmail && <Info label="Nouvelle adresse en attente"><span className="break-all">{account.pendingEmail}</span><span className="mt-1 block text-xs text-slate-500">L’adresse actuelle reste utilisable jusqu’à confirmation.</span></Info>}
      </dl><div className="border-t border-slate-100 px-5 py-4 text-sm">{account.companyId?
        <a className={linkClass} href={detailLink(account.companyId)}>Gérer l’adresse e-mail sur la fiche entreprise</a>:
        <a className={linkClass} href={adminLink('parametres')}>Gérer mon compte</a>}</div></Panel>
      <Panel title="Gestion de l’accès" action={<ShieldCheck size={18} className="text-blue-700"/>}>
        <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3"><Info label="Statut du compte"><Status account={account}/></Info>
          {account.companyId && <Info label="Statut de l’entreprise">{account.companyStatus==='active'?'Active':account.companyStatus==='disabled'?'Désactivée':'Introuvable'}</Info>}
          <Info label="Accès effectif"><Access account={account}/></Info>
          {account.lastLoginAt && Number.isFinite(Date.parse(account.lastLoginAt)) && <Info label="Dernière connexion réussie">{formatDate(account.lastLoginAt)}</Info>}
        </dl><div className="space-y-3 border-t border-slate-100 p-5 sm:p-6">
          {account.role==='company'?<><p className="text-sm text-slate-600">Le blocage concerne uniquement ce compte et ses sessions. Le statut de l’entreprise et ses synchronisations automatiques restent inchangés. Débloquer le compte ne réactive pas une entreprise désactivée.</p>
            <div className="flex flex-wrap gap-3"><button className="bo-button-secondary" disabled={loading||busy} onClick={()=>confirm(account.status==='suspended'?'active':'suspended')}>
              {account.status==='suspended'?'Débloquer le compte':'Bloquer le compte'}</button></div></>:
            <p className="text-sm text-slate-600">Le compte administrateur plateforme ne peut pas être bloqué depuis cette interface.</p>}
        </div></Panel>
      <Panel title="Historique de sécurité"><p className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500">Les {accountHistoryLimit} derniers événements du compte. Les opérations de gestion de l’entreprise restent séparées.</p>
        {data.history.length?<ol className="divide-y divide-slate-100">{data.history.map(event=><li key={event.id} className="flex flex-wrap justify-between gap-2 px-5 py-4 text-sm">
          <div><p className="font-medium text-slate-800">{eventLabels[event.action]??'Événement de sécurité'}</p>
            <p className="mt-1 text-xs text-slate-500">Auteur : {event.actor==='unauthenticated'?'Tentative non authentifiée':event.actor}</p>
            {event.reason && <p className="mt-1 text-xs text-slate-600">{event.reason==='incorrect_credentials'?'Identifiants incorrects':reasonLabels[event.reason as AccountBlockReason]??'Accès refusé'}</p>}</div>
          <time className="text-xs text-slate-500" dateTime={event.at}>{formatDate(event.at)}</time></li>)}</ol>:
          <p className="p-6 text-sm text-slate-600">Aucun événement de sécurité enregistré pour ce compte.</p>}</Panel>
    </>}
    {action && account && <SalesDialog title={action.kind==='suspended'?'Bloquer le compte':'Débloquer le compte'} subtitle={account.login} onClose={()=>{if(!busy)setAction(null);}}>
      <p className="text-sm leading-relaxed text-slate-600">{action.kind==='suspended'?
        'Ce compte ne pourra plus se connecter ni utiliser ses sessions ou les API protégées. Le statut de l’entreprise, ses données et ses synchronisations automatiques restent inchangés.':
        'Le blocage de ce compte sera levé. Une nouvelle connexion sera nécessaire. Une entreprise désactivée, une activation en attente ou une adresse non vérifiée continuera à empêcher l’accès.'}</p>
      {operationError && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">{operationError}</p>}
      <div className="mt-5 flex flex-wrap gap-3"><button className="bo-button-secondary" disabled={busy} onClick={()=>setAction(null)}>Annuler</button>
        <button className="bo-button-primary" disabled={busy} onClick={()=>void apply()}>{busy?'En cours…':action.kind==='suspended'?'Confirmer le blocage':'Confirmer le déblocage'}</button></div>
    </SalesDialog>}
  </div>;
}
