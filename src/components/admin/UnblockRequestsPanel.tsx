import {useRef,useState} from 'react';
import {api,networkMessage} from '../../context/companyApi';
import {useAutoRefresh,mayApplyRefresh} from '../../hooks/useAutoRefresh';
import type {UnblockRequest,UnblockDecision} from '../../types/administration';
import {DataList,formatDate} from './AdminUI';
import {SalesDialog,SalesPill} from '../backoffice/SalesUI';
import {useDemoMode} from '../../context/DemoContext';

const labels={pending:'En attente',accepted:'Acceptée',rejected:'Refusée'} as const;
export function UnblockRequestsPanel({notify}:{notify(message:string):void}) {
  const demo=useDemoMode();
  const [requests,setRequests]=useState<UnblockRequest[]>([]),[error,setError]=useState('');
  const [decision,setDecision]=useState<{request:UnblockRequest;kind:UnblockDecision}|null>(null);
  const [busy,setBusy]=useState(false),[decisionError,setDecisionError]=useState('');const lock=useRef(false);
  useAutoRefresh('/admin/unblock-requests',async signal=>{
    const data=await api<UnblockRequest[]>('/admin/unblock-requests','GET',undefined,signal);
    if(mayApplyRefresh(signal)){setRequests(previous=>JSON.stringify(previous)===JSON.stringify(data)?previous:data);setError('');}
  },{onError:cause=>setError(cause instanceof TypeError?networkMessage:cause instanceof Error?cause.message:'Chargement des demandes impossible.')});
  const pending=requests.filter(request=>request.status==='pending').length;
  async function decide() {
    if(!decision||lock.current)return;lock.current=true;setBusy(true);setDecisionError('');
    try {
      const result=await api<UnblockRequest>('/admin/unblock-requests/'+encodeURIComponent(decision.request.id),'PUT',{
        decision:decision.kind,revision:decision.request.accountRevision});
      setRequests(previous=>previous.map(request=>request.id===result.id?result:request));setDecision(null);
      notify('Demande '+(result.status==='accepted'?'acceptée.':'refusée.')+(result.notificationStatus==='sent'?(demo?' Notification simulée disponible dans la boîte de réception Démo.':' Notification envoyée.'):' Notification en attente d’envoi ; une nouvelle tentative est prévue automatiquement.'));
    } catch(cause){setDecisionError(cause instanceof TypeError?networkMessage:cause instanceof Error?cause.message:'Décision impossible.');}
    finally {lock.current=false;setBusy(false);}
  }
  return <div className="space-y-3">
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <DataList<UnblockRequest> title="Demandes de déblocage" action={<SalesPill tone={pending?'orange':'neutral'}>{pending} en attente</SalesPill>}
      items={requests} responsive keyOf={request=>request.id} searchText={request=>[request.login,request.companyName,request.email].join(' ')}
      searchLabel="Rechercher une demande de déblocage" headings={['Compte','Entreprise','Adresse e-mail','Date de la demande','Statut','Actions']} empty="Aucune demande de déblocage."
      cells={request=>[<span className="break-all font-medium">{request.login}</span>,request.companyName,<span className="break-all">{request.email}</span>,formatDate(request.createdAt),
        <div><SalesPill tone={request.status==='pending'?'orange':request.status==='accepted'?'green':'neutral'}>{labels[request.status]}</SalesPill>
          {request.decidedAt&&<span className="mt-1 block text-xs text-slate-500">{formatDate(request.decidedAt)} · {request.decidedBy}</span>}
          {request.status==='pending'&&!request.identityCurrent&&<span className="mt-1 block text-xs text-amber-800">Identité à revérifier : refuser cette demande avant une nouvelle confirmation.</span>}
          {request.notificationStatus&&<span className="mt-1 block text-xs text-slate-500">Notification : {request.notificationStatus==='sent'?'envoyée':request.notificationStatus==='error'?'envoi différé':'en attente'}</span>}</div>,
        request.status==='pending'?<div className="flex flex-wrap gap-2">{(['accepted','rejected'] as const).map(kind=><button key={kind} className="bo-button-secondary disabled:cursor-not-allowed disabled:opacity-50" disabled={busy||kind==='accepted'&&!request.identityCurrent}
          onClick={()=>{setDecisionError('');setDecision({request,kind});}}>{kind==='accepted'?'Accepter':'Refuser'}</button>)}</div>:<span className="text-xs text-slate-500">Traitée</span>]}/>
    {decision&&<SalesDialog title={decision.kind==='accepted'?'Accepter la demande':'Refuser la demande'} subtitle={decision.request.companyName+' · '+decision.request.login} onClose={()=>{if(!busy)setDecision(null);}}>
      <p className="text-sm leading-relaxed text-slate-600">{decision.kind==='accepted'
        ? 'Après vérification de l’identité, le compte sera débloqué et ses anciennes sessions resteront invalides. Une entreprise désactivée ne sera pas réactivée. L’utilisateur recevra une notification.'
        : 'La demande sera refusée. Cette action ne débloque pas le compte et ne modifie pas l’entreprise. L’utilisateur recevra une notification.'}</p>
      {decisionError&&<p role="alert" className="mt-4 text-sm text-red-800">{decisionError}</p>}
      <div className="mt-5 flex flex-wrap gap-3"><button className="bo-button-secondary" disabled={busy} onClick={()=>setDecision(null)}>Annuler</button>
        <button className="bo-button-primary" disabled={busy} onClick={()=>void decide()}>{busy?'Enregistrement…':decision.kind==='accepted'?'Confirmer l’acceptation':'Confirmer le refus'}</button></div>
    </SalesDialog>}
  </div>;
}
