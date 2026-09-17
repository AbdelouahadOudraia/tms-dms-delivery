import React, { useState } from 'react';
import { DeliveryStop, ScreenType } from '../../types';

interface DeliveryDetailScreenProps {
  stop: DeliveryStop;
  onNavigate: (screen: ScreenType) => void;
  onOpenNavigation: (stop: DeliveryStop) => void;
  onOpenIncident: (stop: DeliveryStop) => void;
  onConfirmArrival: () => void;
  isArrived: boolean;
  arrivalTime: string;
}

export const DeliveryDetailScreen: React.FC<DeliveryDetailScreenProps> = ({
  stop,
  onNavigate,
  onOpenNavigation,
  onOpenIncident,
  onConfirmArrival,
  isArrived,
  arrivalTime,
}) => {
  return (
    <div className="flex-1 max-w-3xl w-full mx-auto flex flex-col justify-between animate-in fade-in duration-200">
      {/* Focused Task Sub-header Navigation */}
      <div className="bg-[#ffffff] border-b border-[#c5c5d3] px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-xs sticky top-14 z-30">
        <button
          onClick={() => onNavigate('list')}
          className="flex items-center gap-1 text-[#0057A8] text-[13px] font-bold py-1 px-2 rounded active:bg-[#eaedff] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Mes livraisons</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[16px] text-[#131b2e] font-bold tracking-tight">
            Livraison {stop.sequence} / 08
          </span>
          <span className="bg-[#dae2fd] text-[#0057A8] border border-[#c5c5d3] text-[11px] px-2 py-0.5 rounded font-bold uppercase">
            {stop.status === 'delivered' ? 'Livrée' : 'En cours'}
          </span>
        </div>
      </div>

      {/* Scrollable Operational Dispatch Body */}
      <main className="flex-1 w-full p-3 sm:p-4 flex flex-col gap-3 pb-32">
        {/* Primary Client & Order Details Bento-Card */}
        <section className="bg-[#ffffff] border border-[#c5c5d3] rounded p-3 sm:p-4 flex flex-col gap-3 relative overflow-hidden shadow-xs">
          {/* Left Border Visual Hierarchy Accent */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1976D2]"></div>

          {/* Top Row: Order ID & Time Window SLA */}
          <div className="flex items-start justify-between border-b border-[#c5c5d3] pb-2.5 pl-1">
            <div>
              <span className="text-[11px] text-[#444651] uppercase tracking-wider block font-bold">
                Identifiant Commande
              </span>
              <span className="font-code-tabular text-[18px] text-[#0057A8] font-bold">
                {stop.orderId}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#444651] uppercase tracking-wider block font-bold">
                Créneau Attendu
              </span>
              <div className="flex items-center gap-1 justify-end">
                <span className="material-symbols-outlined text-[16px] text-[#1976D2]">
                  schedule
                </span>
                <span className="font-code-tabular text-[13px] text-[#131b2e] font-bold">
                  {stop.timeSlot}
                </span>
              </div>
              <span className="text-[11px] text-[#444651] font-code-tabular">
                (Heure actuelle : 10:28)
              </span>
            </div>
          </div>

          {/* Customer Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#444651] uppercase font-semibold">
                Destinataire
              </span>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#0057A8] text-[20px]">
                  person
                </span>
                <span className="text-[16px] text-[#131b2e] font-bold">
                  {stop.customerName}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#444651] uppercase font-semibold">
                Téléphone
              </span>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#0057A8] text-[20px]">
                  call
                </span>
                <a
                  href={`tel:${stop.phone}`}
                  className="font-code-tabular text-[16px] text-[#1976D2] font-bold hover:underline"
                >
                  {stop.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Full Address Details */}
          <div className="bg-[#f2f3ff] border border-[#c5c5d3] rounded p-2.5 flex items-start gap-2.5 ml-1">
            <span className="material-symbols-outlined text-[#0057A8] text-[22px] mt-0.5">
              pin_drop
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#444651] uppercase font-bold">
                Adresse de livraison
              </span>
              <span className="text-[13px] text-[#131b2e] font-semibold leading-snug">
                {stop.address}
              </span>
            </div>
          </div>

          {/* Direct In-Cab Instructions */}
          <div className="bg-[#e2e7ff] border-l-4 border-[#0057A8] p-2.5 rounded-r flex items-start gap-2.5 ml-1">
            <span className="material-symbols-outlined text-[#0057A8] text-[20px] mt-0.5">
              info
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#0057A8] font-bold uppercase">
                Instructions d'accès
              </span>
              <p className="text-[13px] text-[#131b2e] leading-snug">
                {stop.instructions ||
                  "Sonner à l'interphone 14B, ascenseur disponible, 3ème étage"}
              </p>
            </div>
          </div>
        </section>

        {/* Cargo & Shipment Items Card */}
        <section className="bg-[#ffffff] border border-[#c5c5d3] rounded p-3 sm:p-4 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#c5c5d3]">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#0057A8]">
                inventory_2
              </span>
              <h2 className="text-[16px] text-[#131b2e] font-bold">
                Articles à livrer
              </h2>
            </div>
            <span className="bg-[#eaedff] text-[#444651] text-[11px] px-2 py-0.5 rounded font-bold">
              {stop.items.length} colis lourds
            </span>
          </div>

          <div className="flex flex-col divide-y divide-[#c5c5d3]/60">
            {stop.items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded bg-[#eaedff] flex items-center justify-center text-[#0057A8] shrink-0">
                    <span className="material-symbols-outlined text-[22px]">
                      {item.name.toLowerCase().includes('tv')
                        ? 'tv'
                        : item.name.toLowerCase().includes('frigo') ||
                          item.name.toLowerCase().includes('réfrigérateur')
                        ? 'kitchen'
                        : 'package_2'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#131b2e] font-bold">
                      {item.name}
                    </span>
                    <span className="font-code-tabular text-[12px] text-[#444651]">
                      Ref: {item.ref} • {item.weight}
                    </span>
                  </div>
                </div>
                <span className="font-code-tabular text-[16px] text-[#0057A8] font-bold bg-[#f2f3ff] px-2.5 py-1 rounded border border-[#c5c5d3]">
                  ×1
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Mid Actions (Call & GPS & Signal Problem) */}
        <section className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Action: Appeler le client */}
            <a
              className="min-h-[48px] bg-[#ffffff] border border-[#c5c5d3] hover:bg-[#eaedff] text-[#131b2e] flex items-center justify-center gap-2 rounded text-[13px] font-bold px-3 py-2 active:bg-[#d2d9f4] transition-colors shadow-xs"
              href={`tel:${stop.phone}`}
            >
              <span className="material-symbols-outlined text-[#0057A8] text-[20px]">
                call
              </span>
              <span>Appeler le client</span>
            </a>

            {/* Action: Ouvrir Navigation */}
            <button
              type="button"
              onClick={() => onOpenNavigation(stop)}
              className="min-h-[48px] bg-[#ffffff] border border-[#c5c5d3] hover:bg-[#eaedff] text-[#131b2e] flex items-center justify-center gap-2 rounded text-[13px] font-bold px-3 py-2 active:bg-[#d2d9f4] transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[#1976D2] text-[20px]">
                navigation
              </span>
              <span>Ouvrir Navigation</span>
            </button>
          </div>

          {/* Action: Signaler un problème */}
          <button
            type="button"
            onClick={() => onOpenIncident(stop)}
            className="min-h-[40px] flex items-center justify-center gap-1.5 text-[#ba1a1a] hover:bg-red-50 rounded py-1 px-3 text-[13px] font-semibold transition-colors w-full border border-transparent hover:border-[#c5c5d3]"
          >
            <span className="material-symbols-outlined text-[18px]">
              report_problem
            </span>
            <span>Signaler un problème</span>
          </button>
        </section>
      </main>

      {/* Persistent Critical Floating Dock for High-Tactile In-Cab Operation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#ffffff] border-t border-[#c5c5d3] p-3 sm:p-4 z-50 shadow-lg">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          {!isArrived ? (
            <button
              type="button"
              id="arrival-btn"
              onClick={onConfirmArrival}
              className="w-full min-h-[54px] bg-[#0057A8] hover:bg-[#004280] active:scale-[0.99] text-[#ffffff] transition-all duration-100 rounded-lg flex items-center justify-center gap-2 text-[16px] font-bold shadow-md"
            >
              <span className="material-symbols-outlined text-[24px]">
                check_circle
              </span>
              <span>Je suis arrivé chez le client</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between bg-[#ECFDF5] border border-[#A7F3D0] p-2.5 rounded-lg text-[#059669]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px]">
                    done_all
                  </span>
                  <span className="text-[13px] font-bold">
                    Arrivée confirmée à {arrivalTime || '10:32'}
                  </span>
                </div>
                <span className="font-code-tabular text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-[#A7F3D0]">
                  Horodatage certifié
                </span>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('pod')}
                className="w-full min-h-[50px] bg-[#316bf3] hover:bg-[#1976D2] active:scale-[0.99] text-[#ffffff] transition-all duration-100 rounded-lg flex items-center justify-center gap-2 text-[15px] font-bold shadow-md"
              >
                <span>Passer à la Preuve de livraison (e-POD)</span>
                <span className="material-symbols-outlined text-[20px]">
                  arrow_forward
                </span>
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};
