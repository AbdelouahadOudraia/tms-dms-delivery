import React from 'react';
import { useTms } from '../../../context/TmsContext';
import { Delivery } from '../../../types';
import { DeliveryCompactCard, MetricTile, MobileProgressBar, MobileScreenHeader } from '../MobileUI';
import { StatusBadge } from '../../common/StatusBadge';

export const TourOverviewScreen: React.FC = () => {
  const { currentTour, currentDriver, deliveries, setDriverScreen, setSelectedDeliveryId } = useTms();

  const tourDeliveries = deliveries
    .filter((d) => d.tourId === currentTour.id && d.sequence <= currentTour.deliveriesCount)
    .sort((a, b) => a.sequence - b.sequence);

  const completedCount = tourDeliveries.filter((d) => d.status === 'Validée' || d.status === 'À valider').length;
  const failedCount = tourDeliveries.filter((d) => d.status === 'Échec' || d.status === 'Rejetée').length;
  const progressPercent = tourDeliveries.length ? Math.round((completedCount / tourDeliveries.length) * 100) : 0;

  const handleSelectDelivery = (delivery: Delivery) => {
    setSelectedDeliveryId(delivery.id);
    setDriverScreen('detail');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] overflow-hidden pb-20">
      <MobileScreenHeader
        title="Ma tournée"
        subtitle={`${currentTour.id} • ${currentTour.zone}`}
        onBack={() => setDriverScreen('home')}
        right={<StatusBadge status={currentTour.status} size="sm" />}
      />

      <div className="flex-1 overflow-y-auto scrollbar-soft p-4 space-y-4">
        <div className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470]">Résumé tournée</p>
              <h2 className="mt-1 text-base font-bold text-[#1D2229]">{currentDriver.name}</h2>
              <p className="text-xs text-[#5B6470]">{currentTour.vehicleId} • {currentTour.vehicleModel}</p>
            </div>
            <div className="rounded-2xl bg-[#102A43] px-3 py-2 text-right text-white">
              <p className="text-[10px] text-[#D6E9FA]">Progression</p>
              <p className="font-mono text-lg font-bold">{progressPercent}%</p>
            </div>
          </div>

          <MobileProgressBar value={progressPercent} className="mt-4" />

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MetricTile label="Arrêts" value={tourDeliveries.length} tone="neutral" />
            <MetricTile label="Livrées" value={completedCount} tone="success" />
            <MetricTile label="Échecs" value={failedCount} tone="danger" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-[#DDE7F0] bg-[#F7FAFC] p-2">
              <span className="block text-[10px] text-[#5B6470]">Départ hub</span>
              <span className="font-mono font-bold text-[#1D2229]">{currentTour.departureTime}</span>
            </div>
            <div className="rounded-xl border border-[#DDE7F0] bg-[#F7FAFC] p-2">
              <span className="block text-[10px] text-[#5B6470]">Fin estimée</span>
              <span className="font-mono font-bold text-[#1D2229]">{currentTour.estimatedEndTime}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#FBD9C3] bg-[#FEF4EC] p-3 text-xs text-[#B8561B] flex gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#E8722C]">pin_drop</span>
          <div>
            <span className="font-bold">Secteur géographique</span>
            <p className="mt-0.5 text-[#5B6470]">{currentTour.zone}</p>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D2229]">Ordre de passage</h3>
            <span className="text-[11px] text-[#5B6470]">{tourDeliveries.length} arrêts</span>
          </div>

          {tourDeliveries.map((delivery) => {
            const active = delivery.status === 'Livraison en cours' || delivery.status === 'Arrivé' || delivery.status === 'En route';
            return (
              <DeliveryCompactCard
                key={delivery.id}
                delivery={delivery}
                active={active}
                onClick={() => handleSelectDelivery(delivery)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};