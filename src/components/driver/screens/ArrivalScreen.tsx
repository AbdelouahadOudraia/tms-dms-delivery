import React from 'react';
import { useTms } from '../../../context/TmsContext';
import { MetricTile, MobilePrimaryButton, MobileScreenHeader } from '../MobileUI';

export const ArrivalScreen: React.FC = () => {
  const { deliveries, selectedDeliveryId, setDriverScreen } = useTms();
  const delivery = deliveries.find((d) => d.id === selectedDeliveryId) || deliveries[1];
  const arrivalTime = delivery.arrivalTime || '10:32';

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] overflow-hidden pb-20">
      <MobileScreenHeader
        title="Arrivée client"
        subtitle={delivery.orderId}
        onBack={() => setDriverScreen('detail')}
        right={<span className="rounded-full border border-[#BEE3CE] bg-[#EAF5EE] px-2 py-1 text-xs font-bold text-[#176B3A]">Arrivé</span>}
      />

      <div className="flex-1 overflow-y-auto scrollbar-soft p-4 space-y-4">
        <div className="rounded-3xl border border-[#BEE3CE] bg-[#EAF5EE] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#2E9E5B] shadow-sm">
              <span className="material-symbols-outlined text-[30px]">task_alt</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1D2229]">Arrivée enregistrée</h2>
              <p className="text-xs text-[#5B6470]">Horodatage GPS conforme • {arrivalTime}</p>
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470]">Destinataire</p>
          <h2 className="mt-1 text-lg font-bold text-[#1D2229]">{delivery.customerName}</h2>
          <p className="mt-1 text-xs text-[#5B6470]">{delivery.address}, {delivery.district} – {delivery.city}</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <MetricTile label="Arrivée" value={arrivalTime} tone="success" />
            <MetricTile label="Créneau" value={delivery.timeSlot} tone="warning" />
          </div>
        </section>

        <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6470]">Articles à décharger</h3>
          <div className="mt-3 space-y-2">
            {delivery.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-[#DDE7F0] bg-[#F7FAFC] p-3 text-xs">
                <span className="font-bold text-[#1D2229]">{item.name} ×{item.quantity}</span>
                <span className="font-mono text-[#5B6470]">{item.weight}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="shrink-0 border-t border-[#DDE7F0] bg-white p-4 space-y-2">
        <MobilePrimaryButton onClick={() => setDriverScreen('items')} icon="fact_check">Commencer le contrôle colis</MobilePrimaryButton>
        <button onClick={() => setDriverScreen('failed')} className="w-full py-1 text-center text-xs font-bold text-[#7F1D1D]">Client introuvable ou refus</button>
      </div>
    </div>
  );
};