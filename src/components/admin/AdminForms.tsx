import { useRef, useState, type FormEvent } from 'react';
import {useDemoMode,deliveryNotice} from '../../context/DemoContext';
import { KeyRound, Plus } from 'lucide-react';
import { api, companyPath, networkMessage } from '../../context/companyApi';
import { SalesDialog } from '../backoffice/SalesUI';
import { adminLink, Field, Panel } from './AdminUI';
import type { AdminCompany, CompanyStatus } from '../../types/administration';

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

export function CompanyEmailForm({company,notify}: {company: AdminCompany; notify(message: string):void}) {
  const demo=useDemoMode();
  const [address,setAddress] = useState(company.pendingEmail ?? company.email ?? '');
  const {busy,error,submit} = useSubmit();
  const changed = address.trim() !== (company.pendingEmail ?? company.email ?? '');
  const disabled = company.status === 'disabled';
  return <Panel title="Adresse e-mail et activation">
    <form className="max-w-xl space-y-3 p-5 sm:p-6" onSubmit={event=>submit(event,async data=>{
      if (!company.login) {
        await api(companyPath(company.id)+'/invitation','POST',{email:address.trim(),currentPassword:data.get('currentPassword')});
        notify('Accès créé. '+deliveryNotice(demo));
      } else if (changed) {
        await api(companyPath(company.id)+'/email','PUT',{email:address.trim(),currentPassword:data.get('currentPassword')});
        notify(company.emailVerified?'Nouvelle adresse enregistrée. Envoyez le lien pour la vérifier ; l’adresse actuelle reste utilisable jusque-là.':'Adresse enregistrée. Envoyez le lien pour la faire vérifier.');
      } else {
        await api(companyPath(company.id)+(company.activationPending?'/invitation':'/email/verification'),'POST');
        notify(deliveryNotice(demo));
      }
    })}>
      <Field type="email" name="email" label="Adresse e-mail de l’entreprise" placeholder="responsable@entreprise.fr" required maxLength={254} value={address}
        disabled={disabled || busy} onChange={event=>setAddress(event.target.value)}/>
      <p className="text-sm text-slate-600">{company.email ? company.emailVerified ? 'Adresse vérifiée' : 'Adresse en attente de vérification' : 'Adresse à renseigner'}</p>
      {company.pendingEmail && <p className="text-sm text-amber-800">Adresse de connexion actuelle : {company.email}. La nouvelle adresse ne la remplacera qu’après vérification.</p>}
      {(changed || !company.login) && <Field required name="currentPassword" type="password" label="Votre mot de passe administrateur" autoComplete="current-password" disabled={busy}/>}
      <FormError message={error}/>
      <button className="bo-button-secondary" disabled={disabled || busy || !address.trim() || (!changed && company.emailVerified && !company.pendingEmail)}>
        {!company.login ? 'Créer l’accès et inviter' : changed ? 'Enregistrer l’adresse' : company.activationPending ? 'Renvoyer l’invitation d’activation' : 'Envoyer le lien de vérification'}
      </button>
    </form>
  </Panel>;
}

