import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {Mail,RotateCcw,Inbox,X} from 'lucide-react';
import {useAutoRefresh,mayApplyRefresh} from '../hooks/useAutoRefresh';
import {api,networkMessage} from '../context/companyApi';
import {DemoContext} from '../context/DemoContext';
import {SalesDialog} from './backoffice/SalesUI';

type Message={id:string;recipient:string;subject:string;purpose:'verify'|'activate'|'reset'|'unblock'|'notice';body?:string;createdAt:number;expiresAt:number;state:'valid'|'expired'|'used'|'information';link:string|null};
const description=(cause:unknown)=>cause instanceof TypeError?networkMessage:cause instanceof Error?cause.message:'Opération indisponible.';

export function DemoFrame({children}:{children:ReactNode}) {
  const [enabled,setEnabled]=useState<boolean|null>(null),[inbox,setInbox]=useState(false),[reset,setReset]=useState(false);
  const bar=useRef<HTMLDivElement>(null),[height,setHeight]=useState(48);
  useEffect(()=>{let active=true;api<{enabled:boolean}>('/demo/status').then(data=>{if(active)setEnabled(data.enabled===true);}).catch(()=>{if(active)setEnabled(false);});return()=>{active=false;};},[]);
  useEffect(()=>{
    if(!enabled || !bar.current)return;
    const observer=new ResizeObserver(()=>{if(bar.current)setHeight(bar.current.offsetHeight);});observer.observe(bar.current);return()=>observer.disconnect();
  },[enabled]);
  if(enabled===null)return <p role="status" className="p-6 text-sm text-slate-600">Ouverture de la plateforme…</p>;
  if(!enabled)return <>{children}</>;
  return <DemoContext.Provider value={true}><div className="demo-frame" style={{'--demo-bar-height':height+'px'} as CSSProperties}>
    <style>{'.demo-frame .min-h-dvh{min-height:calc(100dvh - var(--demo-bar-height))}.demo-frame .h-screen{height:calc(100dvh - var(--demo-bar-height))}'}</style>
    <div ref={bar} className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-950 sm:px-6">
      <p><span className="mr-2 rounded bg-[#0057A8] px-2 py-1 font-semibold text-white">DÉMO</span>Simulation — Aucun e-mail réel envoyé</p>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setInbox(true)} className="bo-button-secondary min-h-8 text-xs"><Mail size={14}/>Boîte de réception — Démo</button>
        <button type="button" onClick={()=>setReset(true)} className="bo-button-secondary min-h-8 text-xs"><RotateCcw size={14}/>Réinitialiser la démo</button></div>
    </div>
    {children}
    {inbox && <div className="relative z-[200]"><DemoInbox close={()=>setInbox(false)}/></div>}
    {reset && <div className="relative z-[200]"><DemoReset close={()=>setReset(false)}/></div>}
  </div></DemoContext.Provider>;
}

