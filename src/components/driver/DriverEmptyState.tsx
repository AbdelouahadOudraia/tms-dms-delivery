import React from 'react';
import { useTms } from '../../context/TmsContext';

export const DriverEmptyState = ({ message = 'Aucune tournée active ne vous est affectée.' }: { message?: string }) => {
  const { setDriverScreen } = useTms();
  return <div className="flex-1 bg-[#EEF3F8] p-5 pb-24 text-center">
    <div className="rounded-3xl border border-[#DDE7F0] bg-white p-5 text-sm text-[#5B6470]">
      <span className="material-symbols-outlined text-[32px] text-[#0057A8]">local_shipping</span>
      <p className="my-3">{message}</p>
      <button onClick={() => setDriverScreen('profile')} className="font-bold text-[#0057A8]">Mon profil</button>
    </div>
  </div>;
};