export function CreateCompany({ created }: { created(name: string): void }) {
  const {busy,error,submit} = useSubmit();
  return <div className="max-w-2xl"><Panel title="Nouvel espace entreprise">
    <form className="space-y-5 p-5 sm:p-6" onSubmit={e => submit(e, async data => {
      const name = String(data.get('name')).trim();
      if (!name) throw new Error('Renseignez le nom de l’entreprise.');
      await api('/companies', 'POST', { name, email:String(data.get('email')).trim() });
      created(name);
    })}>
      <Field required label="Nom de l’entreprise" name="name" maxLength={100} autoComplete="organization"/>
      <Field required type="email" name="email" label="Adresse e-mail de l’administrateur d’entreprise" maxLength={254} placeholder="responsable@entreprise.fr" autoComplete="email"/>
      <p className="text-sm text-slate-600">Une invitation valable 15 minutes lui permettra de vérifier son adresse et de choisir son mot de passe.</p>
      <FormError message={error}/>
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

export function ConfirmCompanyDeletion({company, close, done}: {company: AdminCompany; close():void; done():void}) {
  const {busy, error, submit} = useSubmit();
  const [name, setName] = useState('');
  return <SalesDialog title="Supprimer définitivement l’entreprise" subtitle={company.name + ' · ' + company.id}
    onClose={() => {if (!busy) close();}}>
    <form className="space-y-4" onSubmit={event => submit(event, async () => {
      if (name !== company.name || company.deletionRevision == null) throw new Error('Vérifiez le nom et le statut de l’entreprise.');
      await api(companyPath(company.id), 'DELETE', {confirmationName: name, revision: company.deletionRevision});
      done();
    })}>
      <p className="text-sm leading-relaxed text-slate-700">Cette action est irréversible. Elle supprimera les comptes, dossiers de vente, BL, tournées, preuves et configurations de cet espace de test.</p>
      <Field label={`Saisissez le nom exact « ${company.name} » pour confirmer`} name="confirmationName" required
        autoComplete="off" spellCheck={false} value={name} onChange={e => setName(e.target.value)} disabled={busy}/>
      <FormError message={error}/>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="bo-button-secondary" disabled={busy} onClick={close}>Annuler</button>
        <button type="submit" className="bo-button-secondary border-red-300 text-red-700 disabled:opacity-50"
          disabled={busy || name !== company.name}>{busy ? 'Suppression en cours…' : 'Confirmer la suppression'}</button>
      </div>
    </form>
  </SalesDialog>;
}

export function ConfirmCompanyStatus({ company, status, close, done }: {
  company: AdminCompany; status: CompanyStatus; close(): void; done(message: string): void;
}) {
  const { busy, error, submit } = useSubmit();
  const disabling = status === 'disabled';
  return <SalesDialog title={disabling ? 'Désactiver l’entreprise' : 'Réactiver l’entreprise'}
    subtitle={company.name + ' · ' + company.id} onClose={() => { if (!busy) close(); }}>
    <form className="space-y-5" onSubmit={event => submit(event, async () => {
      await api(companyPath(company.id) + '/status', 'PUT', { status });
      done(company.name + (disabling ? ' a été désactivée.' : ' a été réactivée.'));
    })}>
      <p className="text-sm leading-relaxed text-slate-700">{disabling
        ? 'Tout accès à l’espace entreprise sera refusé, y compris par les API. Ses sessions seront révoquées et ses synchronisations arrêtées, y compris les traitements en cours. Ses données et sa configuration seront conservées. Le statut du compte reste inchangé.'
        : 'L’espace entreprise sera réactivé. Un compte bloqué restera bloqué : sa connexion nécessite aussi un compte actif et une adresse e-mail vérifiée. Les anciennes sessions resteront invalides. Si la synchronisation automatique était activée, elle reprendra selon la fréquence configurée.'}</p>
      <FormError message={error}/>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="bo-button-secondary" disabled={busy} onClick={close}>Annuler</button>
        <button className="bo-button-primary" disabled={busy}>{disabling ? 'Confirmer la désactivation' : 'Confirmer la réactivation'}</button>
      </div>
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

export function AdminEmail({email,emailVerified,pendingEmail,notify}: {email:string|null;emailVerified:boolean;pendingEmail:string|null;notify(message:string):void}) {
  const demo=useDemoMode();
  const {busy,error,submit}=useSubmit();
  const [address,setAddress]=useState(pendingEmail??email??'');
  const changed=address.trim()!==(pendingEmail??email??'');
  return <Panel title="Mon adresse e-mail"><form className="max-w-lg space-y-4 p-5 sm:p-6" onSubmit={event=>submit(event,async data=>{
    if (changed) {
      await api('/own-email','PUT',{email:address.trim(),currentPassword:data.get('currentPassword')});
      notify('Nouvelle adresse en attente de vérification. '+deliveryNotice(demo)+' L’adresse actuelle reste utilisable jusque-là.');
    } else {
      await api('/own-email/verification','POST');
      notify(deliveryNotice(demo));
    }
  })}>
    <Field required type="email" name="email" label="Adresse e-mail" maxLength={254} placeholder="admin@entreprise.fr" value={address} onChange={event=>setAddress(event.target.value)} disabled={busy}/>
    {changed && <Field required name="currentPassword" label="Mot de passe actuel" type="password" autoComplete="current-password" maxLength={200}/>}
    <p className="text-sm text-slate-600">{emailVerified && !changed ? 'Adresse vérifiée : récupération par e-mail disponible.' : 'La récupération sera disponible après vérification de cette adresse.'}</p>
    {pendingEmail && <p className="text-sm text-amber-800">Adresse de connexion actuelle : {email}. Confirmez la nouvelle adresse pour la remplacer.</p>}
    <FormError message={error}/>
    <button disabled={busy || (!changed && emailVerified && !pendingEmail)} className="bo-button-secondary">{changed ? 'Enregistrer l’adresse' : 'Envoyer le lien de vérification'}</button>
  </form></Panel>;
}
