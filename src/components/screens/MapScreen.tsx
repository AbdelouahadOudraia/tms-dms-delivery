import React, { useState } from 'react';
import { DeliveryStop, ScreenType } from '../../types';

interface MapScreenProps {
  stops: DeliveryStop[];
  onNavigate: (screen: ScreenType) => void;
  onSelectStop: (stop: DeliveryStop) => void;
  onOpenNavigation: (stop: DeliveryStop) => void;
}

export const MapScreen: React.FC<MapScreenProps> = ({
  stops,
  onNavigate,
  onSelectStop,
  onOpenNavigation,
}) => {
  const [selectedStopId, setSelectedStopId] = useState<number>(2); // Stop 02 by default
  const selectedStop = stops.find((s) => s.id === selectedStopId) || stops[1];

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col pb-20 animate-in fade-in duration-200">
      {/* Top Map bar */}
      <div className="bg-[#ffffff] px-4 py-2.5 border-b border-[#c5c5d3] flex items-center justify-between shadow-xs sticky top-14 z-30">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0057A8]">map</span>
          <h2 className="text-[15px] font-bold text-[#131b2e]">
            Carte Itinéraire — Casablanca Centre & Ouest
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-ping"></span>
          <span>GPS Actif • 4.2 km (9 min)</span>
        </div>
      </div>

      {/* Map Interactive Canvas */}
      <div className="relative w-full h-[400px] sm:h-[480px] bg-[#f2f3ff] border-b border-[#c5c5d3] overflow-hidden">
        {/* Casablanca Vector Street Map Layout */}
        <svg
          className="w-full h-full"
          viewBox="0 0 600 420"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background water (Ocean Atlantique) */}
          <rect x="0" y="0" width="600" height="110" fill="#dceaff" />
          <text x="20" y="45" fill="#56b3f9" fontSize="14" fontWeight="bold" fontFamily="Inter">
            Océan Atlantique (Casablanca)
          </text>
          <text x="20" y="70" fill="#90a8ff" fontSize="11" fontFamily="Inter">
            Corniche Ain Diab — Boulevard de l'Océan
          </text>

          {/* Land area */}
          <rect x="0" y="110" width="600" height="310" fill="#faf8ff" />

          {/* Coastline wave border */}
          <path
            d="M 0 110 Q 150 130 300 110 T 600 120"
            stroke="#93ccff"
            strokeWidth="3"
            fill="none"
          />

          {/* City major road grid lines */}
          <line x1="0" y1="170" x2="600" y2="170" stroke="#dae2fd" strokeWidth="3" />
          <text x="480" y="165" fill="#757682" fontSize="9" fontFamily="Inter">
            Bd d'Anfa
          </text>

          <line x1="0" y1="250" x2="600" y2="250" stroke="#dae2fd" strokeWidth="4" />
          <text x="470" y="245" fill="#757682" fontSize="9" fontFamily="Inter">
            Bd Zerktouni
          </text>

          <line x1="0" y1="330" x2="600" y2="330" stroke="#dae2fd" strokeWidth="3" />
          <text x="470" y="325" fill="#757682" fontSize="9" fontFamily="Inter">
            Bd Ghandi
          </text>

          <line x1="140" y1="110" x2="140" y2="420" stroke="#dae2fd" strokeWidth="2.5" />
          <line x1="280" y1="110" x2="280" y2="420" stroke="#dae2fd" strokeWidth="3.5" />
          <line x1="420" y1="110" x2="420" y2="420" stroke="#dae2fd" strokeWidth="2.5" />

          {/* Route path connecting stops */}
          <path
            d="M 120 340 L 220 280 L 190 190 L 320 180 L 360 260 L 450 290 L 520 360"
            stroke="#004280"
            strokeWidth="4"
            strokeDasharray="6 4"
            fill="none"
          />
          {/* Completed portion in green */}
          <path
            d="M 120 340 L 220 280"
            stroke="#059669"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />

          {/* Live Delivery Truck indicator */}
          <g transform="translate(170, 230)">
            <circle cx="0" cy="0" r="16" fill="#1976D2" fillOpacity="0.2" className="animate-ping" />
            <circle cx="0" cy="0" r="12" fill="#0057A8" stroke="#ffffff" strokeWidth="2" />
            <text x="0" y="4" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
              🚛
            </text>
          </g>

          {/* Stop markers */}
          {stops.map((stop, index) => {
            const coords = [
              { x: 120, y: 340 }, // Stop 1 (Maarif)
              { x: 220, y: 280 }, // Stop 2 (Ain Diab)
              { x: 190, y: 190 }, // Stop 3 (Hay Hassani)
              { x: 320, y: 180 }, // Stop 4 (Ghandi)
              { x: 360, y: 260 }, // Stop 5 (Racine)
              { x: 420, y: 220 }, // Stop 6 (Bourgogne)
              { x: 450, y: 290 }, // Stop 7 (CIL)
              { x: 520, y: 360 }, // Stop 8 (Hub)
            ][index] || { x: 100 + index * 50, y: 200 };

            const isCurrent = stop.status === 'current';
            const isDelivered = stop.status === 'delivered';
            const isSelected = stop.id === selectedStopId;

            return (
              <g
                key={stop.id}
                transform={`translate(${coords.x}, ${coords.y})`}
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setSelectedStopId(stop.id)}
              >
                {/* Halo for selected */}
                {isSelected && (
                  <circle cx="0" cy="0" r="18" fill="#1976D2" fillOpacity="0.2" />
                )}

                {/* Marker body */}
                <circle
                  cx="0"
                  cy="0"
                  r={isCurrent ? 13 : 10}
                  fill={isDelivered ? '#ECFDF5' : isCurrent ? '#004280' : '#dae2fd'}
                  stroke={isDelivered ? '#059669' : isCurrent ? '#ffffff' : '#757682'}
                  strokeWidth={isCurrent ? 3 : 1.5}
                />
                <text
                  x="0"
                  y={isCurrent ? 4 : 3.5}
                  fill={isDelivered ? '#059669' : isCurrent ? '#ffffff' : '#131b2e'}
                  fontSize={isCurrent ? 10 : 8}
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="Inter"
                >
                  {isDelivered ? '✓' : stop.sequence}
                </text>

                {/* Stop label */}
                <rect
                  x="-35"
                  y="16"
                  width="70"
                  height="16"
                  rx="3"
                  fill="#ffffff"
                  stroke="#c5c5d3"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="27"
                  fill="#131b2e"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="Inter"
                >
                  {stop.customerName.split(' ')[0]}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Map Legend */}
        <div className="absolute top-3 left-3 bg-white/95 border border-[#c5c5d3] p-2 rounded shadow-xs text-[11px] space-y-1 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ECFDF5] border border-[#059669] flex items-center justify-center text-[8px] text-[#059669] font-bold">
              ✓
            </span>
            <span className="text-[#444651]">Livré</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#004280] text-white flex items-center justify-center text-[8px] font-bold">
              02
            </span>
            <span className="text-[#131b2e] font-bold">En cours</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#dae2fd] text-[#131b2e] flex items-center justify-center text-[8px]">
              •
            </span>
            <span className="text-[#444651]">À venir</span>
          </div>
        </div>

        {/* Recenter button */}
        <button
          onClick={() => setSelectedStopId(2)}
          className="absolute top-3 right-3 bg-white border border-[#c5c5d3] p-2 rounded shadow-sm text-[#0057A8] hover:bg-[#eaedff]"
          title="Recadrer sur l'étape courante"
        >
          <span className="material-symbols-outlined text-[20px]">my_location</span>
        </button>
      </div>

      {/* Selected Stop Quick Action Drawer */}
      <div className="p-4 bg-white border-b border-[#c5c5d3] space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#004280] text-white text-[11px] font-bold px-2 py-0.5 rounded font-code-tabular">
                STOP {selectedStop.sequence}
              </span>
              <h3 className="text-[16px] font-bold text-[#131b2e]">
                {selectedStop.customerName}
              </h3>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  selectedStop.status === 'delivered'
                    ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                    : selectedStop.status === 'current'
                    ? 'bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD]'
                    : 'bg-[#eaedff] text-[#444651] border border-[#c5c5d3]'
                }`}
              >
                {selectedStop.status === 'delivered'
                  ? 'Livrée'
                  : selectedStop.status === 'current'
                  ? 'Étape courante'
                  : 'À venir'}
              </span>
            </div>
            <p className="text-[13px] text-[#444651] mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-[#0057A8]">
                location_on
              </span>
              <span>{selectedStop.address}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-[#444651] block uppercase font-semibold">
              Créneau
            </span>
            <span className="text-[13px] font-bold text-[#0057A8] font-code-tabular">
              {selectedStop.timeSlot}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onOpenNavigation(selectedStop)}
            className="flex-1 min-h-[44px] bg-[#0057A8] hover:bg-[#004280] text-white font-bold text-[13px] rounded flex items-center justify-center gap-2 shadow"
          >
            <span className="material-symbols-outlined text-[18px]">navigation</span>
            <span>Lancer navigation GPS</span>
          </button>
          <button
            onClick={() => {
              onSelectStop(selectedStop);
              onNavigate('detail');
            }}
            className="flex-1 min-h-[44px] bg-white border border-[#c5c5d3] hover:bg-[#eaedff] text-[#131b2e] font-bold text-[13px] rounded flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            <span>Consulter la fiche stop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
