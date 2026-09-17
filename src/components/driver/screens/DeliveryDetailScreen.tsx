import React from 'react';
import { useTms } from '../../../context/TmsContext';
import { StatusBadge } from '../../common/StatusBadge';
import { MobilePrimaryButton, MobileScreenHeader, MobileSecondaryButton } from '../MobileUI';

export const DeliveryDetailScreen: React.FC = () => {
  const { deliveries, selectedDeliveryId, markArrived, setDriverScreen } = useTms();

  const delivery = deliveries.find((d) => d.id === selectedDeliveryId) || deliveries[1];

  const handleArrived = () => {
    markArrived(delivery.id, '10:32');
    setDriverScreen('arrival');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] overflow-hidden pb-20">
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
          <a href={`tel:${delivery.phone.replace(/\s+/g, '')}`} className="min-h-[44px] rounded-xl border border-[#DDE7F0] bg-white text-xs font-bold text-[#1D2229] flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#0057A8]">call</span>
            Appeler
          </a>
          <MobileSecondaryButton onClick={() => setDriverScreen('navigation')} icon="navigation">GPS</MobileSecondaryButton>
        </div>
        <MobilePrimaryButton onClick={handleArrived} icon="where_to_vote">Je suis arrivé</MobilePrimaryButton>
        <button onClick={() => setDriverScreen('failed')} className="w-full py-1.5 text-center text-xs font-bold text-[#7F1D1D]">
          Signaler un problème ou absence client
        </button>
      </div>
    </div>
  );
};