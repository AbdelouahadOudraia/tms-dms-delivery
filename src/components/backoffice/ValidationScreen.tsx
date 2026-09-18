import React, { useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { StatusBadge } from '../common/StatusBadge';

const REJECT_REASONS = [
  'Photo incorrecte',
  'Signature manquante',
  'Informations incorrectes',
  'Produit endommagé',
  'Localisation incohérente',
  'Autre',
];

export const ValidationScreen: React.FC = () => {
  const {
    deliveries,
    selectedDeliveryId,
    setSelectedDeliveryId,
    validateDelivery,
    rejectDelivery,
  } = useTms();

  const [filter, setFilter] = useState<'a_valider' | 'toutes'>('a_valider');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Photo incorrecte');
  const [rejectComment, setRejectComment] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const pendingDeliveries = deliveries.filter((delivery) => delivery.status === 'À valider');
  const deliveriesWithProof = deliveries.filter((delivery) => delivery.proof);
  const displayList = filter === 'a_valider' ? pendingDeliveries : deliveriesWithProof;
  const currentDelivery =
    displayList.find((delivery) => delivery.id === selectedDeliveryId) ||
    pendingDeliveries[0] ||
    (filter === 'toutes' ? deliveriesWithProof[0] : undefined);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const handleValidateConfirm = () => {
    if (!currentDelivery) return;
    validateDelivery(currentDelivery.id);
    setShowValidateModal(false);
    showToast(`Livraison ${currentDelivery.orderId} validée avec succès.`);
  };

  const handleRejectSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentDelivery) return;
    if (rejectReason === 'Autre' && !rejectComment.trim()) return;

    rejectDelivery(currentDelivery.id, rejectReason, rejectComment);
    setShowRejectModal(false);
    setRejectComment('');
    showToast(`Livraison ${currentDelivery.orderId} rejetée.`);
  };

  return (
    <div className="bo-page !p-0">
      <div className="shrink-0 px-6 pb-4 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[#182433]">
                Livraisons à valider
              </h1>
              <span className="px-2.5 py-1 rounded-full bg-[#FFF3E8] text-[#C65F18] font-bold text-xs border border-[#FFD9B8]">
                {pendingDeliveries.length} à valider
              </span>
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              Contrôle des photos, signatures, coordonnées GPS et remarques chauffeur avant validation finale.
            </p>
          </div>

          <div className="flex items-center bg-[#F3F7FB] p-1 rounded-lg border border-[#DDE7F0] text-xs">
            <button
              type="button"
              onClick={() => setFilter('a_valider')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                filter === 'a_valider'
                  ? 'bg-white text-[#0057A8] shadow-sm'
                  : 'text-[#627286] hover:text-[#182433]'
              }`}
            >
              À valider ({pendingDeliveries.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('toutes')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                filter === 'toutes'
                  ? 'bg-white text-[#0057A8] shadow-sm'
                  : 'text-[#627286] hover:text-[#182433]'
              }`}
            >
              Dossiers e-POD ({deliveriesWithProof.length})
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="mx-6 mt-4 rounded-lg border border-[#BCD6ED] bg-[#E8F2FB] px-4 py-3 text-xs font-semibold text-[#0057A8] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {toast}
          </span>
          <button type="button" onClick={() => setToast(null)} className="text-[#627286] hover:text-[#182433]">
            ✕
          </button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[390px_minmax(0,1fr)] gap-4 overflow-hidden px-6 pb-6">
        <section className="bo-panel flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DDE7F0] bg-[#F7FAFC] flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-[#182433] uppercase tracking-wide">
                File e-POD
              </h2>
              <p className="text-[11px] text-[#627286] mt-0.5">
                Dossiers reçus du terrain
              </p>
            </div>
            <span className="text-xs font-mono text-[#627286]">{displayList.length}</span>
          </div>

          <div className="grid grid-cols-[92px_1fr_74px] gap-3 px-4 py-2 bg-white border-b border-[#EDF2F7] text-[10px] font-bold uppercase tracking-wide text-[#627286]">
            <span>Commande</span>
            <span>Client</span>
            <span className="text-right">Heure</span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-soft">
            {displayList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <span className="material-symbols-outlined text-[40px] text-[#7AA7D9]">task_alt</span>
                <p className="text-sm font-bold text-[#182433] mt-2">Aucun dossier en attente</p>
                <p className="text-xs text-[#627286] mt-1">Les preuves reçues sont traitées.</p>
              </div>
            ) : (
              displayList.map((delivery) => {
                const isSelected = delivery.id === currentDelivery?.id;
                return (
                  <button
                    key={delivery.id}
                    type="button"
                    onClick={() => setSelectedDeliveryId(delivery.id)}
                    className={`w-full grid grid-cols-[92px_1fr_74px] gap-3 px-4 py-3 text-left border-b border-[#EDF2F7] transition-colors ${
                      isSelected ? 'bg-[#E8F2FB] ring-1 ring-inset ring-[#BCD6ED]' : 'hover:bg-[#F7FAFC]'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold text-[#0057A8]">
                      {delivery.orderId}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-[#182433] truncate">
                        {delivery.customerName}
                      </span>
                      <span className="block text-[11px] text-[#627286] truncate">
                        {delivery.driverName} • {delivery.tourId}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[11px] font-mono font-semibold text-[#182433]">
                        {delivery.deliveryTime || delivery.timeSlot}
                      </span>
                      <span className="block mt-1">
                        <StatusBadge status={delivery.status} size="sm" showDot={false} />
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="bo-panel flex min-w-0 flex-col overflow-hidden">
          {currentDelivery ? (
            <>
              <div className="px-5 py-4 border-b border-[#DDE7F0] bg-[#FBFDFF] flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#182433]">{currentDelivery.orderId}</h2>
                    <StatusBadge status={currentDelivery.status} size="md" />
                  </div>
                  <p className="text-xs text-[#627286] mt-1">
                    {currentDelivery.customerName} • {currentDelivery.driverName} • {currentDelivery.tourId}
                  </p>
                </div>
                <div className="text-right text-xs text-[#627286]">
                  <span className="block font-bold text-[#182433]">{currentDelivery.vehicleId}</span>
                  <span>{currentDelivery.deliveryTime || currentDelivery.timeSlot}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-soft p-5">
                <div className="grid grid-cols-[minmax(0,1.35fr)_340px] gap-5">
                  <div className="space-y-5 min-w-0">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-[#182433]">Preuve de livraison</h3>
                        <span className="text-[11px] font-mono text-[#627286]">
                          {currentDelivery.proof?.timestamp || '10:42:00'}
                        </span>
                      </div>
                      <div className="rounded-lg border border-[#DDE7F0] bg-[#F7FAFC] overflow-hidden">
                        <div className="aspect-[16/9] bg-[#E8F2FB]">
                          <img
                            src={
                              currentDelivery.proof?.photoUrl ||
                              'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80'
                            }
                            alt="Preuve colis"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="px-3 py-2 flex items-center justify-between text-[11px] text-[#627286]">
                          <span>Photo horodatée • GPS vérifié</span>
                          <span className="font-mono">{currentDelivery.proof?.photoTimestamp || '10:38:14'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-[#DDE7F0] bg-white p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-[#182433]">Signature client</h3>
                          <span className="text-[11px] text-[#0057A8] font-semibold">
                            {currentDelivery.proof?.recipientName || currentDelivery.customerName}
                          </span>
                        </div>
                        <div className="mt-3 h-32 rounded-lg border border-dashed border-[#B8C7D8] bg-[#F7FAFC] flex items-center justify-center">
                          {currentDelivery.proof?.signatureData ? (
                            <img
                              src={currentDelivery.proof.signatureData}
                              alt="Signature client"
                              className="max-h-24 max-w-full object-contain"
                            />
                          ) : (
                            <svg className="w-48 h-20" viewBox="0 0 200 60">
                              <path
                                d="M 10 40 Q 30 10 50 40 T 90 25 T 130 45 T 170 30"
                                fill="none"
                                stroke="#0057A8"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                              <line x1="15" y1="48" x2="175" y2="45" stroke="#0057A8" strokeWidth="1.5" />
                            </svg>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-[#DDE7F0] bg-[#F7FAFC] p-4">
                        <h3 className="text-sm font-bold text-[#182433]">Commentaire chauffeur</h3>
                        <p className="mt-3 text-xs leading-relaxed text-[#4B5E72]">
                          {currentDelivery.proof?.driverNotes ||
                            'Livraison effectuée sans incident. Articles remis au réceptionnaire.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <aside className="space-y-4">
                    <div className="rounded-lg border border-[#DDE7F0] bg-[#F7FAFC] p-4">
                      <h3 className="text-sm font-bold text-[#182433] mb-3">Informations livraison</h3>
                      <dl className="space-y-2 text-xs">
                        <div>
                          <dt className="text-[#627286]">Adresse</dt>
                          <dd className="font-semibold text-[#182433]">
                            {currentDelivery.address}, {currentDelivery.district}
                          </dd>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <dt className="text-[#627286]">Créneau</dt>
                            <dd className="font-mono font-bold text-[#182433]">{currentDelivery.timeSlot}</dd>
                          </div>
                          <div>
                            <dt className="text-[#627286]">Arrivée</dt>
                            <dd className="font-mono font-bold text-[#182433]">{currentDelivery.arrivalTime || '-'}</dd>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <dt className="text-[#627286]">Livrée</dt>
                            <dd className="font-mono font-bold text-[#182433]">{currentDelivery.deliveryTime || '-'}</dd>
                          </div>
                          <div>
                            <dt className="text-[#627286]">GPS</dt>
                            <dd className="font-bold text-[#176B3A]">Disponible</dd>
                          </div>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-lg border border-[#DDE7F0] bg-white p-4">
                      <h3 className="text-sm font-bold text-[#182433] mb-3">Articles</h3>
                      <div className="space-y-2">
                        {currentDelivery.items.map((item) => (
                          <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg bg-[#F7FAFC] border border-[#EDF2F7] p-2.5 text-xs">
                            <span>
                              <span className="block font-bold text-[#182433]">{item.name}</span>
                              <span className="font-mono text-[10px] text-[#627286]">{item.ref}</span>
                            </span>
                            <span className="font-mono font-bold text-[#0057A8]">×{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#BCD6ED] bg-[#E8F2FB] p-4">
                      <h3 className="text-sm font-bold text-[#0057A8] mb-2">Audit GPS</h3>
                      <div className="space-y-1 text-[11px] text-[#4B5E72] font-mono">
                        <div>Lat: {currentDelivery.coordinates.lat}</div>
                        <div>Lng: {currentDelivery.coordinates.lng}</div>
                        <div>{currentDelivery.proof?.gpsAccuracy || '± 8 m (Conforme)'}</div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-[#DDE7F0] bg-white flex items-center justify-between shrink-0">
                <span className="text-xs text-[#627286]">
                  Action superviseur synchronisée avec l’application chauffeur.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="h-10 px-4 rounded-lg border border-[#F3B9B9] bg-white text-[#C93434] hover:bg-[#FFF4F4] text-xs font-bold"
                  >
                    Rejeter
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowValidateModal(true)}
                    className="h-10 px-5 rounded-lg bg-[#0057A8] hover:bg-[#004280] text-white text-xs font-bold shadow-sm"
                  >
                    Valider la livraison
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <span className="material-symbols-outlined text-[44px] text-[#7AA7D9]">fact_check</span>
              <p className="text-sm font-bold text-[#182433] mt-2">Aucune livraison sélectionnée</p>
              <p className="text-xs text-[#627286] mt-1">Sélectionnez un dossier e-POD dans la file.</p>
            </div>
          )}
        </section>
      </div>

      {showValidateModal && currentDelivery && (
        <div className="fixed inset-0 z-50 bg-[#102033]/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="border-b border-[#DDE7F0] pb-3">
              <h3 className="text-base font-bold text-[#182433]">Valider la livraison</h3>
              <p className="text-xs text-[#627286] mt-1">
                {currentDelivery.orderId} • {currentDelivery.customerName}
              </p>
            </div>
            <p className="text-xs text-[#4B5E72]">
              Le statut passera à <strong className="text-[#176B3A]">Validée</strong> et sera visible dans l’historique chauffeur.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowValidateModal(false)}
                className="px-4 py-2 rounded-lg border border-[#DDE7F0] text-xs font-semibold text-[#627286] hover:bg-[#F7FAFC]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleValidateConfirm}
                className="px-5 py-2 rounded-lg bg-[#0057A8] hover:bg-[#004280] text-white text-xs font-bold"
              >
                Valider définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && currentDelivery && (
        <div className="fixed inset-0 z-50 bg-[#102033]/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form onSubmit={handleRejectSubmit} className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="border-b border-[#DDE7F0] pb-3">
              <h3 className="text-base font-bold text-[#182433]">Rejeter la livraison</h3>
              <p className="text-xs text-[#627286] mt-1">
                {currentDelivery.orderId} • {currentDelivery.customerName}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#182433] block">Motif de rejet</label>
              <select
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#DDE7F0] bg-white text-xs font-semibold text-[#182433] focus:outline-none focus:border-[#1976D2]"
              >
                {REJECT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#182433] block">
                Commentaire {rejectReason === 'Autre' && <span className="text-[#7F1D1D]">*</span>}
              </label>
              <textarea
                rows={3}
                value={rejectComment}
                onChange={(event) => setRejectComment(event.target.value)}
                className="w-full p-3 rounded-lg border border-[#DDE7F0] bg-white text-xs text-[#182433] resize-none focus:outline-none focus:border-[#1976D2]"
                placeholder="Ajouter une précision pour le chauffeur..."
                required={rejectReason === 'Autre'}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-lg border border-[#DDE7F0] text-xs font-semibold text-[#627286] hover:bg-[#F7FAFC]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={rejectReason === 'Autre' && !rejectComment.trim()}
                className="px-5 py-2 rounded-lg bg-[#7F1D1D] hover:bg-[#991B1B] disabled:opacity-50 text-white text-xs font-bold"
              >
                Confirmer le rejet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
