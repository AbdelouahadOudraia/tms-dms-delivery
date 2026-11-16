import {useRef,useState,type FormEvent} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {api,networkMessage} from '../context/companyApi';
import {useDemoMode,deliveryNotice} from '../context/DemoContext';
import {PlatformBrand} from './PlatformBrand';

export function EmailEnrollment({email,logout}:{email:string|null;logout():void}) {
  const demo=useDemoMode();
  const [address,setAddress]=useState(email??''),[visible,setVisible]=useState(false);
  const [busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
  const pending=useRef(false),changed=address.trim()!==(email??'');
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(pending.current)return;
    const data=new FormData(event.currentTarget);
    pending.current=true;setBusy(true);setError('');
    try {
      if(changed || !email) await api('/own-email','PUT',{email:address.trim(),currentPassword:data.get('currentPassword')});
      else await api('/own-email/verification','POST');
      setSent(true);
    } catch(cause){setError(cause instanceof TypeError?networkMessage:cause instanceof Error?cause.message:'Envoi indisponible.');}
    finally {pending.current=false;setBusy(false);}
  }
  return <main className="flex min-h-dvh flex-col items-center bg-[#f4f7fb] px-4 py-6 text-slate-900">
    <section className="bo-panel my-auto w-full max-w-[460px] overflow-hidden rounded-2xl border-slate-200 shadow-lg"><PlatformBrand/>
      <div className="space-y-5 p-6 sm:p-9"><h1 className="text-2xl font-semibold text-[#142f49]">Vérifier votre adresse e-mail</h1>
        <p className="text-sm leading-relaxed text-slate-600">Votre compte et vos données sont conservés. Une adresse e-mail vérifiée est nécessaire pour accéder à votre espace et récupérer votre mot de passe.</p>
        {sent ? <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{deliveryNotice(demo)} Confirmez le lien reçu sous 15 minutes, puis reconnectez-vous.</p> :
        <form className="space-y-4 text-sm" aria-busy={busy} onSubmit={submit}>
          <div><label htmlFor="enrollment-email" className="block font-semibold text-slate-700">Adresse e-mail</label>
            <input id="enrollment-email" name="email" type="email" required maxLength={254} autoComplete="email" value={address} readOnly={busy}
              onChange={event=>setAddress(event.target.value)} placeholder="vous@entreprise.fr" className="bo-input mt-2 h-12 w-full"/>
          </div>
          {(changed || !email) && <div><label htmlFor="enrollment-password" className="block font-semibold text-slate-700">Mot de passe actuel</label>
            <div className="relative mt-2"><input id="enrollment-password" name="currentPassword" required type={visible?'text':'password'} autoComplete="current-password" maxLength={200} readOnly={busy} className="bo-input h-12 w-full pr-12"/>
              <button type="button" aria-label={visible?'Masquer le mot de passe':'Afficher le mot de passe'} aria-pressed={visible} onClick={()=>setVisible(!visible)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-600">{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button>
            </div></div>}
          {error && <p role="alert" className="text-red-800">{error}</p>}
          <button disabled={busy} className="bo-button-primary h-12 w-full">{busy?'Envoi en cours…':'Envoyer le lien de vérification'}</button>
        </form>}
        {sent && <button type="button" className="bo-button-secondary w-full" onClick={()=>{setSent(false);setError('');}}>Renvoyer un lien</button>}
        <button type="button" disabled={busy} onClick={logout} className="block w-full text-center text-sm font-medium text-[#0057A8]">Retour à la connexion</button>
      </div>
    </section>
  </main>;
}
