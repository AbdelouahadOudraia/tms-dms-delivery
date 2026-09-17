import React from 'react';
import { ScreenType, DeliveryStop } from '../../types';

interface DashboardScreenProps {
  stops: DeliveryStop[];
  onNavigate: (screen: ScreenType) => void;
  onSelectStop?: (stop: DeliveryStop) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  stops,
  onNavigate,
  onSelectStop,
}) => {
  const deliveredCount = stops.filter((s) => s.status === 'delivered').length;
  const totalCount = stops.length;
  const remainingCount = totalCount - deliveredCount;
  const progressPercent = Math.round((deliveredCount / totalCount) * 100);

  const currentStop = stops.find((s) => s.status === 'current') || stops[1] || stops[0];

  return (
    <div className="flex-1 w-full max-w-lg mx-auto p-3 sm:p-4 space-y-3 sm:space-y-4 pb-44 animate-in fade-in duration-200">
      {/* Driver Context & Date Strip */}
      <section className="bg-[#ffffff] border border-[#c5c5d3] rounded p-3 sm:p-4 flex flex-col gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[12px] text-[#444651] block font-medium">Bonjour</span>
            <h2 className="text-[20px] text-[#131b2e] font-bold tracking-tight">
              Youssef El Amrani
            </h2>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#ECFDF5] border border-[#A7F3D0] rounded">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse"></span>
            <span className="text-[11px] font-bold text-[#059669]">En ligne</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#c5c5d3] text-[#444651]">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <span className="text-[12px] font-medium">Mardi 24 Février 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-code-tabular text-[#0057A8] font-bold px-1.5 py-0.5 bg-[#eaedff] rounded border border-[#c5c5d3]">
              TR-2026-058
            </span>
            <span className="text-[11px] font-code-tabular text-[#444651] px-1.5 py-0.5 bg-[#eaedff] rounded border border-[#c5c5d3]">
              12345-A-6
            </span>
          </div>
        </div>
      </section>

      {/* Synthetic Tour Card (KPIs, Progress & SLA) */}
      <section className="bg-[#ffffff] border border-[#c5c5d3] rounded p-3 sm:p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-[#131b2e] uppercase tracking-wider">
            SYNTHÈSE DE TOURNÉE
          </h3>
          <span className="text-[13px] font-code-tabular text-[#0057A8] font-bold">
            {progressPercent}% Effectué
          </span>
        </div>

        {/* Linear High-Contrast Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-[#e2e7ff] h-2.5 rounded overflow-hidden flex">
            <div
              className="bg-[#0057A8] h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
            <div
              className="bg-[#c5c5d3] h-full transition-all duration-500"
              style={{ width: `${100 - progressPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-[11px] text-[#444651] pt-0.5 font-code-tabular">
            <span>{deliveredCount < 10 ? `0${deliveredCount}` : deliveredCount} terminées</span>
            <span>{remainingCount < 10 ? `0${remainingCount}` : remainingCount} restantes</span>
            <span className="font-bold text-[#131b2e]">
              Total: {totalCount < 10 ? `0${totalCount}` : totalCount}
            </span>
          </div>
        </div>

        {/* Metrics Dual Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-[#f2f3ff] border border-[#c5c5d3] p-2.5 rounded">
            <span className="text-[11px] text-[#444651] block font-medium">
              Fin estimée (SLA)
            </span>
            <span className="text-[16px] font-code-tabular text-[#131b2e] font-bold">
              16:30
            </span>
          </div>
          <div className="bg-[#f2f3ff] border border-[#c5c5d3] p-2.5 rounded">
            <span className="text-[11px] text-[#444651] block font-medium">
              Rythme horaire
            </span>
            <span className="text-[16px] font-code-tabular text-[#059669] font-bold">
              À l'heure (+4m)
            </span>
          </div>
        </div>
      </section>

      {/* Priority Next Step Card (Logistics Pattern Stop Sequence) */}
      <section className="bg-[#ffffff] border border-[#c5c5d3] border-l-4 border-l-[#D97706] rounded p-3 sm:p-4 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] text-[11px] font-code-tabular px-2 py-0.5 rounded font-bold">
              {currentStop.sequence}
            </span>
            <span className="text-[11px] font-bold text-[#D97706] uppercase tracking-wide">
              PROCHAINE ÉTAPE PRIORITAIRE
            </span>
          </div>
          <span className="text-[11px] font-code-tabular text-[#444651] font-bold">
            {currentStop.timeSlot}
          </span>
        </div>

        <div>
          <h4 className="text-[16px] text-[#131b2e] font-bold">
            {currentStop.customerName}
          </h4>
          <p className="text-[13px] text-[#444651] flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-[16px] text-[#0057A8]">
              location_on
            </span>
            <span>{currentStop.address}</span>
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#c5c5d3]">
          <div className="flex items-center gap-1 text-[12px] font-code-tabular text-[#444651]">
            <span className="material-symbols-outlined text-[16px]">inventory_2</span>
            <span>
              {currentStop.items.length} Colis (
              {currentStop.items.reduce((acc, i) => acc + (parseFloat(i.weight) || 2.4), 0).toFixed(1)} kg)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              className="flex items-center gap-1 text-[13px] font-semibold text-[#0057A8] bg-[#eaedff] px-2.5 py-1 rounded border border-[#c5c5d3] active:opacity-80"
              href={`tel:${currentStop.phone}`}
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              <span>Appeler</span>
            </a>
            <button
              onClick={() => {
                if (onSelectStop) onSelectStop(currentStop);
                onNavigate('detail');
              }}
              className="flex items-center gap-1 text-[13px] font-bold text-white bg-[#0057A8] px-2.5 py-1 rounded border border-[#0057A8] hover:bg-[#004280] active:opacity-80"
            >
              <span>Détails</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* Route Schematic Map Card */}
      <section className="bg-[#ffffff] border border-[#c5c5d3] rounded p-3 sm:p-4 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#0057A8]">route</span>
            <h3 className="text-[13px] font-bold text-[#131b2e] uppercase">
              ITINÉRAIRE EN COURS
            </h3>
          </div>
          <span className="text-[11px] font-code-tabular text-[#444651]">
            Maârif → Ain Diab
          </span>
        </div>

        {/* Schematic Route Container */}
        <div
          onClick={() => onNavigate('map')}
          className="relative w-full h-44 bg-[#f2f3ff] border border-[#c5c5d3] rounded overflow-hidden cursor-pointer group"
          title="Cliquez pour agrandir la carte"
        >
          {/* Abstract Schematic Map Vector Elements */}
          <svg
            className="w-full h-full"
            viewBox="0 0 360 176"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Grid Lines representing street grid */}
            <line stroke="#dae2fd" strokeWidth="1" x1="0" x2="360" y1="40" y2="40"></line>
            <line stroke="#dae2fd" strokeWidth="1" x1="0" x2="360" y1="90" y2="90"></line>
            <line stroke="#dae2fd" strokeWidth="1" x1="0" x2="360" y1="140" y2="140"></line>
            <line stroke="#dae2fd" strokeWidth="1" x1="80" x2="80" y1="0" y2="176"></line>
            <line stroke="#dae2fd" strokeWidth="1" x1="180" x2="180" y1="0" y2="176"></line>
            <line stroke="#dae2fd" strokeWidth="1" x1="280" x2="280" y1="0" y2="176"></line>

            {/* Completed Route Segment */}
            <path
              d="M 35 130 L 75 90 L 115 105"
              stroke="#059669"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            ></path>
            {/* Active Segment to Stop 3 */}
            <path
              d="M 115 105 L 165 60"
              stroke="#004280"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            ></path>
            {/* Upcoming Remaining Segments */}
            <path
              d="M 165 60 L 210 50 L 255 85 L 295 70 L 330 35"
              stroke="#757682"
              strokeDasharray="2 2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            ></path>

            {/* Stop 1 (Done) */}
            <circle cx="35" cy="130" fill="#ECFDF5" r="7" stroke="#059669" strokeWidth="2"></circle>
            <text fill="#059669" fontFamily="Inter" fontSize="8" fontWeight="bold" textAnchor="middle" x="35" y="133">✓</text>

            {/* Stop 2 (Done or Active) */}
            <circle cx="75" cy="90" fill="#ECFDF5" r="7" stroke="#059669" strokeWidth="2"></circle>
            <text fill="#059669" fontFamily="Inter" fontSize="8" fontWeight="bold" textAnchor="middle" x="75" y="93">✓</text>

            {/* Current Stop 3 (Target Ain Diab) */}
            <circle cx="165" cy="60" fill="#004280" r="10" stroke="#ffffff" strokeWidth="2"></circle>
            <text fill="#ffffff" fontFamily="Inter" fontSize="9" fontWeight="bold" textAnchor="middle" x="165" y="64">02</text>

            {/* Stop 4 */}
            <circle cx="210" cy="50" fill="#dae2fd" r="6" stroke="#757682" strokeWidth="1.5"></circle>
            <text fill="#131b2e" fontFamily="Inter" fontSize="7" fontWeight="bold" textAnchor="middle" x="210" y="53">3</text>

            {/* Stop 5 */}
            <circle cx="255" cy="85" fill="#dae2fd" r="6" stroke="#757682" strokeWidth="1.5"></circle>
            <text fill="#131b2e" fontFamily="Inter" fontSize="7" fontWeight="bold" textAnchor="middle" x="255" y="88">4</text>

            {/* Stop 6 */}
            <circle cx="295" cy="70" fill="#dae2fd" r="6" stroke="#757682" strokeWidth="1.5"></circle>
            <text fill="#131b2e" fontFamily="Inter" fontSize="7" fontWeight="bold" textAnchor="middle" x="295" y="73">5</text>

            {/* Stop 7 & 8 */}
            <circle cx="330" cy="35" fill="#dae2fd" r="6" stroke="#757682" strokeWidth="1.5"></circle>
            <text fill="#131b2e" fontFamily="Inter" fontSize="7" fontWeight="bold" textAnchor="middle" x="330" y="38">8</text>
          </svg>

          {/* Location Badge Overlay */}
          <div className="absolute bottom-2 left-2 bg-[#ffffff]/90 border border-[#c5c5d3] px-2 py-1 rounded text-[11px] font-medium text-[#131b2e] flex items-center gap-1.5 backdrop-blur-xs shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#0057A8]"></span>
            <span>Casablanca — Trajet 4.2 km (9 min)</span>
          </div>

          <div className="absolute top-2 right-2 bg-white/80 rounded px-2 py-0.5 text-[10px] text-[#0057A8] font-bold border border-[#c5c5d3] group-hover:bg-[#eaedff]">
            Ouvrir la carte ↗
          </div>
        </div>
      </section>

      {/* Fixed Primary Action Button (Tactile 52px Min Target) */}
      <div className="fixed bottom-16 left-0 w-full z-40 px-3 sm:px-4 pb-2 bg-gradient-to-t from-[#faf8ff] via-[#faf8ff] to-transparent pt-3">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => onNavigate('list')}
            className="w-full h-[52px] bg-[#004280] hover:bg-[#0057A8] text-[#ffffff] font-bold text-[16px] rounded flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
          >
            <span>Continuer ma tournée</span>
            <span className="material-symbols-outlined text-[20px]">
              navigation
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
