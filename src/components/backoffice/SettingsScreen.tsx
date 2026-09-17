import React, { useState } from 'react';

export const SettingsScreen: React.FC = () => {
  const [gpsTolerance, setGpsTolerance] = useState<number>(50);
  const [requirePhoto, setRequirePhoto] = useState<boolean>(true);
  const [requireSignature, setRequireSignature] = useState<boolean>(true);
  const [delayThreshold, setDelayThreshold] = useState<number>(15);
  const [autoNotifyCustomer, setAutoNotifyCustomer] = useState<boolean>(true);
  const [hubName, setHubName] = useState<string>('Hub Central Casablanca - Ain Sebaa');
  const [savedToast, setSavedToast] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5F6F7] overflow-y-auto scrollbar-soft">
      {/* Header */}
      <div className="bg-white border-b border-[#E3E5E8] px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[#1D2229]">
            Paramètres du système TMS / DMS
          </h1>
          <p className="text-xs text-[#5B6470] mt-0.5">
            Règles d'arbitrage e-POD, seuils opérationnels et configuration des dépôts.
          </p>
        </div>

        {savedToast && (
          <div className="px-3 py-1.5 bg-[#EAF5EE] text-[#176B3A] border border-[#BEE3CE] text-xs font-semibold rounded-lg flex items-center gap-1.5 animate-in fade-in">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Paramètres enregistrés avec succès</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="p-6 max-w-4xl space-y-6">
        {/* Section 1: Configuration du Dépôt */}
        <div className="bg-white rounded-2xl p-5 border border-[#E3E5E8] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E3E5E8] pb-3">
            <span className="material-symbols-outlined text-[22px] text-[#0057A8]">
              warehouse
            </span>
            <h2 className="text-sm font-bold text-[#1D2229]">
              Configuration du dépôt principal
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[#1D2229] block mb-1">
                Nom du Hub / Entrepôt
              </label>
              <input
                type="text"
                value={hubName}
                onChange={(e) => setHubName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E3E5E8] text-xs text-[#1D2229] focus:border-[#0057A8] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-[#1D2229] block mb-1">
                Ville & Région logistique
              </label>
              <input
                type="text"
                defaultValue="Casablanca-Settat, Maroc"
                className="w-full h-9 px-3 rounded-lg border border-[#E3E5E8] text-xs text-[#1D2229] bg-[#F5F6F7]"
                disabled
              />
            </div>
          </div>
        </div>

        {/* Section 2: Règles de Validation e-POD */}
        <div className="bg-white rounded-2xl p-5 border border-[#E3E5E8] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E3E5E8] pb-3">
            <span className="material-symbols-outlined text-[22px] text-[#0057A8]">
              verified
            </span>
            <h2 className="text-sm font-bold text-[#1D2229]">
              Règles de validation des preuves de livraison (e-POD)
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#F5F6F7] rounded-xl border border-[#E3E5E8]">
              <div>
                <span className="font-semibold text-[#1D2229] block">
                  Exiger obligatoirement une photo du colis
                </span>
                <span className="text-[#5B6470] text-[11px]">
                  Bloque la finalisation du chauffeur si aucune photo n'est capturée.
                </span>
              </div>
              <input
                type="checkbox"
                checked={requirePhoto}
                onChange={(e) => setRequirePhoto(e.target.checked)}
                className="w-4 h-4 accent-[#0057A8] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F5F6F7] rounded-xl border border-[#E3E5E8]">
              <div>
                <span className="font-semibold text-[#1D2229] block">
                  Exiger la signature tactile du réceptionnaire
                </span>
                <span className="text-[#5B6470] text-[11px]">
                  Requiert le tracé manuscrit et le nom du tiers ayant accusé réception.
                </span>
              </div>
              <input
                type="checkbox"
                checked={requireSignature}
                onChange={(e) => setRequireSignature(e.target.checked)}
                className="w-4 h-4 accent-[#0057A8] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#1D2229]">
                  Seuil de tolérance d'écart GPS (rayon max)
                </span>
                <span className="font-bold font-mono text-[#0057A8]">
                  ± {gpsTolerance} mètres
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={200}
                step={10}
                value={gpsTolerance}
                onChange={(e) => setGpsTolerance(Number(e.target.value))}
                className="w-full accent-[#0057A8] cursor-pointer"
              />
              <span className="text-[11px] text-[#5B6470]">
                Au-delà de ce rayon entre les coordonnées du client et le mobile, un avertissement de non-conformité est levé.
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Alertes & Retards */}
        <div className="bg-white rounded-2xl p-5 border border-[#E3E5E8] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E3E5E8] pb-3">
            <span className="material-symbols-outlined text-[22px] text-[#E8722C]">
              notifications_active
            </span>
            <h2 className="text-sm font-bold text-[#1D2229]">
              Notifications & Seuils de retard
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#1D2229]">
                  Déclenchement d'alerte de retard automatique
                </span>
                <span className="font-bold font-mono text-[#E8722C]">
                  + {delayThreshold} minutes
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={delayThreshold}
                onChange={(e) => setDelayThreshold(Number(e.target.value))}
                className="w-full accent-[#E8722C] cursor-pointer"
              />
              <span className="text-[11px] text-[#5B6470]">
                Temps de dérive par rapport au créneau initial avant qualification de la commande en "Retard".
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F5F6F7] rounded-xl border border-[#E3E5E8]">
              <div>
                <span className="font-semibold text-[#1D2229] block">
                  Notification SMS / WhatsApp automatique au client
                </span>
                <span className="text-[#5B6470] text-[11px]">
                  Envoi d'un message lors du passage du statut à « En route » avec le lien de suivi.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoNotifyCustomer}
                onChange={(e) => setAutoNotifyCustomer(e.target.checked)}
                className="w-4 h-4 accent-[#0057A8] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#0057A8] hover:bg-[#004280] text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>Enregistrer les modifications</span>
          </button>
        </div>
      </form>
    </div>
  );
};
