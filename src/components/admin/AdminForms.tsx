import { useRef, useState, type FormEvent } from 'react';
import { KeyRound, Plus } from 'lucide-react';
import { api, companyPath, networkMessage } from '../../context/companyApi';
import { SalesDialog } from '../backoffice/SalesUI';
import { adminLink, Field, Panel } from './AdminUI';
import type { AdminCompany } from '../../types/administration';

function useSubmit() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>, action: (data: FormData) => Promise<void>) {
    event.preventDefault();
    if (lock.current) return;
    const data = new FormData(event.currentTarget);
    lock.current = true; setBusy(true); setError('');
    try { await action(data); }
    catch (e) { setError(e instanceof TypeError ? networkMessage : e instanceof Error ? e.message : 'Opération impossible.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, error, submit };
}
function PasswordFields() {
  return <>
    <Field required name="password" type="password" autoComplete="new-password" minLength={10} maxLength={200} label="Nouveau mot de passe" hint="De 10 à 200 caractères."/>
    <Field required name="confirmation" type="password" autoComplete="new-password" label="Confirmer le mot de passe"/>
  </>;
}
function confirmedPassword(data: FormData) {
  const password = String(data.get('password'));
  if (password !== data.get('confirmation')) throw new Error('Les deux mots de passe ne correspondent pas.');
  return password;
}
function FormError({ message }: { message: string }) {
  return message && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{message}</p>;
}

export function CreateCompany({ created }: { created(name: string): void }) {
  const {busy,error,submit} = useSubmit();
  return <div className="max-w-2xl"><Panel title="Nouvel espace entreprise">
    <form className="space-y-5 p-5 sm:p-6" onSubmit={e => submit(e, async data => {
      const name = String(data.get('name')).trim(), login = String(data.get('login')).trim();
      if (!name) throw new Error('Renseignez le nom de l’entreprise.');
      if (login === 'admin') throw new Error('L’identifiant admin est réservé à la plateforme.');
      await api('/companies', 'POST', { name, login, password: confirmedPassword(data) });
      created(name);
    })}>
      <Field required label="Nom de l’entreprise" name="name" maxLength={100} autoComplete="organization"/>
      <Field required label="Identifiant de connexion" name="login" autoCapitalize="none" autoComplete="off" minLength={2} maxLength={64}
        pattern="[a-z0-9][a-z0-9\-]{1,63}" hint="2 à 64 lettres minuscules, chiffres ou tirets. Cet identifiant reste fixe."/>
      <PasswordFields/><FormError message={error}/>
      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4"><button disabled={busy} className="bo-button-primary"><Plus size={16}/>Créer l’entreprise</button>
        <a href={adminLink('entreprises')} className="bo-button-secondary">Annuler</a></div>
    </form>
  </Panel></div>;
}

export function RenameCompany({ company, done }: { company: AdminCompany; done(): void }) {
  const {busy,error,submit} = useSubmit();
  return <form className="flex max-w-xl flex-col items-start gap-3" onSubmit={e => submit(e, async data => {
    await api(companyPath(company.id), 'PATCH', { name: String(data.get('name')).trim() });
    done();
  })}>
    <div className="w-full"><Field required label="Nom de l’entreprise" name="name" maxLength={100} defaultValue={company.name}/></div>
    <FormError message={error}/><button className="bo-button-secondary" disabled={busy}>Enregistrer le nom</button>
  </form>;
}

export function CompanyPassword({company, close, done}: {company: AdminCompany; close(): void; done(): void}) {
  const {busy,error,submit} = useSubmit();
  return <SalesDialog title={company.login ? 'Réinitialiser l’accès entreprise' : 'Définir l’accès entreprise'} subtitle={company.name + ' · ' + company.id} onClose={() => {if (!busy) close();}}>
    <form className="space-y-4" onSubmit={e => submit(e, async data => {
      await api(companyPath(company.id) + '/password', 'PUT', { password: confirmedPassword(data) });
      done();
    })}>
      <PasswordFields/>
      <label className="flex items-start gap-2 text-sm text-slate-700"><input required type="checkbox" className="mt-1"/>
        Je confirme avoir vérifié l’identité du demandeur. Les sessions de ce compte seront fermées.</label>
      <FormError message={error}/>
      <div className="flex flex-wrap gap-2"><button className="bo-button-primary" disabled={busy}>Confirmer le nouvel accès</button>
        <button type="button" className="bo-button-secondary" disabled={busy} onClick={close}>Annuler</button></div>
    </form>
  </SalesDialog>;
}

export function AdminPassword({ changed }: { changed(): void }) {
  const {busy,error,submit} = useSubmit();
  return <Panel title="Modifier mon mot de passe"><form className="max-w-lg space-y-4 p-5 sm:p-6" onSubmit={e => submit(e, async data => {
    await api('/admin/password','PUT',{ currentPassword: data.get('current'), password: confirmedPassword(data) });
    changed();
  })}>
    <Field label="Mot de passe actuel" name="current" required type="password" autoComplete="current-password" maxLength={200}/>
    <PasswordFields/><p className="text-sm text-slate-600">Après confirmation, reconnectez-vous avec votre nouveau mot de passe. Toutes vos sessions administrateur seront fermées.</p>
    <FormError message={error}/><button className="bo-button-primary" disabled={busy}><KeyRound size={15}/>Confirmer le changement</button>
  </form></Panel>;
}
