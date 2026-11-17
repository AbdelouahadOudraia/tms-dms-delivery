import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from 'lucide-react';
import { api, networkMessage } from '../context/companyApi';
import {useDemoMode} from '../context/DemoContext';
import { PlatformBrand } from './PlatformBrand';
import {loginErrorMessages,unblockRequestConfirmation} from '../types/authentication';

type LoginProps = {
  busy: boolean;
  error: string;
  clearError(): void;
  onLogin(login: string, password: string): Promise<void>;
};

const inputClass = 'bo-input h-12 w-full rounded-lg border-[#8291a5] pl-11 text-base placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057A8] aria-invalid:border-red-700';
const inputIcon = 'pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-500';

export function PlatformLogin({ busy, error, clearError, onLogin }: LoginProps) {
  const demo=useDemoMode();
  const [visible, setVisible] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [loginHint, setLoginHint] = useState('');
  const [notice, setNotice] = useState('');
  const [missing, setMissing] = useState({ login: false, password: false });
  const [emailError,setEmailError]=useState('');
  const loginInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [unblockBusy,setUnblockBusy]=useState(false),[unblockMessage,setUnblockMessage]=useState(''),[unblockError,setUnblockError]=useState('');
  const unblockLock=useRef(false);
  async function requestUnblock() {
    if(busy||unblockLock.current)return;
    unblockLock.current=true;setUnblockBusy(true);setUnblockError('');
    try {
      const result=await api<{state:'pending'|'verification_required'}>('/account-unblock/request','POST',{
        login:loginInput.current?.value.trim(),password:passwordInput.current?.value});
      setUnblockMessage(result.state==='pending'?unblockRequestConfirmation:demo?'Un lien de confirmation simulé est disponible dans la boîte de réception Démo. Confirmez ce lien pour transmettre votre demande à l’administrateur.':'Un lien de confirmation a été envoyé à votre adresse e-mail vérifiée. Confirmez ce lien pour transmettre votre demande à l’administrateur.');
    } catch(cause){setUnblockError(cause instanceof TypeError?networkMessage:cause instanceof Error?cause.message:'Demande impossible.');}
    finally {unblockLock.current=false;setUnblockBusy(false);}
  }

  function showRecovery() {
    clearError();
    setNotice('');
    setVisible(false);
    setMissing({ login: false, password: false });
    setEmailError('');
    setLoginHint(loginInput.current?.value.trim() ?? '');
    setRecovery(true);
  }
  function returnToLogin(resetLogin?: string) {
    if (resetLogin) {
      setLoginHint(resetLogin);
      setNotice('Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.');
    }
    setRecovery(false);
    requestAnimationFrame(() => loginInput.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || unblockBusy || submitting.current) return;
    setNotice('');
    const login = loginInput.current!.value.trim();
    const password = passwordInput.current!.value;
    const emailError=!login?'Saisissez votre adresse e-mail.':/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)?'':'Saisissez une adresse e-mail valide.';
    setEmailError(emailError);
    setMissing({ login: Boolean(emailError), password: !password });
    if (emailError || !password) {
      clearError();
      (emailError ? loginInput : passwordInput).current?.focus();
      return;
    }
    submitting.current = true;
    try {
      await onLogin(login, password);
    } finally {
      submitting.current = false;
    }
  }

  return (
    <main className={`${recovery ? 'flex min-h-dvh flex-col items-center py-4 sm:py-6' : 'grid min-h-dvh place-items-center py-8'} bg-[radial-gradient(ellipse_at_top,#e5eff9,transparent_65%)] bg-[#f4f7fb] px-4 text-slate-900`}>
      <section aria-labelledby="platform-login-title" className={`bo-panel ${recovery ? 'my-auto shrink-0' : ''} w-full max-w-[460px] overflow-hidden rounded-2xl border-slate-200 shadow-[0_12px_42px_-16px_rgba(21,50,82,0.23)]`}>
        <PlatformBrand/>
        <div className={recovery ? 'px-5 py-5 sm:px-9 sm:py-7' : 'px-6 py-7 sm:px-9 sm:py-9'}>
          <h1 id="platform-login-title" className="text-[clamp(1.5rem,4vw,1.8rem)] leading-tight font-semibold tracking-tight text-[#142f49]">{recovery ? 'Réinitialiser le mot de passe' : 'Bienvenue sur TMS/DMS'}</h1>
          {!recovery && <p className="mt-2 text-sm leading-relaxed text-slate-600">Plateforme de gestion du transport et des livraisons</p>}

          {recovery ? <PasswordRecovery loginHint={loginHint} onBack={returnToLogin}/> : <>
          <form noValidate aria-busy={busy||unblockBusy} onSubmit={submit} onChange={()=>{if(error)clearError();setUnblockMessage('');setUnblockError('');}} className="mt-7 space-y-5">
            {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-3 text-sm text-green-800">{notice}</p>}
            {error && <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0"/><span>{error}</span>
            </div>}
            {error===loginErrorMessages.accountSuspended && <div className="space-y-3">
              {unblockMessage?<p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-[#17446a]">{unblockMessage}</p>:
                <button type="button" onClick={()=>void requestUnblock()} disabled={busy||unblockBusy} className="bo-button-secondary h-auto min-h-11 w-full px-3 py-2 text-center">{unblockBusy?'Envoi en cours…':'Demander le déblocage de mon compte'}</button>}
              {unblockError&&<p role="alert" className="text-sm text-red-800">{unblockError}</p>}
            </div>}
            <div>
              <label htmlFor="platform-login-id" className="block text-sm font-semibold text-slate-700">Adresse e-mail</label>
              <div className="relative mt-2">
                <UserRound aria-hidden="true" className={inputIcon}/>
                <input ref={loginInput} id="platform-login-id" name="login" type="email" maxLength={254} defaultValue={loginHint} autoComplete="username" autoCapitalize="none" spellCheck={false}
                  required readOnly={busy||unblockBusy} placeholder="Saisissez votre adresse e-mail" aria-invalid={missing.login}
                  aria-describedby={missing.login ? 'platform-id-error' : undefined} className={inputClass}
                  onChange={() => {setEmailError('');setMissing(prev=>({...prev,login:false}));}}/>
              </div>
              {missing.login && <p id="platform-id-error" className="mt-1.5 text-sm text-red-700">{emailError}</p>}
            </div>
            <div>
              <label htmlFor="platform-login-password" className="block text-sm font-semibold text-slate-700">Mot de passe</label>
              <div className="relative mt-2">
                <LockKeyhole aria-hidden="true" className={inputIcon}/>
                <input ref={passwordInput} id="platform-login-password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password"
                  required readOnly={busy||unblockBusy} placeholder="Votre mot de passe" aria-invalid={missing.password}
                  aria-describedby={missing.password ? 'platform-password-error' : undefined} className={inputClass + ' pr-12'}
                  onChange={e => { if (missing.password && e.target.value) setMissing(prev => ({ ...prev, password: false })); }}/>
                <button type="button" aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-controls="platform-login-password"
                  onClick={() => setVisible(!visible)} className="absolute inset-y-1 right-1 grid w-10 place-items-center rounded-md text-slate-600 hover:bg-slate-100 focus-visible:outline-2">
                  {visible ? <EyeOff aria-hidden="true" size={18}/> : <Eye aria-hidden="true" size={18}/>}
                </button>
              </div>
              {missing.password && <p id="platform-password-error" className="mt-1.5 text-sm text-red-700">Saisissez votre mot de passe.</p>}
              <div className="mt-2 text-right"><button type="button" disabled={busy} onClick={showRecovery}
                className="rounded text-sm font-medium text-[#0057A8] underline-offset-4 hover:underline">Mot de passe oublié ?</button></div>
            </div>
            <button type="submit" disabled={busy||unblockBusy} className="bo-button-primary mt-1 h-12 w-full rounded-lg text-base font-semibold disabled:opacity-80">
              {busy && <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin"/>}
              {busy ? 'Connexion en cours…' : 'Se connecter'}
              {!busy && <ArrowRight aria-hidden="true" size={17}/>}
            </button>
          </form>
          <span role="status" className="sr-only">{busy ? 'Connexion en cours.' : ''}</span>
          </>}
        </div>
      </section>
    </main>
  );
}

const recoveryInputClass = 'bo-input h-11 w-full rounded-lg border-[#8291a5] text-base focus-visible:outline-2 focus-visible:outline-offset-2 aria-invalid:border-red-700';


function PasswordRecovery({loginHint,onBack}: {loginHint:string; onBack(login?:string):void}) {
  const demo=useDemoMode();
  const [email,setEmail]=useState(loginHint.includes('@') ? loginHint : '');
  const [requested,setRequested]=useState(false);
  const [busy,setBusy]=useState(false), [error,setError]=useState('');
  const pending=useRef(false);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {setError('Saisissez une adresse e-mail valide.');return;}
    pending.current=true;setBusy(true);setError('');
    try {await api('/company-email/request','POST',{email:email.trim()});setRequested(true);}
    catch(cause){setError(cause instanceof TypeError ? networkMessage : cause instanceof Error ? cause.message : 'Demande indisponible.');}
    finally {pending.current=false;setBusy(false);}
  }
  return <form onSubmit={submit} aria-busy={busy} className="mt-5 space-y-4 text-sm">
    <p className="leading-relaxed text-slate-600">Saisissez l’adresse e-mail vérifiée associée à votre compte.</p>
    <div><label htmlFor="recovery-email" className="block font-semibold text-slate-700">Adresse e-mail</label>
      <input id="recovery-email" name="email" type="email" required maxLength={254} autoComplete="email" autoFocus
        value={email} readOnly={busy} onChange={event=>{setEmail(event.target.value);setError('');setRequested(false);}}
        placeholder="vous@entreprise.fr" className={recoveryInputClass+' mt-1.5'}/>
    </div>
    {requested && <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 leading-relaxed text-slate-700">
      {demo?'Si cette adresse correspond à un compte éligible et vérifié, un message simulé est disponible dans la boîte de réception démo.':'Si cette adresse correspond à un compte éligible et vérifié, un lien personnel vous parviendra. Consultez votre messagerie et les courriers indésirables. En l’absence de message, contactez le responsable de la plateforme.'}
    </p>}
    {error && <p role="alert" className="text-red-800">{error}</p>}
    <button disabled={busy || requested} className="bo-button-primary h-11 w-full">{busy ? 'Demande en cours…' : 'Envoyer le lien de récupération'}</button>
    <button type="button" disabled={busy} onClick={()=>onBack()} className="block w-full text-center font-medium text-[#0057A8]">Retour à la connexion</button>
  </form>;
}

export function RecoveryPassword({ name, label, busy, error }: {
  name: 'password' | 'confirmation'; label: string; busy: boolean; error?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = 'recovery-' + name;
  const hint = name === 'password' ? 'recovery-length' : '';
  const description = [hint, error ? id + '-error' : ''].filter(Boolean).join(' ') || undefined;
  return <div>
    <label htmlFor={id} className="block font-semibold text-slate-700">{label}</label>
    <div className="relative mt-1.5">
      <input id={id} name={name} type={visible ? 'text' : 'password'} required minLength={10} maxLength={200}
        autoComplete="new-password" readOnly={busy} aria-invalid={Boolean(error)} aria-describedby={description} className={recoveryInputClass + ' pr-12'}/>
      <button type="button" aria-label={`${visible ? 'Masquer' : 'Afficher'} ${name === 'password' ? 'le nouveau mot de passe' : 'la confirmation du mot de passe'}`} aria-controls={id}
        onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-100">
        {visible ? <EyeOff aria-hidden="true" size={18}/> : <Eye aria-hidden="true" size={18}/>}
      </button>
    </div>
    {name === 'password' && <p id="recovery-length" className="mt-1.5 text-xs text-slate-600">De 10 à 200 caractères.</p>}
    {error && <p id={id + '-error'} className="mt-1.5 text-sm text-red-700">{error}</p>}
  </div>;
}