function DemoInbox({close}:{close():void}) {
  const [messages,setMessages]=useState<Message[]>([]),[selected,setSelected]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const refresh=useAutoRefresh('/demo/messages',async signal=>{
    const data=await api<Message[]>('/demo/messages','GET',undefined,signal);
    if(mayApplyRefresh(signal)){setMessages(previous=>JSON.stringify(previous)===JSON.stringify(data)?previous:data);setSelected(id=>data.some(message=>message.id===id)?id:data[0]?.id??'');setError('');setLoading(false);}
  },{interval:5000,onError:cause=>{setError(description(cause));setLoading(false);}});
  const message=messages.find(item=>item.id===selected);
  async function expire(id:string) {try {await api('/demo/messages/'+id+'/expire','POST');await refresh();}catch(cause){setError(description(cause));}}
  return <SalesDialog title="Boîte de réception — Démo" subtitle="Simulation — Aucun e-mail réel envoyé" closeIcon={<X size={18}/>} onClose={close}>
    <div className="mb-4 text-sm text-slate-600"><span>{messages.length} message(s) simulé(s)</span></div>
    {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {messages.length ? <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
      <ul className="max-h-72 space-y-2 overflow-y-auto md:max-h-[390px]">{messages.map(item=><li key={item.id}><button type="button" onClick={()=>setSelected(item.id)}
        aria-pressed={selected===item.id} className={'w-full rounded-lg border p-3 text-left text-sm '+(selected===item.id?'border-blue-300 bg-blue-50':'border-slate-200 hover:bg-slate-50')}>
        <span className="block font-semibold text-[#142f49]">{item.subject}</span><span className="mt-1 block break-all text-xs text-slate-600">{item.recipient}</span>
      </button></li>)}</ul>
      {message && <article className="min-w-0 rounded-lg border border-slate-200 p-4 sm:p-5">
        <span className={'rounded-full px-2 py-1 text-xs '+(message.state==='valid'?'bg-emerald-50 text-emerald-800':'bg-slate-100 text-slate-600')}>{message.state==='information'?'Notification':message.state==='valid'?'Lien valide':message.state==='expired'?'Lien expiré':'Lien utilisé ou remplacé'}</span>
        <h3 className="mt-4 text-lg font-semibold text-[#142f49]">{message.subject}</h3>
        <p className="mt-2 break-all text-sm text-slate-600">À : {message.recipient}</p><p className="mt-1 text-xs text-slate-500">{new Date(message.createdAt).toLocaleString('fr-FR')}</p>
        <p className="mt-5 text-sm leading-relaxed text-slate-700">{message.purpose==='notice'?message.body:message.purpose==='unblock'?'Confirmez votre demande pour la transmettre à l’administrateur. Votre compte reste bloqué jusqu’à sa décision.':message.purpose==='verify'?'Confirmez votre adresse pour activer votre compte.':message.purpose==='activate'?'Vous êtes invité à activer votre espace entreprise. Définissez votre mot de passe pour confirmer votre adresse.':'Définissez un nouveau mot de passe pour récupérer votre compte.'}</p>
        {message.purpose!=='notice'&&<p className="mt-3 text-xs text-slate-600">Lien personnel valable 15 minutes et utilisable une seule fois.</p>}
        {message.link ? <div className="mt-5 space-y-3"><a href={message.link} onClick={close} className="bo-button-primary w-full">Ouvrir le lien simulé</a>
          <button type="button" className="block w-full text-xs text-slate-500 underline" onClick={()=>void expire(message.id)}>Faire expirer ce lien</button></div> :
          message.purpose!=='notice'&&<p className="mt-5 rounded bg-slate-50 p-3 text-sm text-slate-600">Demandez un nouveau message pour poursuivre.</p>}
      </article>}
    </div> : <div className="py-12 text-center text-sm text-slate-600"><Inbox className="mx-auto mb-3 text-blue-300" size={36}/>
      {loading?'Chargement des messages…':'Aucun message pour le moment. Créez un compte ou demandez un lien de récupération.'}</div>}
  </SalesDialog>;
}

function DemoReset({close}:{close():void}) {
  const [confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const pending=useRef(false);
  return <SalesDialog title="Recommencer la démonstration" subtitle="Seules les données du mode démo seront effacées." closeIcon={<X size={18}/>} onClose={()=>{if(!busy)close();}}>
    <form className="space-y-4 text-sm" onSubmit={async event=>{
      event.preventDefault();if(pending.current)return;pending.current=true;setBusy(true);setError('');
      try {await api('/demo/reset','POST',{confirmation});sessionStorage.removeItem('tms.access');sessionStorage.removeItem('tms.company');window.location.assign(location.pathname+location.search);}
      catch(cause){setError(description(cause));pending.current=false;setBusy(false);}
    }}>
      <p className="leading-relaxed text-slate-700">Les comptes, entreprises, dossiers, livraisons, tournées et messages créés dans cette démonstration seront supprimés. Les autres bases seront conservées.</p>
      <div><label htmlFor="demo-reset-confirmation" className="font-semibold text-slate-700">Saisissez REINITIALISER LA DEMO</label>
        <input id="demo-reset-confirmation" value={confirmation} onChange={event=>setConfirmation(event.target.value)} required readOnly={busy} autoComplete="off" className="bo-input mt-2 h-11 w-full"/></div>
      {error && <p role="alert" className="text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-3"><button type="button" className="bo-button-secondary" disabled={busy} onClick={close}>Annuler</button>
        <button className="bo-button-secondary border-red-200 text-red-700" disabled={busy || confirmation!=='REINITIALISER LA DEMO'}>{busy?'Réinitialisation…':'Confirmer la réinitialisation'}</button></div>
    </form>
  </SalesDialog>;
}
