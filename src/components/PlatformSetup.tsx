import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from 'lucide-react';
import { networkMessage } from '../context/companyApi';
import {useDemoMode} from '../context/DemoContext';
import { PlatformBrand } from './PlatformBrand';

type PasswordField = 'password' | 'confirmation';
type SetupField = PasswordField | 'email' | 'setupSecret';
type Props = {
  busy: boolean;
  error: string;
  clearError(): void;
  onCreate(data: {password:string;email:string;setupSecret:string}): Promise<void>;
  onContinue(): void;
};
const inputClass = 'bo-input h-12 w-full rounded-lg border-[#8291a5] pl-11 text-base placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057A8] aria-invalid:border-red-700';
const iconClass = 'pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-500';

export function PlatformSetup({busy, error, clearError, onCreate, onContinue}: Props) {
  const demo=useDemoMode();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState<Partial<Record<SetupField, string>>>({});
  const pending = useRef(false);
  const disabled = busy || creating;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || pending.current || created) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('password') ?? '');
    const confirmation = String(data.get('confirmation') ?? '');
    const nextErrors = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.get('email')).trim()) ? '' : 'Saisissez une adresse e-mail valide.',
      setupSecret: demo ? '' : /^[a-f0-9]{64}$/i.test(String(data.get('setupSecret')).trim()) ? '' : 'Saisissez la clé d’initialisation fournie par le responsable du serveur.',
      password: !password ? 'Saisissez un mot de passe.' :
        password.length < 10 || password.length > 200 ? 'Choisissez un mot de passe de 10 à 200 caractères.' : '',
      confirmation: !confirmation ? 'Confirmez votre mot de passe.' :
        confirmation !== password ? 'Les deux mots de passe doivent être identiques.' : '',
    };
    clearError();
    setSubmitError('');
    setErrors(nextErrors);
    const invalid = Object.entries(nextErrors).find(([, message]) => message);
    if (invalid) {
      (form.elements.namedItem(invalid[0]) as HTMLInputElement).focus();
      return;
    }
    pending.current = true;
    setCreating(true);
    try {
      await onCreate({password,email:String(data.get('email')).trim(),setupSecret:String(data.get('setupSecret')??'').trim()});
      form.reset();
      setCreated(true);
    } catch (cause) {
      setSubmitError(cause instanceof TypeError ? networkMessage :
        cause instanceof Error ? cause.message : 'La création du compte est impossible. Réessayez plus tard.');
    } finally {
      pending.current = false;
      setCreating(false);
    }
  }

  return <main className="flex min-h-dvh flex-col items-center bg-[radial-gradient(ellipse_at_top,#e5eff9,transparent_65%)] bg-[#f4f7fb] px-4 py-4 text-slate-900 sm:py-8">
    <section aria-labelledby="platform-setup-title" className="bo-panel my-auto w-full max-w-[460px] shrink-0 overflow-hidden rounded-2xl border-slate-200 shadow-[0_12px_42px_-16px_rgba(21,50,82,0.23)]">
      <PlatformBrand/>
      <div className="px-6 py-7 sm:px-9 sm:py-9">
        <h1 id="platform-setup-title" className="text-[clamp(1.5rem,4vw,1.8rem)] leading-tight font-semibold tracking-tight text-[#142f49]">Créer le compte administrateur</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Configurez le compte administrateur principal de la plateforme.</p>
        {(error || submitError) && <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0"/><span>{error || submitError}</span>
        </div>}
        {created ? <div className="mt-7 space-y-5">
          <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-3 text-sm text-green-800">{demo?'Message simulé disponible dans la boîte de réception démo. Ouvrez le lien de vérification avant de vous connecter.':'Le serveur SMTP a accepté le message de vérification. Ouvrez le lien reçu par e-mail avant de vous connecter. Il est valable 15 minutes.'}</p>
          <button type="button" disabled={busy} onClick={onContinue} className="bo-button-primary h-12 w-full rounded-lg text-base font-semibold">
            {busy && <LoaderCircle aria-hidden="true" size={17} className="motion-safe:animate-spin"/>}
            {busy ? 'Ouverture en cours…' : 'Actualiser après vérification'}{!busy && <ArrowRight aria-hidden="true" size={17}/>}
          </button>
          <button type="button" disabled={busy} onClick={()=>setCreated(false)} className="bo-button-secondary w-full">Renvoyer un lien</button>
        </div> : <form noValidate aria-busy={disabled} onSubmit={submit} className="mt-7 space-y-5" onChange={event => {
          const field = (event.target as HTMLInputElement).name;
          setErrors(previous => ({...previous, [field]: undefined}));
          setSubmitError('');
          clearError();
        }}>
          <div><label htmlFor="setup-email" className="block text-sm font-semibold text-slate-700">Adresse e-mail</label>
            <input id="setup-email" name="email" type="email" required maxLength={254} placeholder="vous@entreprise.fr" autoComplete="email" readOnly={disabled} className="bo-input mt-2 h-12 w-full"/>
            {errors.email && <p role="alert" className="mt-1 text-sm text-red-700">{errors.email}</p>}
          </div>
          {!demo && <div><label htmlFor="setup-secret" className="block text-sm font-semibold text-slate-700">Clé d’initialisation</label>
            <input id="setup-secret" name="setupSecret" type="password" required maxLength={200} autoComplete="off" readOnly={disabled} className="bo-input mt-2 h-12 w-full"/>
            {errors.setupSecret && <p role="alert" className="mt-1 text-sm text-red-700">{errors.setupSecret}</p>}
            <p className="mt-1.5 text-xs text-slate-600">Fournie par le responsable du serveur. Pour renvoyer un lien expiré, utilisez les mêmes informations.</p>
          </div>}
          <SetupPassword name="password" label="Mot de passe" disabled={disabled} error={errors.password}/>
          <SetupPassword name="confirmation" label="Confirmer le mot de passe" disabled={disabled} error={errors.confirmation}/>
          <button type="submit" disabled={disabled} className="bo-button-primary h-12 w-full rounded-lg text-base font-semibold disabled:opacity-80">
            {disabled && <LoaderCircle aria-hidden="true" size={17} className="motion-safe:animate-spin"/>}
            {disabled ? 'Création en cours…' : 'Créer le compte'}{!disabled && <ArrowRight aria-hidden="true" size={17}/>}
          </button>
          <span role="status" className="sr-only">{disabled ? 'Création du compte en cours.' : ''}</span>
        </form>}
      </div>
    </section>
  </main>;
}

