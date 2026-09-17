import React from 'react';
import { ScreenType } from '../types';

interface TopAppBarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  deliveredCount: number;
  totalCount: number;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  currentScreen,
  onNavigate,
  deliveredCount,
  totalCount,
}) => {
  return (
    <header className="bg-[#faf8ff] border-b border-[#c5c5d3] flex justify-between items-center w-full px-3 sm:px-4 h-14 sticky top-0 z-40 shadow-xs">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-1.5 text-[#0057A8] hover:opacity-80 transition-opacity"
          title="Retour à la synthèse"
        >
          <span className="material-symbols-outlined text-[20px] text-[#0057A8]">
            local_shipping
          </span>
          <span className="text-[16px] font-bold text-[#0057A8] tracking-tight">
            TR-2026-058 ({deliveredCount}/{totalCount})
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* En ligne status badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded">
          <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse"></span>
          <span className="text-[11px] font-semibold text-[#059669] hidden xs:inline">En ligne</span>
        </div>

        {/* Cloud sync */}
        <div className="flex items-center text-[#0057A8] ml-1">
          <span className="material-symbols-outlined text-[20px]">
            cloud_done
          </span>
        </div>

        {/* Quick Screen Switcher Drawer/Pill for user previewing all screens */}
        <div className="relative group ml-1">
          <select
            value={currentScreen}
            onChange={(e) => onNavigate(e.target.value as ScreenType)}
            className="text-[11px] font-bold bg-[#eaedff] text-[#0057A8] border border-[#c5c5d3] rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1976D2]"
            title="Sélecteur d'écran de démo"
          >
            <option value="dashboard">Écran 1: Synthèse</option>
            <option value="list">Écran 2: Liste livraisons</option>
            <option value="detail">Écran 3: Détail stop 02</option>
            <option value="pod">Écran 4: Preuve e-POD</option>
            <option value="map">Vue Carte</option>
            <option value="incidents">Vue Incidents</option>
            <option value="profile">Vue Profil</option>
          </select>
        </div>
      </div>
    </header>
  );
};
