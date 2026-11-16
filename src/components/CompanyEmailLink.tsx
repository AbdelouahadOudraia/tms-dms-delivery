import {useEffect, useRef, useState, type FormEvent, type ReactNode} from 'react';
import {api, networkMessage} from '../context/companyApi';
import {RecoveryPassword} from './PlatformLogin';
import {PlatformBrand} from './PlatformBrand';

function currentLink() {
  const match = /^#company-email\/(verify|reset|activate)\/(.*)$/.exec(window.location.hash);
  return match ? {purpose:match[1], token:match[2]} : null;
}

export function CompanyEmailLink({children}: {children:ReactNode}) {
  const [link,setLink] = useState(currentLink);
  useEffect(()=>{
    const clearFragment = () => history.replaceState(history.state,'',location.pathname+location.search);
    if (currentLink()) clearFragment();
    const changed = () => {
      const next = currentLink();
      setLink(next);
      if (next) clearFragment();
    };
    window.addEventListener('hashchange',changed);
    return ()=>window.removeEventListener('hashchange',changed);
  },[]);
  if (!link) return <>{children}</>;
  return <main className="flex min-h-dvh flex-col items-center bg-[#f4f7fb] px-4 py-6 text-slate-900">
    <section key={link.purpose+link.token} className="bo-panel my-auto w-full max-w-[460px] overflow-hidden rounded-2xl border-slate-200 shadow-lg">
      <PlatformBrand/><LinkForm link={link} close={()=>setLink(null)}/>
    </section>
  </main>;
}

function LinkForm({link,close}: {link:NonNullable<ReturnType<typeof currentLink>>; close():void}) {
  const verify = link.purpose==='verify';
  const [busy,setBusy] = useState(false), [done,setDone] = useState(false), [error,setError] = useState('');
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const data = new FormData(event.currentTarget);
    if (!verify && data.get('password') !== data.get('confirmation')) {
      setError('Les deux mots de passe doivent être identiques.');
      return;
    }
    pending.current=true; setBusy(true); setError('');
    try {
      await api('/company-email/'+link.purpose,'POST',verify ? {token:link.token} : {token:link.token,password:data.get('password')});
      if (!verify) {
        sessionStorage.removeItem('tms.access');sessionStorage.removeItem('tms.company');
      }
      setDone(true);
    } catch (cause) {
      setError(cause instanceof TypeError ? networkMessage : cause instanceof Error ? cause.message : 'Action indisponible.');
    } finally {pending.current=false; setBusy(false);}
  }
  return <div className="space-y-5 p-6 sm:p-9">
    <h1 className="text-2xl font-semibold text-[#142f49]">{verify ? 'Vérifier votre adresse e-mail' : link.purpose==='activate' ? 'Activer votre accès entreprise' : 'Réinitialiser le mot de passe'}</h1>
    {done ? <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
      {verify ? 'Votre adresse e-mail est vérifiée. Vous pouvez vous connecter.' : link.purpose==='activate' ? 'Votre accès est activé. Connectez-vous avec votre adresse e-mail et le mot de passe choisi.' : 'Mot de passe réinitialisé. Reconnectez-vous avec votre nouveau mot de passe.'}
    </p> : <form onSubmit={submit} aria-busy={busy} className="space-y-4 text-sm">
      {verify ? <p>Confirmez votre adresse pour sécuriser votre compte TMS/DMS.</p> : <>
        <RecoveryPassword name="password" label="Nouveau mot de passe" busy={busy}/>
        <RecoveryPassword name="confirmation" label="Confirmer le mot de passe" busy={busy}/>
      </>}
      {error && <p role="alert" className="text-red-800">{error}</p>}
      <button disabled={busy} className="bo-button-primary h-11 w-full">{busy ? 'En cours…' : verify ? 'Vérifier mon adresse' : link.purpose==='activate' ? 'Activer mon accès' : 'Réinitialiser le mot de passe'}</button>
    </form>}
    <button type="button" disabled={busy} onClick={()=>{if (done) window.location.assign(window.location.pathname+window.location.search); else close();}} className="bo-button-secondary w-full">Retour à la plateforme</button>
  </div>;
}
