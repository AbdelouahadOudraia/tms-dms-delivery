import React from 'react';
import { useTms } from '../../../context/TmsContext';
import { StatusBadge } from '../../common/StatusBadge';
import { MobilePrimaryButton, MobileSecondaryButton } from '../MobileUI';

export const SuccessScreen: React.FC = () => {
  const { deliveries, selectedDeliveryId, setDriverScreen, setSelectedDeliveryId, setActiveViewMode, setBackofficeTab } = useTms();
  const delivery = deliveries.find((d) => d.id === selectedDeliveryId) || deliveries[1];

  const handleNextDelivery = () => {
    const next = deliveries.find((d) => d.tourId === delivery.tourId && d.sequence === delivery.sequence + 1);
    if (next) {
      setSelectedDeliveryId(next.id);
      setDriverScreen('detail');
      return;
    }
    setDriverScreen('tour-overview');
  };

  const handleJumpToBackoffice = () => {
    setBackofficeTab('validation');
    setActiveViewMode('backoffice');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] p-5 text-center overflow-y-auto scrollbar-soft pb-24">
      <div className="my-auto space-y-4">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-8 border-[#EAF5EE] bg-white text-[#2E9E5B] shadow-lg">
          <span className="material-symbols-outlined text-[56px]">check_circle</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1D2229]">Livraison confirmée</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#5B6470]">
            L’e-POD est horodatée, géolocalisée et envoyée au backoffice pour validation.
          </p>
        </div>

        <div className="rounded-3xl border border-[#DDE7F0] bg-white p-4 text-left shadow-sm shadow-slate-200/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#5B6470]">Commande</span>
            <span className="font-mono text-xs font-bold text-[#0057A8]">{delivery.orderId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#5B6470]">Client</span>
            <span className="text-xs font-bold text-[#1D2229]">{delivery.customerName}</span>
          </div>
          <div className="flex items-center justify-between border-t border-[#EEF3F8] pt-3">
            <span className="text-xs text-[#5B6470]">Statut backoffice</span>
            <StatusBadge status="À valider" size="sm" />
          </div>
        </div>

        <button onClick={handleJumpToBackoffice} className="text-xs font-bold text-[#0057A8]">Voir dans le backoffice ↗</button>
      </div>

      <div className="space-y-2 pt-4">
        <MobilePrimaryButton onClick={handleNextDelivery} icon="arrow_forward">Livraison suivante</MobilePrimaryButton>
        <MobileSecondaryButton onClick={() => setDriverScreen('tour-overview')} icon="alt_route">Retour à ma tournée</MobileSecondaryButton>
      </div>
    </div>
  );
};