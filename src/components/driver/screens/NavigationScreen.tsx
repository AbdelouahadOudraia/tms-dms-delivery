import React, { useState, useEffect } from 'react';
import { useTms } from '../../../context/TmsContext';

export const NavigationScreen: React.FC = () => {
  const {
    deliveries,
    selectedDeliveryId,
    markArrived,
    setDriverScreen,
  } = useTms();

  const delivery =
    deliveries.find((d) => d.id === selectedDeliveryId) || deliveries[1];
  const googleMapSrc = `https://www.google.com/maps?q=${delivery.coordinates.lat},${delivery.coordinates.lng}&z=15&output=embed`;

  const [simulatedDistance, setSimulatedDistance] = useState(2.4);
  const [speed, setSpeed] = useState(44);

  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedDistance((prev) => (prev > 0.3 ? +(prev - 0.1).toFixed(1) : 0.2));
      setSpeed((prev) => 40 + Math.floor(Math.sin(Date.now() / 1000) * 8));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const handleArrival = () => {
    markArrived(delivery.id, '10:32');
    setDriverScreen('arrival');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1D2229] text-white overflow-hidden relative select-none">
      {/* Top Turn Instruction Banner (Simulating GPS Head-up display) */}
      <div className="bg-[#0057A8] px-4 py-3.5 border-b border-[#0057A8] shadow-lg z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white text-[#0057A8] flex items-center justify-center shadow-md shrink-0">
            <span className="material-symbols-outlined text-[30px]">
              turn_right
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono">350 m</span>
              <span className="text-xs text-[#D6E9FA]">puis tout droit</span>
            </div>
            <p className="text-xs text-white font-medium truncate max-w-[200px]">
              Prendre à droite sur Bd de l’Océan
            </p>
          </div>
        </div>

        <button
          onClick={() => setDriverScreen('detail')}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs"
          title="Fermer le guidage"
        >
          ✕
        </button>
      </div>

      {/* Google Maps GPS View */}
      <div className="flex-1 relative bg-[#E8F2FB] overflow-hidden flex items-center justify-center">
        <iframe
          title={`Google Maps - ${delivery.customerName}`}
          src={googleMapSrc}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="absolute inset-0 bg-[#0057A8]/5 pointer-events-none" />

        {/* Current Vehicle Position Marker */}
        <div className="absolute top-[52%] left-[42%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-[#0057A8]/40 animate-ping absolute inset-0" />
            <div className="w-10 h-10 rounded-full bg-[#0057A8] border-2 border-white flex items-center justify-center text-white shadow-xl rotate-45">
              <span className="material-symbols-outlined text-[20px]">
                navigation
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-black/80 px-2 py-0.5 rounded-full mt-1.5 border border-white/20 whitespace-nowrap">
            {speed} km/h
          </span>
        </div>

        {/* Destination Flag Marker */}
        <div className="absolute top-[28%] left-[72%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-[#E8722C] border-2 border-white flex items-center justify-center text-white shadow-xl animate-bounce">
            <span className="material-symbols-outlined text-[16px]">
              flag
            </span>
          </div>
          <span className="text-[10px] font-bold bg-[#E8722C] text-white px-2 py-0.5 rounded-full mt-1 shadow-md whitespace-nowrap">
            Sara Alaoui
          </span>
        </div>

        {/* Floating Speedometer & GPS Accuracy badge */}
        <div className="absolute bottom-28 left-4 z-20 flex flex-col gap-2">
          <div className="bg-black/75 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-center">
            <span className="text-[9px] text-[#94a3b8] block uppercase">Vitesse</span>
            <span className="text-sm font-bold font-mono text-[#FFD200]">{speed}</span>
            <span className="text-[9px] text-slate-400 ml-0.5">km/h</span>
          </div>

          <div className="bg-black/75 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 text-[10px] text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD200]" />
            <span>GPS : ± 6m</span>
          </div>
        </div>

        {/* Recenter button */}
        <button
          onClick={() => {}}
          className="absolute bottom-28 right-4 z-20 w-10 h-10 rounded-full bg-white text-[#1D2229] shadow-lg flex items-center justify-center hover:bg-slate-100"
          title="Recentrer la carte"
        >
          <span className="material-symbols-outlined text-[20px]">
            my_location
          </span>
        </button>
      </div>

      {/* Bottom Route Summary & Actions Card */}
      <div className="bg-white text-[#1D2229] p-4 rounded-t-3xl shadow-2xl z-20 border-t border-[#E3E5E8] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-[#0057A8]">
                {simulatedDistance} km
              </span>
              <span className="text-xs text-[#5B6470] font-semibold">
                • 5 min restantes
              </span>
            </div>
            <span className="text-xs text-[#5B6470] block">
              Heure d'arrivée estimée : <strong className="text-[#1D2229]">10:31</strong>
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#5B6470] block">
              Créneau client
            </span>
            <span className="text-xs font-bold text-[#E8722C] font-mono">
              {delivery.timeSlot}
            </span>
          </div>
        </div>

        <div className="p-2.5 bg-[#F5F6F7] rounded-xl border border-[#E3E5E8] flex items-center gap-2 text-xs text-[#5B6470]">
          <span className="material-symbols-outlined text-[18px] text-[#0057A8]">
            home_pin
          </span>
          <span className="truncate text-[#1D2229] font-medium">
            {delivery.address}, {delivery.district}
          </span>
        </div>

        {/* Action Button: J'arrive sur place */}
        <button
          onClick={handleArrival}
          className="w-full h-12 bg-[#0057A8] hover:bg-[#004280] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-[20px]">
            where_to_vote
          </span>
          <span>Je suis arrivé sur place</span>
        </button>
      </div>
    </div>
  );
};
