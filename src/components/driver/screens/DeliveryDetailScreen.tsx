import React, { useState } from 'react';
import { useTms } from '../../../context/TmsContext';
import { StatusBadge } from '../../common/StatusBadge';
import { MobilePrimaryButton, MobileScreenHeader, MobileSecondaryButton } from '../MobileUI';

type CallStep = 'closed' | 'calling' | 'no-answer' | 'refusal' | 'result';

export const DeliveryDetailScreen: React.FC = () => {
  const { deliveries, selectedDeliveryId, markArrived, setDriverScreen, recalculateRoute, setBackofficeTab } = useTms();
  const [callStep, setCallStep] = useState<CallStep>('closed');
  const [reason, setReason] = useState('Ne répond pas');
  const [comment, setComment] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationSummary, setOptimizationSummary] = useState<string | null>(null);

  const delivery = deliveries.find((d) => d.id === selectedDeliveryId) || deliveries[1];

  const handleArrived = () => {
    markArrived(delivery.id, '10:32');
    setDriverScreen('arrival');
  };

  const handleConfirmRecalculation = (type: 'Client injoignable' | 'Refus client') => {
    setIsOptimizing(true);
    const result = recalculateRoute(delivery.id, type, reason, comment);
    window.setTimeout(() => {
      setIsOptimizing(false);
      setOptimizationSummary(result ? `${result.reorderedStops} arrêts réordonnés • ETA ${result.newEta} • ${result.remainingDistance}` : 'Tournée recalculée');
      setCallStep('result');
    }, 800);
  };

  const closeSheet = () => {
    setCallStep('closed');
    setReason('Ne répond pas');
    setComment('');
    setOptimizationSummary(null);
    setIsOptimizing(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] overflow-hidden pb-20 relative">
      <MobileScreenHeader
        title="Détail livraison"
        subtitle={delivery.orderId}
        onBack={() => setDriverScreen('deliveries')}
        right={<StatusBadge status={delivery.status} size="sm" />}
      />

      <div className="flex-1 overflow-y-auto scrollbar-soft p-4 space-y-4">
        <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470]">Client destinataire</p>
              <h2 className="mt-1 text-lg font-bold text-[#1D2229]">{delivery.customerName}</h2>
              <p className="mt-1 text-xs text-[#5B6470]">{delivery.address}, {delivery.district}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8F2FB] text-[#0057A8]">
              <span className="material-symbols-outlined text-[22px]">person_pin_circle</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-[#DDE7F0] bg-[#F7FAFC] p-2.5">
              <span className="block text-[10px] text-[#5B6470]">Téléphone</span>
              <span className="font-mono font-bold text-[#1D2229]">{delivery.phone}</span>
            </div>
            <div className="rounded-xl border border-[#FBD9C3] bg-[#FEF4EC] p-2.5">
              <span className="block text-[10px] text-[#5B6470]">Créneau</span>
              <span className="font-mono font-bold text-[#E8722C]">{delivery.timeSlot}</span>
            </div>
          </div>

          {delivery.instructions && (
            <div className="mt-3 rounded-2xl border border-[#FBD9C3] bg-[#FEF4EC] p-3 text-xs text-[#B8561B]">
              <div className="flex gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#E8722C]">info</span>
                <div>
                  <span className="font-bold">Consignes de livraison</span>
                  <p className="mt-0.5 text-[#5B6470]">{delivery.instructions}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6470]">Articles à livrer</h3>
            <span className="rounded-full bg-[#E8F2FB] px-2 py-1 text-[10px] font-bold text-[#0057A8]">{delivery.items.length} colis</span>
          </div>

          <div className="mt-3 space-y-2">
            {delivery.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#DDE7F0] bg-[#F7FAFC] p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0057A8] ring-1 ring-[#DDE7F0]">
                    <span className="material-symbols-outlined text-[19px]">inventory_2</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#1D2229]">{item.name}</p>
                    <p className="text-[10px] font-mono text-[#5B6470]">{item.ref} • {item.weight}</p>
                  </div>
                </div>
                <span className="rounded-lg border border-[#DDE7F0] bg-white px-2 py-1 text-[10px] font-bold text-[#5B6470]">×{item.quantity}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="shrink-0 border-t border-[#DDE7F0] bg-white p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setCallStep('calling')} className="min-h-[44px] rounded-xl border border-[#DDE7F0] bg-white text-xs font-bold text-[#1D2229] flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#0057A8]">call</span>
            Appeler
          </button>
          <MobileSecondaryButton onClick={() => setDriverScreen('navigation')} icon="navigation">GPS</MobileSecondaryButton>
        </div>
        <MobilePrimaryButton onClick={handleArrived} icon="where_to_vote">Je suis arrivé</MobilePrimaryButton>
        <button onClick={() => setDriverScreen('failed')} className="w-full py-1.5 text-center text-xs font-bold text-[#7F1D1D]">Signaler un problème ou absence client</button>
      </div>

      {callStep !== 'closed' && (
        <div className="absolute inset-0 z-50 flex items-end bg-black/30">
          <div className="w-full rounded-t-[28px] bg-white p-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[#DDE7F0]" />

            {callStep === 'calling' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F2FB] text-lg font-bold text-[#0057A8]">{delivery.customerName.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <h3 className="text-base font-bold text-[#102A43]">Appel client</h3>
                    <p className="text-xs text-[#5B6470]">{delivery.customerName} • {delivery.phone}</p>
                    <p className="mt-1 text-[11px] font-bold text-[#0057A8]">Appel en cours…</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <button onClick={() => setCallStep('closed')} className="rounded-xl bg-[#EAF5EE] px-3 py-3 text-xs font-bold text-[#176B3A]">Client joint — continuer vers le client</button>
                  <button onClick={() => { setReason('Ne répond pas'); setCallStep('no-answer'); }} className="rounded-xl border border-[#DDE7F0] px-3 py-3 text-xs font-bold text-[#102A43]">Pas de réponse</button>
                  <button onClick={() => { setReason('Client refuse la commande'); setCallStep('refusal'); }} className="rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] px-3 py-3 text-xs font-bold text-[#7F1D1D]">Refus du client</button>
                </div>
                <button onClick={closeSheet} className="w-full text-xs font-bold text-[#5B6470]">Fermer</button>
              </div>
            )}

            {(callStep === 'no-answer' || callStep === 'refusal') && (
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-bold text-[#102A43]">{callStep === 'no-answer' ? 'Client injoignable' : 'Refus de livraison'}</h3>
                  <p className="text-xs text-[#5B6470]">Choisir un motif pour créer l’incident et recalculer la tournée.</p>
                </div>
                <select value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-xl border border-[#DDE7F0] bg-[#F7FAFC] px-3 py-3 text-xs font-bold text-[#102A43] outline-none">
                  {(callStep === 'no-answer'
                    ? ['Ne répond pas', 'Téléphone indisponible', 'Numéro incorrect', 'Autre']
                    : ['Client absent du domicile', 'Client refuse la commande', 'Créneau non adapté', 'Commande annulée par le client', 'Problème concernant la commande', 'Autre']
                  ).map((item) => <option key={item}>{item}</option>)}
                </select>
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Commentaire facultatif" className="h-20 w-full resize-none rounded-xl border border-[#DDE7F0] bg-[#F7FAFC] px-3 py-2 text-xs outline-none" />
                <button disabled={isOptimizing} onClick={() => handleConfirmRecalculation(callStep === 'no-answer' ? 'Client injoignable' : 'Refus client')} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0057A8] text-sm font-bold text-white disabled:opacity-70">
                  {isOptimizing ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <span className="material-symbols-outlined text-[18px]">alt_route</span>}
                  {isOptimizing ? 'Optimisation de la tournée…' : 'Confirmer et recalculer la tournée'}
                </button>
                <button onClick={() => setCallStep('calling')} className="w-full text-xs font-bold text-[#5B6470]">Retour</button>
              </div>
            )}

            {callStep === 'result' && (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF5EE] text-[#2E9E5B]">
                  <span className="material-symbols-outlined text-[30px]">check_circle</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#102A43]">Tournée recalculée</h3>
                  <p className="mt-1 text-xs text-[#5B6470]">{optimizationSummary}</p>
                  <p className="mt-1 text-xs font-semibold text-[#E8722C]">Incident créé dans le backoffice</p>
                </div>
                <button onClick={() => { closeSheet(); setDriverScreen('navigation'); }} className="h-12 w-full rounded-xl bg-[#0057A8] text-sm font-bold text-white">Voir le nouvel itinéraire</button>
                <button onClick={() => { setBackofficeTab('incidents'); closeSheet(); }} className="w-full text-xs font-bold text-[#0057A8]">Voir l’incident côté backoffice</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