function SetupPassword({name, label, disabled, error}: {name: PasswordField; label: string; disabled: boolean; error?: string}) {
  const [visible, setVisible] = useState(false);
  const id = 'setup-' + name;
  const description = [name === 'password' ? 'setup-password-hint' : '', error ? id + '-error' : ''].filter(Boolean).join(' ') || undefined;
  return <div>
    <label htmlFor={id} className="block text-sm font-semibold text-slate-700">{label}</label>
    <div className="relative mt-2">
      <LockKeyhole aria-hidden="true" className={iconClass}/>
      <input id={id} name={name} type={visible ? 'text' : 'password'} required readOnly={disabled} minLength={10} maxLength={200}
        autoComplete="new-password" placeholder={name === 'password' ? 'Choisissez votre mot de passe' : 'Saisissez à nouveau le mot de passe'}
        aria-invalid={Boolean(error)} aria-describedby={description} className={inputClass + ' pr-12'}/>
      <button type="button" disabled={disabled} aria-label={`${visible ? 'Masquer' : 'Afficher'} ${name === 'password' ? 'le mot de passe' : 'la confirmation du mot de passe'}`}
        aria-controls={id} aria-pressed={visible} onClick={()=>setVisible(!visible)}
        className="absolute inset-y-1 right-1 grid w-10 place-items-center rounded-md text-slate-600 hover:bg-slate-100 focus-visible:outline-2">
        {visible ? <EyeOff aria-hidden="true" size={18}/> : <Eye aria-hidden="true" size={18}/>}
      </button>
    </div>
    {name === 'password' && <p id="setup-password-hint" className="mt-1.5 text-xs text-slate-600">De 10 à 200 caractères.</p>}
    {error && <p id={id + '-error'} className="mt-1.5 text-sm text-red-700">{error}</p>}
  </div>;
}
