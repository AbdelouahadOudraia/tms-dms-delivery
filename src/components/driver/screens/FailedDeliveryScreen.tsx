import React, { useState } from 'react';
import { useTms } from '../../../context/TmsContext';
import { MobilePrimaryButton, MobileScreenHeader } from '../MobileUI';

const FAILURE_REASONS = [
  'Client absent',
  'Client refuse la commande',
  'Adresse incorrecte',
  'Produit endommagé',
  'Problème véhicule',
  'Impossible de contacter le client',
  'Autre',
];

export const FailedDeliveryScreen: React.FC = () => {
  const { deliveries, selectedDeliveryId, failDelivery, setDriverScreen } = useTms();
  const delivery = deliveries.find((d) => d.id === selectedDeliveryId) || deliveries[1];
  const [selectedReason, setSelectedReason] = useState('Client absent');
  const [comment, setComment] = useState('3 tentatives d’appel restées sans réponse. Sonnette muette.');
  const [photoAdded, setPhotoAdded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    failDelivery(
      delivery.id,
      selectedReason,
      comment,
      photoAdded ? 'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?auto=format&fit=crop&w=400&q=80' : undefined
    );
    setDriverScreen('deliveries');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] overflow-hidden pb-20">
      <MobileScreenHeader
        title="Livraison impossible"
        subtitle={delivery.orderId}
        onBack={() => setDriverScreen('detail')}
        right={<span className="rounded-full border border-[#FCA5A5] bg-[#FEE2E2] px-2 py-1 text-xs font-bold text-[#7F1D1D]">Échec</span>}
      />

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-soft p-4 space-y-4">
        <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470]">Destinataire concerné</p>
          <h2 className="mt-1 text-base font-bold text-[#1D2229]">{delivery.customerName}</h2>
          <p className="mt-1 text-xs text-[#5B6470]">{delivery.address}, {delivery.district}</p>
        </section>

        <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70 space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#1D2229]">Motif de non-livraison</label>
          {FAILURE_REASONS.map((reason) => (
            <label key={reason} className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3 text-xs transition-colors ${selectedReason === reason ? 'border-[#7F1D1D] bg-[#FEE2E2] font-bold text-[#7F1D1D]' : 'border-[#DDE7F0] bg-white text-[#1D2229]'}`}>
              <span>{reason}</span>
              <input type="radio" name="failure_reason" value={reason} checked={selectedReason === reason} onChange={() => setSelectedReason(reason)} className="h-4 w-4 accent-[#7F1D1D]" />
            </label>
          ))}
        </section>

        <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70 space-y-2">
          <label className="text-xs font-bold text-[#1D2229]">Commentaire explicatif</label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full resize-none rounded-xl border border-[#DDE7F0] bg-[#FBFDFF] p-3 text-xs text-[#1D2229] outline-none focus:border-[#7F1D1D]"
            required
          />
        </section>

        <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1D2229]">Photo justificative</span>
            <span className="text-[10px] text-[#5B6470]">Facultatif</span>
          </div>
          <button
            type="button"
            onClick={() => setPhotoAdded((prev) => !prev)}
            className={`min-h-[44px] w-full rounded-xl border text-xs font-bold ${photoAdded ? 'border-[#BEE3CE] bg-[#EAF5EE] text-[#176B3A]' : 'border-dashed border-[#8EA7BE] bg-white text-[#5B6470]'}`}
          >
            {photoAdded ? 'Photo jointe au constat' : 'Ajouter une photo de constat'}
          </button>
        </section>

        <MobilePrimaryButton type="submit" tone="danger" icon="report_problem">Confirmer l’échec</MobilePrimaryButton>
      </form>
    </div>
  );
};