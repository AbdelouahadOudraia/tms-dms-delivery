import React, { useState } from 'react';
import { useTms } from '../../../context/TmsContext';
import { Delivery } from '../../../types';
import { DeliveryCompactCard, MobileProgressBar, MobileScreenHeader } from '../MobileUI';

export const DeliveriesScreen: React.FC = () => {
  const { currentTour, deliveries, setDriverScreen, setSelectedDeliveryId } = useTms();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const tourDeliveries = deliveries
    .filter((d) => d.tourId === currentTour.id)
    .sort((a, b) => a.sequence - b.sequence);

  const completedCount = tourDeliveries.filter((d) => d.status === 'Validée' || d.status === 'À valider').length;
  const failedCount = tourDeliveries.filter((d) => d.status === 'Échec' || d.status === 'Rejetée').length;
  const processedCount = completedCount + failedCount;
  const progressPercent = tourDeliveries.length ? Math.round((processedCount / tourDeliveries.length) * 100) : 0;

  const handleSelectDelivery = (delivery: Delivery) => {
    setSelectedDeliveryId(delivery.id);
    setDriverScreen('detail');
  };

  const activeDelivery =
    tourDeliveries.find((d) => d.status === 'Livraison en cours' || d.status === 'Arrivé' || d.status === 'En route') ||
    tourDeliveries.find((d) => d.status === 'Affectée') ||
    tourDeliveries[0];

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] overflow-hidden pb-20">
      <MobileScreenHeader
        title="Mes livraisons"
        subtitle={`${currentTour.id} • ${tourDeliveries.length} arrêts`}
        onBack={() => setDriverScreen('home')}
        right={
          <div className="flex rounded-xl border border-[#DDE7F0] bg-[#F7FAFC] p-0.5">
            {(['list', 'map'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold ${viewMode === mode ? 'bg-[#0057A8] text-white' : 'text-[#5B6470]'}`}
              >
                {mode === 'list' ? 'Liste' : 'Carte'}
              </button>
            ))}
          </div>
        }
      />

      <div className="shrink-0 border-b border-[#DDE7F0] bg-white px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#5B6470]">Arrêts traités</span>
          <span className="font-mono font-bold text-[#0057A8]">{processedCount}/{tourDeliveries.length}</span>
        </div>
        <MobileProgressBar value={progressPercent} className="mt-2" />
      </div>

      {viewMode === 'list' ? (
        <div className="flex-1 overflow-y-auto scrollbar-soft p-3 space-y-2.5">
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
      ) : (
        <div className="flex-1 relative overflow-hidden bg-[#E8F2FB]">
          <svg className="h-full w-full" viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="110" fill="#CDE4F9" />
            <text x="20" y="42" fill="#0057A8" fontSize="12" fontWeight="bold">Océan Atlantique</text>
            <path d="M0 115 Q200 135 400 112" stroke="#9DBBD4" strokeWidth="4" fill="none" />
            <line x1="0" y1="180" x2="400" y2="180" stroke="#C7D9E8" strokeWidth="3" />
            <line x1="0" y1="260" x2="400" y2="260" stroke="#C7D9E8" strokeWidth="3" />
            <line x1="0" y1="350" x2="400" y2="350" stroke="#C7D9E8" strokeWidth="3" />
            <line x1="120" y1="110" x2="120" y2="500" stroke="#C7D9E8" strokeWidth="2.5" />
            <line x1="250" y1="110" x2="250" y2="500" stroke="#C7D9E8" strokeWidth="3" />
            <path d="M 90 280 L 160 210 L 220 330 L 280 260 L 320 380" stroke="#0057A8" strokeWidth="3" strokeDasharray="6 4" fill="none" />
            {tourDeliveries.slice(0, 5).map((delivery, i) => {
              const positions = [{ x: 90, y: 280 }, { x: 160, y: 210 }, { x: 220, y: 330 }, { x: 280, y: 260 }, { x: 320, y: 380 }];
              const pos = positions[i] || { x: 100 + i * 40, y: 200 };
              const active = delivery.id === activeDelivery?.id;
              const done = delivery.status === 'Validée' || delivery.status === 'À valider';
              return (
                <g key={delivery.id} transform={`translate(${pos.x}, ${pos.y})`} className="cursor-pointer" onClick={() => handleSelectDelivery(delivery)}>
                  {active && <circle cx="0" cy="0" r="18" fill="#0057A8" fillOpacity="0.18" className="animate-ping" />}
                  <circle cx="0" cy="0" r={active ? 14 : 11} fill={done ? '#2E9E5B' : active ? '#0057A8' : '#FFFFFF'} stroke={active ? '#FFFFFF' : '#5B6470'} strokeWidth="2" />
                  <text x="0" y="4" fill={done || active ? '#FFFFFF' : '#1D2229'} fontSize="9" fontWeight="bold" textAnchor="middle">{done ? '✓' : delivery.sequence}</text>
                </g>
              );
            })}
          </svg>

          <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-[#DDE7F0] bg-white p-3 shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#0057A8]">Stop actif</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#1D2229]">{activeDelivery?.customerName || 'Prochaine livraison'}</p>
                <p className="text-xs text-[#5B6470]">Tournée {currentTour.id}</p>
              </div>
              <button
                onClick={() => activeDelivery && handleSelectDelivery(activeDelivery)}
                className="rounded-xl bg-[#0057A8] px-3 py-2 text-xs font-bold text-white"
              >
                Ouvrir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
