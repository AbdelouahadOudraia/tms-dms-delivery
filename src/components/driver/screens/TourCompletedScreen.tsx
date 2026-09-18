import React, { useState } from 'react';
import { useTms } from '../../../context/TmsContext';
import { MetricTile, MobilePrimaryButton, MobileScreenHeader } from '../MobileUI';

export const TourCompletedScreen: React.FC = () => {
  const { tours, deliveries, setDriverScreen } = useTms();
  const currentTour = tours[0];
  const [isClosed, setIsClosed] = useState(false);

  const myDeliveries = deliveries.filter((d) => d.tourId === currentTour.id);
  const successCount = myDeliveries.filter((d) => d.status === 'Validée' || d.status === 'À valider').length;
  const failedCount = myDeliveries.filter((d) => d.status === 'Échec' || d.status === 'Rejetée').length;
  const rate = myDeliveries.length ? Math.round((successCount / myDeliveries.length) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] overflow-hidden pb-20">
      <MobileScreenHeader title="Clôture tournée" subtitle={`${currentTour.id} • ${currentTour.zone}`} onBack={() => setDriverScreen('home')} />

      {isClosed ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-8 border-[#EAF5EE] bg-white text-[#2E9E5B] shadow-lg">
            <span className="material-symbols-outlined text-[44px]">task_alt</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1D2229]">Tournée clôturée</h2>
            <p className="mt-2 text-sm text-[#5B6470]">Rapport final transmis au backoffice. Retour hub enregistré à 17:35.</p>
          </div>
          <MobilePrimaryButton onClick={() => setDriverScreen('home')} icon="dashboard">Retour accueil</MobilePrimaryButton>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-soft p-4 space-y-4">
          <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470]">Bilan de mission</p>
            <h2 className="mt-1 text-lg font-bold text-[#1D2229]">Résumé de la journée</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MetricTile label="Livrées" value={successCount} tone="success" />
              <MetricTile label="Échecs" value={failedCount} tone="danger" />
              <MetricTile label="Taux" value={`${rate}%`} tone="blue" />
            </div>
          </section>

          <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70 space-y-2 text-xs">
            {[
              ['Distance totale', '42.8 km'],
              ['Départ hub', currentTour.departureTime],
              ['Retour estimé', '17:35'],
              ['Véhicule', `${currentTour.vehicleId} (${currentTour.vehicleModel})`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-[#DDE7F0] bg-[#F7FAFC] p-3">
                <span className="text-[#5B6470]">{label}</span>
                <span className="font-mono font-bold text-[#1D2229]">{value}</span>
              </div>
            ))}
          </section>

          <MobilePrimaryButton onClick={() => setIsClosed(true)} icon="flag">Clôturer ma tournée</MobilePrimaryButton>
        </div>
      )}
    </div>
  );
};
