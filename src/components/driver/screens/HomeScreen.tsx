import React from 'react';
import { useTms } from '../../../context/TmsContext';
import { MetricTile, MobilePrimaryButton, MobileProgressBar } from '../MobileUI';
import { StatusBadge } from '../../common/StatusBadge';

export const HomeScreen: React.FC = () => {
  const { currentTour, currentDriver, deliveries, setDriverScreen, setSelectedDeliveryId } = useTms();

  const tourDeliveries = deliveries.filter(
    (d) => d.tourId === currentTour.id && d.sequence <= currentTour.deliveriesCount
  );
  const total = tourDeliveries.length || currentTour.deliveriesCount;
  const completed = tourDeliveries.filter((d) => d.status === 'Validée' || d.status === 'À valider').length;
  const failed = tourDeliveries.filter((d) => d.status === 'Échec' || d.status === 'Rejetée').length;
  const remaining = Math.max(total - completed - failed, 0);
  const progressPercent = total ? Math.round((completed / total) * 100) : 0;

  const currentStop =
    tourDeliveries.find((d) => d.status === 'Livraison en cours' || d.status === 'Arrivé' || d.status === 'En route') ||
    tourDeliveries.find((d) => d.status === 'Affectée') ||
    tourDeliveries[0];

  const handleContinueTour = () => {
    if (currentStop) {
      setSelectedDeliveryId(currentStop.id);
      setDriverScreen('detail');
      return;
    }
    setDriverScreen('tour-overview');
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-soft bg-[#EEF3F8] pb-24">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#003B73] via-[#0057A8] to-[#0B5CAD] px-4 pb-5 pt-4 text-white shadow-md shadow-blue-950/15">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#D6E9FA]">Mercredi 16 Septembre 2026</p>
            <h1 className="mt-1 text-xl font-bold">Bonjour {currentDriver.name}</h1>
            <p className="mt-1 text-xs text-[#D6E9FA]">{currentTour.zone}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D6E9FA]">Tournée</p>
            <p className="font-mono text-xs font-bold text-white">{currentTour.id}</p>
          </div>
        </div>

        <div className="relative mt-5 rounded-2xl bg-white/12 p-3 ring-1 ring-white/15">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#D6E9FA]">Progression globale</span>
            <span className="font-mono font-bold text-white">{completed}/{total} livrées</span>
          </div>
          <MobileProgressBar value={progressPercent} className="mt-2 bg-white/20" />
          <div className="mt-3 flex items-center justify-between text-xs text-[#D6E9FA]">
            <span>{currentTour.vehicleId}</span>
            <span>Fin estimée {currentTour.estimatedEndTime}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <MetricTile label="Total" value={total} tone="neutral" />
          <MetricTile label="Livrées" value={completed} tone="success" />
          <MetricTile label="Restantes" value={remaining} tone="warning" />
        </div>

        {currentStop && (
          <div className="rounded-3xl border border-[#BCD6ED] bg-white p-4 shadow-sm shadow-slate-200/70">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0057A8]">Prochain arrêt • Stop #{currentStop.sequence}</p>
                <h2 className="mt-1 text-lg font-bold text-[#1D2229]">{currentStop.customerName}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-[#5B6470]">{currentStop.address}, {currentStop.district}</p>
              </div>
              <StatusBadge status={currentStop.status} size="sm" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-[#F7FAFC] p-2 border border-[#DDE7F0]">
                <span className="block text-[10px] text-[#5B6470]">Créneau</span>
                <span className="font-mono font-bold text-[#E8722C]">{currentStop.timeSlot}</span>
              </div>
              <div className="rounded-xl bg-[#F7FAFC] p-2 border border-[#DDE7F0]">
                <span className="block text-[10px] text-[#5B6470]">Articles</span>
                <span className="font-mono font-bold text-[#1D2229]">{currentStop.items.length}</span>
              </div>
            </div>
          </div>
        )}

        <MobilePrimaryButton onClick={handleContinueTour} icon="navigation">Démarrer / continuer la tournée</MobilePrimaryButton>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setDriverScreen('tour-overview')} className="rounded-2xl border border-[#DDE7F0] bg-white p-3 text-left shadow-sm">
            <span className="material-symbols-outlined text-[20px] text-[#0057A8]">alt_route</span>
            <span className="mt-1 block text-xs font-bold text-[#1D2229]">Vue tournée</span>
            <span className="text-[10px] text-[#5B6470]">Progression & arrêts</span>
          </button>
          <button onClick={() => setDriverScreen('deliveries')} className="rounded-2xl border border-[#DDE7F0] bg-white p-3 text-left shadow-sm">
            <span className="material-symbols-outlined text-[20px] text-[#0057A8]">format_list_bulleted</span>
            <span className="mt-1 block text-xs font-bold text-[#1D2229]">Livraisons</span>
            <span className="text-[10px] text-[#5B6470]">Liste compacte</span>
          </button>
        </div>
      </div>
    </div>
  );
};