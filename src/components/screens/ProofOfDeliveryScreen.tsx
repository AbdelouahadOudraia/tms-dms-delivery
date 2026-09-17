import React, { useState } from 'react';
import { DeliveryStop, ScreenType } from '../../types';
import { SignaturePad } from '../SignaturePad';
import { ImageSourceModal } from '../ImageSourceModal';

interface ProofOfDeliveryScreenProps {
  stop: DeliveryStop;
  onNavigate: (screen: ScreenType) => void;
  onConfirmDelivery: (stopId: number, notes: string, photoUrl: string) => void;
  onOpenIncident: (stop: DeliveryStop) => void;
}

export const ProofOfDeliveryScreen: React.FC<ProofOfDeliveryScreenProps> = ({
  stop,
  onNavigate,
  onConfirmDelivery,
  onOpenIncident,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string>(
    stop.proof?.photoUrl ||
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAXHM1lL1rEWxr1uZ1QByoidI4PhxHfmI3dOWhQkSszjHsTd63ksNaYaIdt2N7nhacQXYiXZBorAj4NP2N5KFv1uG_HPPww6Dcp0RNA9N3ax6lZh1CCoR0s5H6q37Bh4F6eI-PUCwEGYvXta4mk0sQDDgBeSZWmYwl3jb4N4Q6kpY4WangBBp1ZV-20tM_4y0FClT0-uv_PQpEqstZBVGd-du_-qZ94Fc-HvgIoiyTd8TKO8Wupn6s8'
  );
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [hasSignature, setHasSignature] = useState(true);
  const [recipientName, setRecipientName] = useState(stop.customerName);
  const [driverNote, setDriverNote] = useState(
    stop.proof?.driverNotes ||
      'Remis en main propre, carton TV intact, déballage vérifié'
  );
  const [checkedItems, setCheckedItems] = useState<{ [id: string]: boolean }>({
    'item-2-1': true,
    'item-2-2': true,
  });

  const allItemsChecked = Object.values(checkedItems).every(Boolean);

  const handleToggleItem = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirm = () => {
    onConfirmDelivery(stop.id, driverNote, photoUrl);
  };

  return (
    <div className="flex-1 max-w-2xl w-full mx-auto flex flex-col justify-between select-none animate-in fade-in duration-200">
      {/* Sub-Header Context Bar */}
      <section className="bg-[#ffffff] border-b border-[#c5c5d3] px-3 sm:px-4 py-2.5 shadow-xs sticky top-14 z-30">
        <div className="max-w-2xl mx-auto flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('detail')}
                className="p-1 rounded hover:bg-[#eaedff] text-[#0057A8] flex items-center justify-center -ml-1 mr-0.5"
                title="Retour au détail"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              </button>
              <span className="text-[#0057A8] text-[11px] font-code-tabular font-bold uppercase tracking-wider bg-[#eaedff] px-1.5 py-0.5 rounded border border-[#c5c5d3]">
                STOP {stop.sequence}
              </span>
              <h1 className="text-[16px] font-bold text-[#131b2e] tracking-tight">
                Preuve de livraison (POD)
              </h1>
            </div>
            <span className="text-[16px] font-code-tabular font-bold text-[#0057A8]">
              {stop.orderId}
            </span>
          </div>

          <div className="flex items-center justify-between text-[12px] text-[#444651] pt-0.5">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-[#757682]">
                person
              </span>
              <span className="font-bold text-[#131b2e]">{stop.customerName}</span>
              <span className="text-[#757682]">•</span>
              <span className="truncate max-w-[170px] sm:max-w-xs">
                Ain Diab, Résidence Les Alizés, Imm B
              </span>
            </div>
            <span className="font-code-tabular text-[11px] bg-[#ECFDF5] text-[#059669] font-bold px-1.5 py-0.5 rounded border border-[#A7F3D0]">
              SLA 10:00 - 11:30
            </span>
          </div>
        </div>
      </section>

      {/* Main Scrollable Canvas */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-3 sm:p-4 pb-36 space-y-3 sm:space-y-4">
        {/* TELEMETRY / AUTOMATIC SENSORS PANEL */}
        <div className="bg-[#ffffff] border border-[#c5c5d3] rounded p-2.5 sm:p-3 space-y-2 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#c5c5d3]/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
                <span className="material-symbols-outlined text-[16px]">verified</span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#444651]">
                Télémétrie Automatique Horodatée
              </span>
            </div>
            <div className="flex items-center gap-1 text-[13px] font-code-tabular text-[#0057A8]">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span className="font-bold">10:42</span>
              <span className="text-[11px] text-[#757682]">(Sync serveur)</span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-[#f2f3ff] px-2.5 py-1.5 rounded border border-[#c5c5d3]/60">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#059669]">
                near_me
              </span>
              <span className="text-[12px] text-[#131b2e] font-medium">
                Position GPS certifiée (33.5928° N, -7.6681° W - Écart &lt; 15m)
              </span>
            </div>
            <span className="text-[11px] font-code-tabular text-[#059669] font-bold bg-[#ECFDF5] px-1.5 py-0.5 rounded border border-[#A7F3D0]">
              CONFORME
            </span>
          </div>
        </div>

        {/* ÉTAPE 1: CONTRÔLE DES ARTICLES */}
        <div className="bg-[#ffffff] border border-[#c5c5d3] rounded shadow-xs overflow-hidden">
          <div className="p-3 border-b border-[#c5c5d3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#004280] text-white flex items-center justify-center text-[12px] font-bold">
                1
              </div>
              <h2 className="text-[16px] font-bold text-[#131b2e]">
                Contrôle des articles
              </h2>
            </div>
            {/* Indicateur vert 'Tous les colis contrôlés' */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase border ${
                allItemsChecked
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]'
                  : 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {allItemsChecked ? 'check_circle' : 'pending'}
              </span>
              <span>
                {allItemsChecked ? 'Tous les colis contrôlés' : 'À vérifier'}
              </span>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {/* Item 1 */}
            <label
              onClick={() => handleToggleItem('item-2-1')}
              className={`flex items-start gap-3 p-2.5 rounded border cursor-pointer transition-colors ${
                checkedItems['item-2-1']
                  ? 'border-[#A7F3D0] bg-[#ECFDF5]/40'
                  : 'border-[#c5c5d3] bg-white'
              }`}
            >
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  checked={Boolean(checkedItems['item-2-1'])}
                  onChange={() => handleToggleItem('item-2-1')}
                  className="w-5 h-5 text-[#0057A8] rounded border-[#757682] focus:ring-0 cursor-pointer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[#131b2e]">
                    Réfrigérateur Samsung ×1
                  </span>
                  <span className="font-code-tabular text-[12px] bg-[#eaedff] px-1.5 py-0.5 rounded border border-[#c5c5d3] font-semibold text-[#444651]">
                    Lourd • 84kg
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="material-symbols-outlined text-[16px] text-[#059669]">
                    barcode_scanner
                  </span>
                  <span className="text-[12px] font-code-tabular text-[#444651]">
                    N° série scanné :{' '}
                    <span className="font-bold text-[#0057A8]">SN-98234</span>
                  </span>
                  <span className="text-[11px] text-[#059669] font-bold ml-auto">
                    Validé 10:35
                  </span>
                </div>
              </div>
            </label>

            {/* Item 2 */}
            <label
              onClick={() => handleToggleItem('item-2-2')}
              className={`flex items-start gap-3 p-2.5 rounded border cursor-pointer transition-colors ${
                checkedItems['item-2-2']
                  ? 'border-[#A7F3D0] bg-[#ECFDF5]/40'
                  : 'border-[#c5c5d3] bg-white'
              }`}
            >
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  checked={Boolean(checkedItems['item-2-2'])}
                  onChange={() => handleToggleItem('item-2-2')}
                  className="w-5 h-5 text-[#0057A8] rounded border-[#757682] focus:ring-0 cursor-pointer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[#131b2e]">
                    TV LG OLED 55" ×1
                  </span>
                  <span className="font-code-tabular text-[12px] bg-[#eaedff] px-1.5 py-0.5 rounded border border-[#c5c5d3] font-semibold text-[#444651]">
                    Fragile • 19kg
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="material-symbols-outlined text-[16px] text-[#059669]">
                    barcode_scanner
                  </span>
                  <span className="text-[12px] font-code-tabular text-[#444651]">
                    N° série scanné :{' '}
                    <span className="font-bold text-[#0057A8]">LG-77210</span>
                  </span>
                  <span className="text-[11px] text-[#059669] font-bold ml-auto">
                    Validé 10:37
                  </span>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* ÉTAPE 2: JUSTIFICATIFS DE LIVRAISON */}
        <div className="bg-[#ffffff] border border-[#c5c5d3] rounded shadow-xs overflow-hidden">
          <div className="p-3 border-b border-[#c5c5d3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#004280] text-white flex items-center justify-center text-[12px] font-bold">
                2
              </div>
              <h2 className="text-[16px] font-bold text-[#131b2e]">
                Justificatifs de livraison
              </h2>
            </div>
            <span className="text-[11px] font-bold text-[#444651] bg-[#eaedff] px-2 py-0.5 rounded border border-[#c5c5d3]">
              2/2 Renseignés
            </span>
          </div>

          <div className="p-3 space-y-4">
            {/* PHOTO DE LIVRAISON */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-[#131b2e] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#0057A8]">
                    photo_camera
                  </span>
                  <span>Photo de livraison</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-code-tabular bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] px-2 py-0.5 rounded font-bold">
                    Photo horodatée 10:38
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="text-[11px] text-[#1976D2] hover:underline font-bold"
                  >
                    Lien image ↗
                  </button>
                </div>
              </div>

              {/* Cadre avec aperçu photo */}
              <div className="relative rounded border border-[#c5c5d3] overflow-hidden bg-[#e2e7ff] aspect-[16/9] flex items-center justify-center shadow-inner group">
                <img
                  src={photoUrl}
                  alt="Preuve photo de livraison"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-101"
                />
                {/* Watermark / Metadata Overlay */}
                <div className="absolute bottom-2 left-2 bg-[#283044]/90 text-white px-2.5 py-1 rounded text-[11px] font-code-tabular flex items-center gap-1.5 backdrop-blur-xs shadow">
                  <span className="material-symbols-outlined text-[13px] text-[#A7F3D0]">
                    location_on
                  </span>
                  <span>33.5928° N, -7.6681° W • 10:38:14</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="absolute top-2 right-2 bg-[#ffffff]/90 hover:bg-[#ffffff] border border-[#c5c5d3] text-[#131b2e] text-[11px] font-bold px-2.5 py-1.5 rounded shadow-sm flex items-center gap-1 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#0057A8]">
                    refresh
                  </span>
                  <span>Reprendre une photo</span>
                </button>
              </div>
            </div>

            {/* SIGNATURE DU CLIENT */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-[#131b2e] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#0057A8]">
                    draw
                  </span>
                  <span>Signature du client</span>
                </label>
                <span className="text-[11px] font-code-tabular text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded font-bold">
                  Signé à 10:40
                </span>
              </div>

              {/* Cadre de signature tactile avec tracé manuscrit */}
              <SignaturePad
                onSignatureChange={(sig) => setHasSignature(sig)}
                defaultHasSignature={true}
              />
            </div>

            {/* NOM DU RÉCEPTIONNAIRE */}
            <div className="space-y-1">
              <label
                htmlFor="recipient-name"
                className="text-[13px] font-bold text-[#131b2e] flex items-center justify-between"
              >
                <span>Nom du réceptionnaire</span>
                <span className="text-[11px] font-bold text-[#0284C7] bg-[#F0F9FF] border border-[#BAE6FD] px-1.5 py-0.5 rounded">
                  Vérification CNI conforme
                </span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#757682]">
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                </span>
                <input
                  id="recipient-name"
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full h-10 pl-9 pr-24 rounded border border-[#c5c5d3] bg-[#f2f3ff] text-[#131b2e] text-[13px] font-bold focus:border-[#1976D2] focus:outline-none"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#444651] text-[12px] font-medium">
                  (Titulaire)
                </span>
              </div>
            </div>

            {/* REMARQUE CHAUFFEUR */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="driver-note"
                  className="text-[13px] font-bold text-[#131b2e] flex items-center gap-1"
                >
                  <span>Remarque chauffeur</span>
                  <span className="text-[#757682] text-[12px] font-normal">
                    (Optionnel)
                  </span>
                </label>
                <span className="text-[11px] text-[#757682] font-code-tabular">
                  {driverNote.length} / 200 car.
                </span>
              </div>
              <div className="relative">
                <textarea
                  id="driver-note"
                  rows={2}
                  maxLength={200}
                  value={driverNote}
                  onChange={(e) => setDriverNote(e.target.value)}
                  className="w-full p-2.5 rounded border border-[#c5c5d3] bg-[#ffffff] text-[#131b2e] text-[13px] focus:border-[#1976D2] focus:outline-none resize-none leading-relaxed"
                />
              </div>
              <p className="text-[11px] text-[#444651]">
                Mention enregistrée sur le bordereau numérique et le récépissé client.
              </p>
            </div>
          </div>
        </div>

        {/* RÉCAPITULATIF SÉCURITÉ DISPATCH */}
        <div className="bg-[#eaedff] p-3 rounded border border-[#c5c5d3] flex items-start gap-2.5 text-[#444651]">
          <span className="material-symbols-outlined text-[#0057A8] text-[20px] shrink-0 mt-0.5">
            security
          </span>
          <div className="text-[12px] leading-tight space-y-0.5">
            <p className="font-bold text-[#131b2e]">
              Protocole de validation e-POD certifié
            </p>
            <p>
              L'envoi transmettra instantanément le récépissé signé par SMS/e-mail au client
              et clôturera le stop sur le pupitre du dispatcher.
            </p>
          </div>
        </div>
      </main>

      {/* DOCKED ACTION FOOTER (Sticky Driver Bottom Toolbar) */}
      <footer className="fixed bottom-0 left-0 w-full bg-[#ffffff] border-t border-[#c5c5d3] shadow-lg z-50 p-3 sm:p-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-1.5">
          {/* Bouton principal pleine largeur : 'Confirmer la livraison' */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full min-h-[50px] bg-[#004280] hover:bg-[#0057A8] active:bg-[#00174b] text-white font-bold text-[15px] rounded flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[20px]">
              check_circle
            </span>
            <span>Confirmer la livraison</span>
            <span className="text-[12px] font-normal opacity-80 pl-1">
              (Passer à 'À valider')
            </span>
          </button>

          {/* Lien secondaire discret : 'Impossible de livrer' */}
          <div className="text-center pt-0.5">
            <button
              type="button"
              onClick={() => onOpenIncident(stop)}
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#ba1a1a] hover:text-red-700 hover:underline py-1 px-3 active:opacity-70 transition-opacity"
            >
              <span className="material-symbols-outlined text-[16px]">
                report_problem
              </span>
              <span>Impossible de livrer (Signaler un incident ou absence)</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Dynamic Image Link Modal */}
      <ImageSourceModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        currentPhotoUrl={photoUrl}
        onSavePhotoUrl={(newUrl) => setPhotoUrl(newUrl)}
      />
    </div>
  );
};
