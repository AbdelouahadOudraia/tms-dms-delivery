import React, { useState } from 'react';
import { PageHeader } from '../common/BackofficeUI';

const SettingSection: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <section className="border-b border-[#E2E8F0] py-6 first:pt-0 last:border-0 last:pb-0">
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <div><h2 className="text-base font-semibold text-[#1F2937]">{title}</h2><p className="mt-1 text-[13px] leading-5 text-[#64748B]">{description}</p></div>
      <div className="min-w-0">{children}</div>
    </div>
  </section>
);

const ToggleRow: React.FC<{ title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ title, description, checked, onChange }) => (
  <label className="flex cursor-pointer items-start justify-between gap-6 border-b border-[#E2E8F0] py-4 first:pt-0 last:border-0 last:pb-0">
    <span><span className="block text-sm font-medium text-[#1F2937]">{title}</span><span className="mt-1 block text-[13px] leading-5 text-[#64748B]">{description}</span></span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#0057A8]" />
  </label>
);

export const SettingsScreen: React.FC = () => {
  const [gpsTolerance, setGpsTolerance] = useState(50);
  const [requirePhoto, setRequirePhoto] = useState(true);
  const [requireSignature, setRequireSignature] = useState(true);
  const [delayThreshold, setDelayThreshold] = useState(15);
  const [autoNotifyCustomer, setAutoNotifyCustomer] = useState(true);
  const [hubName, setHubName] = useState('Hub Central Casablanca - Ain Sebaa');
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="bo-page overflow-y-auto scrollbar-soft">
      <div className="mx-auto w-full max-w-[1000px]">
        <PageHeader
          title="Règles & workflow"
          subtitle="Configuration du dépôt, des preuves de livraison et des alertes opérationnelles"
          actions={savedToast ? <span className="inline-flex h-9 items-center gap-2 rounded-md bg-[#F0FDF4] px-3 text-[13px] font-medium text-[#166534]"><span className="material-symbols-outlined text-[18px]">check_circle</span>Paramètres enregistrés</span> : undefined}
        />
        <form onSubmit={handleSave} className="bo-panel p-6">
          <SettingSection title="Dépôt principal" description="Contexte logistique utilisé par défaut dans le backoffice.">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-[13px] font-medium text-[#475569]">Nom du hub / entrepôt<input value={hubName} onChange={(event) => setHubName(event.target.value)} className="bo-input mt-1.5 w-full" /></label>
              <label className="text-[13px] font-medium text-[#475569]">Ville et région<input value="Casablanca-Settat, Maroc" disabled className="bo-input mt-1.5 w-full bg-[#F8FAFC] text-[#64748B]" /></label>
            </div>
          </SettingSection>

          <SettingSection title="Preuve de livraison" description="Pièces exigées avant la finalisation d’une livraison par le chauffeur.">
            <ToggleRow title="Photo obligatoire" description="Empêche la finalisation si aucune photo du colis n’est capturée." checked={requirePhoto} onChange={setRequirePhoto} />
            <ToggleRow title="Signature obligatoire" description="Demande la signature tactile et le nom du réceptionnaire." checked={requireSignature} onChange={setRequireSignature} />
            <div className="pt-4"><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-[#1F2937]">Tolérance GPS</span><span className="font-mono font-medium text-[#0057A8]">± {gpsTolerance} mètres</span></div><input type="range" min={20} max={200} step={10} value={gpsTolerance} onChange={(event) => setGpsTolerance(Number(event.target.value))} className="w-full accent-[#0057A8]" /><p className="mt-2 text-[13px] leading-5 text-[#64748B]">Une preuve réalisée au-delà de ce rayon déclenche un avertissement de non-conformité.</p></div>
          </SettingSection>

          <SettingSection title="Notifications" description="Seuil de retard et information automatique du client.">
            <div className="border-b border-[#E2E8F0] pb-4"><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-[#1F2937]">Alerte de retard après</span><span className="font-mono font-medium text-[#C2410C]">{delayThreshold} minutes</span></div><input type="range" min={5} max={60} step={5} value={delayThreshold} onChange={(event) => setDelayThreshold(Number(event.target.value))} className="w-full accent-[#E8722C]" /><p className="mt-2 text-[13px] leading-5 text-[#64748B]">Dérive autorisée par rapport au créneau prévu avant de qualifier la livraison en retard.</p></div>
            <div className="pt-4"><ToggleRow title="Notification client automatique" description="Envoie un message au passage du statut à « En route » avec le lien de suivi." checked={autoNotifyCustomer} onChange={setAutoNotifyCustomer} /></div>
          </SettingSection>

          <div className="mt-6 flex justify-end"><button type="submit" className="bo-button-primary"><span className="material-symbols-outlined text-[18px]">save</span>Enregistrer les modifications</button></div>
        </form>
      </div>
    </div>
  );
};
