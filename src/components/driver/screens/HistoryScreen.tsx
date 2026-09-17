import React, { useState } from 'react';
import { useTms } from '../../../context/TmsContext';
import { StatusBadge } from '../../common/StatusBadge';
import { DeliveryCompactCard, MobileScreenHeader } from '../MobileUI';

export const HistoryScreen: React.FC = () => {
  const { deliveries, setSelectedDeliveryId, setDriverScreen } = useTms();
  const [filter, setFilter] = useState<'Tous' | 'Validée' | 'À valider' | 'Échec' | 'Rejetée'>('Tous');

  const historyDeliveries = deliveries.filter((d) => {
    const closed = d.status === 'Validée' || d.status === 'À valider' || d.status === 'Échec' || d.status === 'Rejetée';
    if (!closed) return false;
    return filter === 'Tous' || d.status === filter;
  });

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] overflow-hidden pb-20">
      <MobileScreenHeader title="Historique" subtitle="Livraisons clôturées et e-POD" icon="history" />

      <div className="shrink-0 border-b border-[#DDE7F0] bg-white px-4 py-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-soft pb-0.5">
          {(['Tous', 'Validée', 'À valider', 'Échec', 'Rejetée'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${filter === tab ? 'bg-[#0057A8] text-white' : 'bg-[#F7FAFC] text-[#5B6470]'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-soft p-3 space-y-2.5">
        {historyDeliveries.length === 0 ? (
          <div className="rounded-3xl border border-[#DDE7F0] bg-white p-8 text-center text-[#5B6470]">
            <span className="material-symbols-outlined text-[38px]">inbox</span>
            <p className="mt-1 text-sm font-bold">Aucune livraison trouvée</p>
          </div>
        ) : (
          historyDeliveries.map((delivery) => (
            <div key={delivery.id} className="space-y-2">
              <DeliveryCompactCard
                delivery={delivery}
                onClick={() => {
                  setSelectedDeliveryId(delivery.id);
                  setDriverScreen('detail');
                }}
              />
              {(delivery.proof || delivery.failureReason) && (
                <div className="-mt-1 rounded-2xl border border-[#DDE7F0] bg-white px-3 py-2 text-[11px] text-[#5B6470]">
                  {delivery.proof ? (
                    <span className="flex items-center justify-between gap-2">
                      <span>e-POD avec signature & photo</span>
                      <StatusBadge status="À valider" size="sm" />
                    </span>
                  ) : (
                    <span className="text-[#7F1D1D]">Motif : {delivery.failureReason}</span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};