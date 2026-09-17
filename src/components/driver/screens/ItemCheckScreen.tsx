import React, { useState } from 'react';
import { useTms } from '../../../context/TmsContext';
import { MobilePrimaryButton, MobileProgressBar, MobileScreenHeader } from '../MobileUI';

export const ItemCheckScreen: React.FC = () => {
  const { deliveries, selectedDeliveryId, verifyDeliveryItems, setDriverScreen } = useTms();
  const delivery = deliveries.find((d) => d.id === selectedDeliveryId) || deliveries[1];
  const [checkedIds, setCheckedIds] = useState<string[]>(delivery.items.map((it) => it.id));

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleContinue = () => {
    verifyDeliveryItems(delivery.id, checkedIds);
    setDriverScreen('pod');
  };

  const allChecked = checkedIds.length === delivery.items.length;
  const progress = delivery.items.length ? Math.round((checkedIds.length / delivery.items.length) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] overflow-hidden pb-20">
      <MobileScreenHeader
        title="Contrôle colis"
        subtitle={delivery.orderId}
        onBack={() => setDriverScreen('arrival')}
        right={<span className="rounded-full border border-[#BCD6ED] bg-[#E8F2FB] px-2 py-1 text-xs font-bold text-[#0057A8]">{checkedIds.length}/{delivery.items.length}</span>}
      />

      <div className="shrink-0 border-b border-[#DDE7F0] bg-white px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#1D2229]">Vérification physique</span>
          <span className="font-mono font-bold text-[#0057A8]">{progress}%</span>
        </div>
        <MobileProgressBar value={progress} className="mt-2" />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-soft p-4 space-y-3">
        <div className="rounded-2xl border border-[#DDE7F0] bg-white p-3 text-xs text-[#5B6470]">
          Cochez chaque colis après contrôle de la référence, de la quantité et de l’état visible.
        </div>

        {delivery.items.map((item) => {
          const isChecked = checkedIds.includes(item.id);
          return (
            <label
              key={item.id}
              className={`flex cursor-pointer items-start gap-3 rounded-3xl border p-3.5 shadow-sm transition-all ${
                isChecked ? 'border-[#BEE3CE] bg-[#EAF5EE]' : 'border-[#DDE7F0] bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleItem(item.id)}
                className="mt-1 h-5 w-5 rounded border-[#DDE7F0] accent-[#0057A8]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1D2229]">{item.name}</p>
                    <p className="mt-0.5 text-[11px] font-mono text-[#5B6470]">Réf. {item.ref} • {item.weight}</p>
                  </div>
                  <span className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-[#0057A8] ring-1 ring-[#DDE7F0]">×{item.quantity}</span>
                </div>
                {item.serialNumber && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[#BEE3CE] bg-white px-2 py-1 text-[11px] font-semibold text-[#176B3A]">
                    <span className="material-symbols-outlined text-[14px]">qr_code</span>
                    N° série {item.serialNumber}
                  </div>
                )}
              </div>
            </label>
          );
        })}

        <div className={`rounded-2xl border p-3 text-xs ${allChecked ? 'border-[#BEE3CE] bg-[#EAF5EE] text-[#176B3A]' : 'border-[#FBD9C3] bg-[#FEF4EC] text-[#B8561B]'}`}>
          {allChecked ? 'Tous les articles sont vérifiés. Vous pouvez passer à l’e-POD.' : 'Veuillez vérifier tous les articles avant la signature.'}
        </div>
      </div>

      <div className="shrink-0 border-t border-[#DDE7F0] bg-white p-4">
        <MobilePrimaryButton onClick={handleContinue} disabled={!allChecked} icon="arrow_forward">Passer à l’e-POD</MobilePrimaryButton>
      </div>
    </div>
  );
};