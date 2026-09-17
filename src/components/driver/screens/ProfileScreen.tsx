import React from 'react';
import { useTms } from '../../../context/TmsContext';
import { MobilePrimaryButton, MobileScreenHeader, MobileSecondaryButton } from '../MobileUI';

export const ProfileScreen: React.FC = () => {
  const { currentDriver, currentTour, setDriverScreen } = useTms();

  const initials = currentDriver.name.split(' ').map((n) => n[0]).join('');

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] overflow-hidden pb-20">
      <MobileScreenHeader title="Profil chauffeur" subtitle="Compte, véhicule et terminal" icon="account_circle" />

      <div className="flex-1 overflow-y-auto scrollbar-soft p-4 space-y-4">
        <section className="overflow-hidden rounded-3xl border border-[#DDE7F0] bg-white shadow-sm shadow-slate-200/70">
          <div className="bg-gradient-to-r from-[#003B73] via-[#0057A8] to-[#0B5CAD] p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-lg font-bold text-[#0057A8] shadow-md">{initials}</div>
              <div>
                <h2 className="text-lg font-bold">{currentDriver.name}</h2>
                <p className="text-xs text-[#D6E9FA]">{currentDriver.license}</p>
                <span className="mt-2 inline-flex rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-bold">{currentDriver.status}</span>
              </div>
            </div>
          </div>
          <div className="p-4 text-xs space-y-2">
            <div className="flex justify-between"><span className="text-[#5B6470]">Téléphone</span><span className="font-mono font-bold text-[#0057A8]">{currentDriver.phone}</span></div>
            <div className="flex justify-between"><span className="text-[#5B6470]">Tournée active</span><span className="font-mono font-bold text-[#1D2229]">{currentTour.id}</span></div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6470]">Véhicule & terminal</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl border border-[#DDE7F0] bg-[#F7FAFC] p-3"><span className="block text-[10px] text-[#5B6470]">Immatriculation</span><span className="font-mono font-bold text-[#0057A8]">{currentTour.vehicleId}</span></div>
            <div className="rounded-2xl border border-[#DDE7F0] bg-[#F7FAFC] p-3"><span className="block text-[10px] text-[#5B6470]">Modèle</span><span className="font-bold text-[#1D2229]">{currentTour.vehicleModel}</span></div>
            <div className="rounded-2xl border border-[#BEE3CE] bg-[#EAF5EE] p-3"><span className="block text-[10px] text-[#5B6470]">GPS</span><span className="font-bold text-[#176B3A]">±5m</span></div>
            <div className="rounded-2xl border border-[#BCD6ED] bg-[#E8F2FB] p-3"><span className="block text-[10px] text-[#5B6470]">Batterie</span><span className="font-mono font-bold text-[#0057A8]">89%</span></div>
          </div>
        </section>

        <MobilePrimaryButton onClick={() => setDriverScreen('completed')} icon="flag">Clôturer ma tournée</MobilePrimaryButton>
        <MobileSecondaryButton onClick={() => setDriverScreen('login')} icon="logout">Déconnexion</MobileSecondaryButton>
      </div>
    </div>
  );
};