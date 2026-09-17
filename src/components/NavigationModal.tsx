import React from 'react';
import { DeliveryStop } from '../types';

interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  stop: DeliveryStop;
}

export const NavigationModal: React.FC<NavigationModalProps> = ({
  isOpen,
  onClose,
  stop,
}) => {
  if (!isOpen) return null;

  const wazeUrl = `https://waze.com/ul?ll=${stop.coordinates.lat},${stop.coordinates.lng}&navigate=yes`;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    stop.address
  )}`;

  return (
    <div className="fixed inset-0 bg-[#283044]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#c5c5d3] rounded-xl max-w-md w-full p-5 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-[#c5c5d3] pb-3">
          <div className="flex items-center gap-2 text-[#1976D2]">
            <span className="material-symbols-outlined text-[24px]">navigation</span>
            <h3 className="text-[16px] font-bold text-[#131b2e]">
              Guidage GPS — Stop {stop.sequence}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#444651] hover:bg-[#eaedff] rounded transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Route summary box */}
        <div className="bg-[#f2f3ff] border border-[#c5c5d3] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase font-bold text-[#444651]">
              Destination
            </span>
            <span className="text-[11px] font-bold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded">
              Trafic fluide
            </span>
          </div>
          <p className="text-[14px] font-bold text-[#131b2e] leading-snug">
            {stop.customerName}
          </p>
          <p className="text-[12px] text-[#444651] flex items-start gap-1">
            <span className="material-symbols-outlined text-[16px] shrink-0 text-[#1976D2]">
              pin_drop
            </span>
            <span>{stop.address}</span>
          </p>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#c5c5d3] text-center">
            <div className="bg-white p-1.5 rounded border border-[#c5c5d3]">
              <span className="text-[10px] text-[#444651] block uppercase">Distance</span>
              <span className="text-[14px] font-bold text-[#0057A8] font-code-tabular">4.2 km</span>
            </div>
            <div className="bg-white p-1.5 rounded border border-[#c5c5d3]">
              <span className="text-[10px] text-[#444651] block uppercase">Durée estimée</span>
              <span className="text-[14px] font-bold text-[#059669] font-code-tabular">9 min</span>
            </div>
            <div className="bg-white p-1.5 rounded border border-[#c5c5d3]">
              <span className="text-[10px] text-[#444651] block uppercase">ETA d’arrivée</span>
              <span className="text-[14px] font-bold text-[#0057A8] font-code-tabular">10:37</span>
            </div>
          </div>
        </div>

        {/* Turn by turn quick preview */}
        <div className="border border-[#c5c5d3] rounded-lg p-3 bg-white space-y-2">
          <span className="text-[11px] font-bold uppercase text-[#444651] block">
            Première instruction de conduite
          </span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#004280] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">turn_right</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#131b2e]">
                Dans 300m, tourner à droite
              </p>
              <p className="text-[12px] text-[#444651]">
                sur Boulevard de la Corniche (vers Ain Diab)
              </p>
            </div>
          </div>
        </div>

        {/* Buttons to launch real apps or proceed */}
        <div className="flex flex-col gap-2 pt-1">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] bg-[#0057A8] text-white rounded font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-[#004280] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            <span>Ouvrir dans Google Maps</span>
          </a>
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] bg-[#316bf3] text-white rounded font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">navigation</span>
            <span>Ouvrir dans Waze</span>
          </a>
          <button
            onClick={onClose}
            className="min-h-[40px] text-[12px] font-semibold text-[#444651] hover:text-[#131b2e] py-1"
          >
            Fermer l’aperçu
          </button>
        </div>
      </div>
    </div>
  );
};
