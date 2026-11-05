import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle, LockKeyhole, Truck, UserRound } from 'lucide-react';
import { api, networkMessage } from '../context/companyApi';

type LoginProps = {
  busy: boolean;
  error: string;
  clearError(): void;
  onLogin(login: string, password: string): Promise<void>;
};

const inputClass = 'bo-input h-12 w-full rounded-lg border-[#8291a5] pl-11 text-base placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057A8] aria-invalid:border-red-700';
const inputIcon = 'pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-500';

export function PlatformLogin({ busy, error, clearError, onLogin }: LoginProps) {
  const [visible, setVisible] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [loginHint, setLoginHint] = useState('');
  const [notice, setNotice] = useState('');
  const [missing, setMissing] = useState({ login: false, password: false });
  const loginInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  function showRecovery() {
    clearError();
    setNotice('');
    setVisible(false);
    setMissing({ login: false, password: false });
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
    if (busy || submitting.current) return;
    setNotice('');
    const login = loginInput.current!.value.trim();
    const password = passwordInput.current!.value;
    setMissing({ login: !login, password: !password });
    if (!login || !password) {
      clearError();
      (login ? passwordInput : loginInput).current?.focus();
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
        <div className="relative isolate flex min-h-20 items-center overflow-hidden bg-linear-to-r from-[#07365f] to-[#0057A8] px-6 sm:px-9">
          <svg aria-hidden="true" focusable="false" viewBox="0 0 176 80" className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-auto max-[380px]:w-24" fill="none">
            <g stroke="#fff" strokeOpacity=".13">
              <path d="M17 -5 65 43h56l41 42M45 -8l45 45h40l46 45M89 -8l34 34h53M15 85l33-33h58l64-64M63 85l25-25h45l43-43M118 85l58-58" />
            </g>
            <path d="M56 56h35l24-24h29" stroke="#91ccff" strokeWidth="2" strokeLinejoin="round"/>
            <circle cx="56" cy="56" r="3.5" fill="#0b4b85" stroke="#91ccff" strokeWidth="2"/>
            <circle cx="144" cy="32" r="4" fill="#ffd200"/>
          </svg>
          <div className="flex items-center gap-3 text-white">
            <span className="grid size-9 place-items-center rounded-lg border border-white/25 bg-white/10"><Truck aria-hidden="true" size={21} strokeWidth={1.8}/></span>
            <span className="text-sm font-semibold tracking-wide">TMS / DMS Delivery</span>
          </div>
        </div>
        <div className={recovery ? 'px-5 py-5 sm:px-9 sm:py-7' : 'px-6 py-7 sm:px-9 sm:py-9'}>
          <h1 id="platform-login-title" className="text-[clamp(1.5rem,4vw,1.8rem)] leading-tight font-semibold tracking-tight text-[#142f49]">{recovery ? 'Réinitialiser le mot de passe' : 'Bienvenue sur TMS/DMS'}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{recovery ? 'Saisissez le code remis par l’administrateur habilité.' : 'Plateforme de gestion du transport et des livraisons'}</p>

          {recovery ? <PasswordRecovery loginHint={loginHint} onBack={returnToLogin}/> : <>
          <form noValidate aria-busy={busy} onSubmit={submit} onChange={error ? clearError : undefined} className="mt-7 space-y-5">
            {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-3 text-sm text-green-800">{notice}</p>}
            {error && <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0"/><span>{error}</span>
            </div>}
            <div>
              <label htmlFor="platform-login-id" className="block text-sm font-semibold text-slate-700">Identifiant de connexion</label>
              <div className="relative mt-2">
                <UserRound aria-hidden="true" className={inputIcon}/>
                <input ref={loginInput} id="platform-login-id" name="login" defaultValue={loginHint} autoComplete="username" autoCapitalize="none" spellCheck={false}
                  required readOnly={busy} placeholder="Saisissez votre identifiant" aria-invalid={missing.login}
                  aria-describedby={missing.login ? 'platform-id-error' : undefined} className={inputClass}
                  onChange={e => { if (missing.login && e.target.value.trim()) setMissing(prev => ({ ...prev, login: false })); }}/>
              </div>
              {missing.login && <p id="platform-id-error" className="mt-1.5 text-sm text-red-700">Saisissez votre identifiant de connexion.</p>}
            </div>
            <div>
              <label htmlFor="platform-login-password" className="block text-sm font-semibold text-slate-700">Mot de passe</label>
              <div className="relative mt-2">
                <LockKeyhole aria-hidden="true" className={inputIcon}/>
                <input ref={passwordInput} id="platform-login-password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password"
                  required readOnly={busy} placeholder="Votre mot de passe" aria-invalid={missing.password}
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
            <button type="submit" disabled={busy} className="bo-button-primary mt-1 h-12 w-full rounded-lg text-base font-semibold disabled:opacity-80">
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
type RecoveryField = 'login' | 'code' | 'password' | 'confirmation';

function PasswordRecovery({ loginHint, onBack }: { loginHint: string; onBack(login?: string): void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RecoveryField, string>>>({});
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const login = String(data.get('login')).trim();
    const code = String(data.get('code')).trim();
    const password = String(data.get('password'));
    const errors: Record<RecoveryField, string> = {
      login: login ? '' : 'Saisissez votre identifiant de connexion.',
      code: code ? '' : 'Saisissez le code de récupération.',
      password: password.length >= 10 && password.length <= 200 ? '' : 'Choisissez un mot de passe de 10 à 200 caractères.',
      confirmation: password === data.get('confirmation') ? '' : 'Les deux mots de passe doivent être identiques.',
    };
    setError('');
    setFieldErrors(errors);
    const invalid = Object.entries(errors).find(([, message]) => message);
    if (invalid) {
      (form.elements.namedItem(invalid[0]) as HTMLInputElement).focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await api('/password-recovery', 'POST', { login, code, password });
      onBack(login);
    } catch (cause) {
      setError(cause instanceof TypeError ? networkMessage : cause instanceof Error ? cause.message : 'Une erreur technique est survenue.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return <form noValidate onSubmit={submit} aria-busy={busy} onChange={event => {
    const field = (event.target as HTMLInputElement).name;
    setError('');
    setFieldErrors(previous => ({ ...previous, [field]: undefined }));
  }} className="mt-5 space-y-4 text-sm">
    <details className="rounded-lg bg-slate-50 px-3 py-2.5 text-slate-700">
      <summary className="cursor-pointer font-medium text-[#0057A8]">Comment obtenir un code ?</summary>
      <p className="mt-2">Contactez l’administrateur habilité de votre plateforme. Après vérification de votre identité, il vous remettra un code personnel valable 15 minutes et utilisable une seule fois.</p>
    </details>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-red-800">{error}</p>}
    <div>
      <label htmlFor="recovery-login" className="block font-semibold text-slate-700">Identifiant de connexion</label>
      <input id="recovery-login" autoFocus required name="login" defaultValue={loginHint} autoComplete="username" autoCapitalize="none" spellCheck={false} readOnly={busy}
        aria-invalid={Boolean(fieldErrors.login)} aria-describedby={fieldErrors.login ? 'recovery-login-error' : undefined} className={recoveryInputClass + ' mt-1.5'}/>
      {fieldErrors.login && <p id="recovery-login-error" className="mt-1.5 text-sm text-red-700">{fieldErrors.login}</p>}
    </div>
    <div>
      <label htmlFor="recovery-code" className="block font-semibold text-slate-700">Code de récupération</label>
      <input id="recovery-code" required name="code" type="password" autoComplete="one-time-code" spellCheck={false} readOnly={busy}
        aria-invalid={Boolean(fieldErrors.code)} aria-describedby={fieldErrors.code ? 'recovery-code-error' : undefined} className={recoveryInputClass + ' mt-1.5'}/>
      {fieldErrors.code && <p id="recovery-code-error" className="mt-1.5 text-sm text-red-700">{fieldErrors.code}</p>}
    </div>
    <RecoveryPassword name="password" label="Nouveau mot de passe" busy={busy} error={fieldErrors.password}/>
    <RecoveryPassword name="confirmation" label="Confirmer le nouveau mot de passe" busy={busy} error={fieldErrors.confirmation}/>
    <button type="submit" disabled={busy} className="bo-button-primary h-12 w-full rounded-lg font-semibold">
      {busy && <LoaderCircle aria-hidden="true" className="size-4 shrink-0 motion-safe:animate-spin"/>}
      {busy ? 'Réinitialisation en cours…' : 'Réinitialiser le mot de passe'}
    </button>
    <span role="status" className="sr-only">{busy ? 'Réinitialisation en cours.' : ''}</span>
    <button type="button" disabled={busy} onClick={() => onBack()} className="block w-full rounded py-1 text-center font-medium text-[#0057A8] hover:underline">Retour à la connexion</button>
  </form>;
}

function RecoveryPassword({ name, label, busy, error }: {
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
