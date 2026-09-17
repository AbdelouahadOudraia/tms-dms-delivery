import React, { useState } from 'react';
import { useTms } from '../../../context/TmsContext';
import { MobilePrimaryButton } from '../MobileUI';

export const LoginScreen: React.FC = () => {
  const { setDriverScreen } = useTms();
  const [identifiant, setIdentifiant] = useState('06 61 22 33 44');
  const [password, setPassword] = useState('••••••••');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDriverScreen('home');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] overflow-y-auto scrollbar-soft">
      <div className="bg-gradient-to-br from-[#003B73] via-[#0057A8] to-[#0B5CAD] px-6 pb-10 pt-8 text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#0057A8] shadow-md shadow-blue-950/20">
          <span className="material-symbols-outlined text-[28px]">local_shipping</span>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.20em] text-[#D6E9FA]">
            Application mobile
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">TMS / DMS Delivery</h1>
          <p className="mt-2 max-w-[270px] text-sm leading-relaxed text-[#E8F2FB]">
            Accès chauffeur pour gérer la tournée et transmettre l’e-POD.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-4 mt-4 rounded-[28px] border border-[#DDE7F0] bg-white p-4 shadow-lg shadow-slate-200/70 space-y-4"
      >
        <div>
          <h2 className="text-sm font-bold text-[#1D2229]">Connexion chauffeur</h2>
          <p className="mt-0.5 text-xs text-[#5B6470]">Session démo : Youssef El Amrani</p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#1D2229]">Identifiant / téléphone</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-3 text-[#5B6470] text-[19px]">person</span>
            <input
              type="text"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#DDE7F0] bg-[#FBFDFF] pl-10 pr-3 text-sm font-semibold text-[#1D2229] outline-none transition-colors focus:border-[#0057A8] focus:bg-white"
              placeholder="Ex: 06 61 22 33 44"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#1D2229]">Mot de passe</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-3 text-[#5B6470] text-[19px]">lock</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#DDE7F0] bg-[#FBFDFF] pl-10 pr-3 text-sm font-semibold text-[#1D2229] outline-none transition-colors focus:border-[#0057A8] focus:bg-white"
              placeholder="Mot de passe"
              required
            />
          </div>
        </div>

        <MobilePrimaryButton type="submit" icon="arrow_forward">Se connecter</MobilePrimaryButton>
      </form>

      <div className="mt-auto px-6 py-4 text-center text-[10px] text-[#5B6470]">
        TMS Delivery v2.4 • Casablanca Hub
      </div>
    </div>
  );
};