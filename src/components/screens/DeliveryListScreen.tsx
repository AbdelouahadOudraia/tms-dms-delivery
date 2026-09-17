import React from 'react';
import { DeliveryStop, ScreenType } from '../../types';

interface DeliveryListScreenProps {
  stops: DeliveryStop[];
  onNavigate: (screen: ScreenType) => void;
  onSelectStop: (stop: DeliveryStop) => void;
  onOpenNavigation: (stop: DeliveryStop) => void;
}

export const DeliveryListScreen: React.FC<DeliveryListScreenProps> = ({
  stops,
  onNavigate,
  onSelectStop,
  onOpenNavigation,
}) => {
  const deliveredCount = stops.filter((s) => s.status === 'delivered').length;
  const totalCount = stops.length;
  const progressPercent = Math.round((deliveredCount / totalCount) * 100);
  const currentStop = stops.find((s) => s.status === 'current') || stops[1] || stops[0];

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col pb-36 animate-in fade-in duration-200">
      {/* CONTROL / PROGRESSION PANEL */}
      <section className="bg-[#ffffff] px-4 pt-3 pb-3 border-b border-[#c5c5d3]/60 sticky top-14 z-30 shadow-xs">
        {/* Progress Indicator Strip */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#131b2e]">Progression</span>
            <span className="font-code-tabular text-[13px] text-[#1976D2] font-bold">
              {deliveredCount}/{totalCount} livrées
            </span>
          </div>
          <span className="text-[11px] text-[#444651] font-code-tabular">
            {progressPercent}% achevée
          </span>
        </div>
        <div className="w-full bg-[#eaedff] h-1.5 rounded-full overflow-hidden mb-3">
          <div
            className="bg-[#1976D2] h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* View Mode Switcher: Segmented Pickers */}
        <div className="flex bg-[#eaedff] p-0.5 rounded border border-[#c5c5d3]/60">
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 py-1 px-3 bg-[#ffffff] text-[#0057A8] rounded shadow-xs text-[13px] font-bold border border-[#c5c5d3]/40"
          >
            <span className="material-symbols-outlined text-[18px]">
              format_list_bulleted
            </span>
            <span>Liste</span>
            <span className="inline-flex items-center justify-center bg-[#0057A8] text-[#ffffff] text-[10px] font-bold rounded-full h-4 w-4 ml-1">
              {totalCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1 px-3 text-[#444651] hover:text-[#131b2e] text-[13px] font-medium transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            <span>Carte</span>
          </button>
        </div>
      </section>

      {/* MAIN OPERATIONAL STACK: SEQUENCED DISPATCH RUN */}
      <main className="flex-1 px-3 sm:px-4 pt-3 max-w-2xl mx-auto w-full space-y-3">
        {stops.map((stop) => {
          if (stop.status === 'delivered') {
            return (
              /* STOP TERMINÉE */
              <article
                key={stop.id}
                className="bg-[#ffffff] border border-[#c5c5d3]/60 rounded-lg p-3 sm:p-4 border-l-4 border-l-[#059669] shadow-xs relative opacity-95 transition-all hover:border-[#757682]"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-code-tabular text-[12px] bg-[#eaedff] text-[#444651] px-1.5 py-0.5 rounded font-bold">
                      {stop.sequence}
                    </span>
                    <h2 className="text-[16px] text-[#131b2e] font-bold">
                      {stop.customerName}
                    </h2>
                  </div>
                  {/* Status Badge: Livrée */}
                  <span className="inline-flex items-center gap-1 bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-[11px] font-bold px-2 py-0.5 rounded">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    <span>Livrée</span>
                  </span>
                </div>

                <div className="space-y-1 mt-1 pl-3 border-l border-[#eaedff]">
                  <p className="text-[13px] text-[#444651] flex items-start gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#757682] shrink-0 mt-0.5">
                      pin_drop
                    </span>
                    <span>{stop.address}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 font-code-tabular text-[#444651] text-[12px]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-[#757682]">
                        schedule
                      </span>
                      <span>Créneau : {stop.timeSlot}</span>
                    </span>
                    <span className="text-[#059669] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        done_all
                      </span>
                      <span>Réelle : {stop.actualDeliveryTime || '09:42'}</span>
                    </span>
                  </div>
                </div>
              </article>
            );
          }

          if (stop.status === 'current') {
            return (
              /* STOP ACTIVE : ÉTAPE COURANTE (Mise en avant avec bordure bleue) */
              <article
                key={stop.id}
                className="bg-[#ffffff] border-2 border-[#1976D2] rounded-lg p-3 sm:p-4 shadow-md relative border-l-4 border-l-[#1976D2] ring-2 ring-[#1976D2]/15"
              >
                {/* Active Callout Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-code-tabular text-[12px] bg-[#004280] text-[#ffffff] px-1.5 py-0.5 rounded font-bold">
                      {stop.sequence}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1976D2] block">
                        Étape courante
                      </span>
                      <h2 className="text-[20px] text-[#131b2e] font-bold tracking-tight">
                        {stop.customerName}
                      </h2>
                    </div>
                  </div>
                  {/* Status Badge: En cours */}
                  <span className="inline-flex items-center gap-1.5 bg-[#F0F9FF] border border-[#BAE6FD] text-[#0284C7] text-[13px] px-2.5 py-1 rounded-full font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#1976D2] animate-pulse"></span>
                    <span>En cours</span>
                  </span>
                </div>

                {/* Address & SLA Window */}
                <div className="mt-2 pl-1 space-y-2">
                  <p className="text-[15px] text-[#131b2e] font-semibold flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[#1976D2] shrink-0 mt-0.5">
                      location_on
                    </span>
                    <span>{stop.address}</span>
                  </p>
                  <div className="flex items-center gap-2 font-code-tabular text-[12px] text-[#444651] bg-[#f2f3ff] px-2.5 py-1.5 rounded border border-[#c5c5d3]/60">
                    <span className="material-symbols-outlined text-[16px] text-[#1976D2]">
                      alarm
                    </span>
                    <span className="font-bold text-[#131b2e]">Créneau garanti :</span>
                    <span>{stop.timeSlot}</span>
                  </div>

                  {/* Shipment Specifics */}
                  <div className="mt-2 pt-2 border-t border-[#eaedff] flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#444651] uppercase tracking-wider">
                        Commande
                      </span>
                      <span className="font-code-tabular text-[13px] text-[#0057A8] font-bold">
                        {stop.orderId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#131b2e] text-[12px] bg-[#faf8ff] p-2 rounded border border-[#c5c5d3]/50">
                      <span className="material-symbols-outlined text-[#1976D2] text-[16px]">
                        inventory_2
                      </span>
                      <span>
                        {stop.items.length} colis :{' '}
                        {stop.items.map((i, idx) => (
                          <strong key={i.id} className="font-semibold">
                            {i.name}
                            {idx < stop.items.length - 1 ? ', ' : ''}
                          </strong>
                        ))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tactile Field Action Controls (Min 48px tactile hit area) */}
                <div className="mt-3 pt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenNavigation(stop)}
                    className="min-h-[48px] bg-[#0057A8] text-[#ffffff] rounded font-semibold text-[13px] flex items-center justify-center gap-2 px-3 shadow hover:bg-slate-900 active:scale-[0.98] transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      navigation
                    </span>
                    <span className="text-left leading-tight">
                      Naviguer
                      <br />
                      <span className="text-[10px] font-normal opacity-80">
                        (Waze/Maps)
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectStop(stop);
                      onNavigate('detail');
                    }}
                    className="min-h-[48px] bg-[#ffffff] border border-[#c5c5d3] text-[#131b2e] rounded font-bold text-[13px] flex items-center justify-center gap-2 px-3 hover:bg-[#f2f3ff] active:scale-[0.98] transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#444651]">
                      info
                    </span>
                    <span>Détails</span>
                  </button>
                </div>
              </article>
            );
          }

          /* STOP À VENIR */
          return (
            <article
              key={stop.id}
              onClick={() => {
                onSelectStop(stop);
                onNavigate('detail');
              }}
              className="bg-[#ffffff] border border-[#c5c5d3]/50 rounded-lg p-3 sm:p-4 border-l-4 border-l-[#757682] shadow-xs hover:border-[#757682] transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-code-tabular text-[12px] bg-[#eaedff] text-[#444651] px-1.5 py-0.5 rounded font-bold">
                    {stop.sequence}
                  </span>
                  <h2 className="text-[16px] text-[#131b2e] font-bold group-hover:text-[#1976D2] transition-colors">
                    {stop.customerName}
                  </h2>
                </div>
                {/* Status Badge: À venir */}
                <span className="inline-flex items-center gap-1 bg-[#eaedff] border border-[#c5c5d3] text-[#444651] text-[11px] font-semibold px-2 py-0.5 rounded">
                  <span className="material-symbols-outlined text-[13px]">
                    more_horiz
                  </span>
                  <span>À venir</span>
                </span>
              </div>
              <div className="space-y-1 pl-3 border-l border-[#eaedff]">
                <p className="text-[13px] text-[#444651] flex items-start gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#757682] shrink-0 mt-0.5">
                    pin_drop
                  </span>
                  <span>{stop.address}</span>
                </p>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 font-code-tabular text-[#444651] text-[12px]">
                    <span className="material-symbols-outlined text-[15px] text-[#757682]">
                      schedule
                    </span>
                    <span>Créneau : {stop.timeSlot}</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#1976D2] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    Voir détails →
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </main>

      {/* FIXED FLOATING ACTION DOCK (ACTION BASSE FIXE) */}
      <aside className="fixed bottom-16 left-0 w-full px-3 sm:px-4 py-2 z-40 bg-gradient-to-t from-[#faf8ff] via-[#faf8ff]/95 to-transparent">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => {
              onSelectStop(currentStop);
              onNavigate('detail');
            }}
            className="w-full min-h-[50px] bg-[#0057A8] hover:bg-[#004280] text-[#ffffff] rounded shadow-lg border border-[#b6c4ff]/30 flex items-center justify-between px-4 py-2 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5 text-left">
              <span className="material-symbols-outlined text-[24px] text-[#ffffff]">
                play_circle
              </span>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#dce1ff] opacity-90">
                  Étape en cours d'exécution
                </div>
                <div className="text-[13px] font-bold">
                  Ouvrir l'étape en cours ({currentStop.customerName})
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-[20px]">
              arrow_forward
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
};
