import React from 'react';
import { ScreenType } from '../types';

interface BottomNavBarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  incidentCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentScreen,
  onNavigate,
  incidentCount = 1,
}) => {
  const isTourneeActive =
    currentScreen === 'dashboard' ||
    currentScreen === 'list' ||
    currentScreen === 'detail' ||
    currentScreen === 'pod';
  const isCarteActive = currentScreen === 'map';
  const isIncidentsActive = currentScreen === 'incidents';
  const isProfilActive = currentScreen === 'profile';

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 h-16 bg-[#ffffff] border-t border-[#c5c5d3] shadow-md">
      {/* Tab 1: Tournée */}
      <button
        onClick={() => {
          if (currentScreen === 'detail' || currentScreen === 'pod') {
            onNavigate('list');
          } else {
            onNavigate('dashboard');
          }
        }}
        className={`flex flex-col items-center justify-center rounded px-3 py-1 min-h-[48px] min-w-[64px] active:scale-95 transition-transform duration-100 ${
          isTourneeActive
            ? 'bg-[#004280] text-[#ffffff]'
            : 'text-[#444651] hover:bg-[#eaedff]'
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">
          format_list_bulleted
        </span>
        <span className="text-[11px] font-semibold mt-0.5">Tournée</span>
      </button>

      {/* Tab 2: Carte */}
      <button
        onClick={() => onNavigate('map')}
        className={`flex flex-col items-center justify-center rounded px-3 py-1 min-h-[48px] min-w-[64px] active:scale-95 transition-transform duration-100 ${
          isCarteActive
            ? 'bg-[#004280] text-[#ffffff]'
            : 'text-[#444651] hover:bg-[#eaedff]'
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">map</span>
        <span className="text-[11px] font-semibold mt-0.5">Carte</span>
      </button>

      {/* Tab 3: Incidents */}
      <button
        onClick={() => onNavigate('incidents')}
        className={`relative flex flex-col items-center justify-center rounded px-3 py-1 min-h-[48px] min-w-[64px] active:scale-95 transition-transform duration-100 ${
          isIncidentsActive
            ? 'bg-[#004280] text-[#ffffff]'
            : 'text-[#444651] hover:bg-[#eaedff]'
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">
          report_problem
        </span>
        <span className="text-[11px] font-semibold mt-0.5">Incidents</span>
        {incidentCount > 0 && !isIncidentsActive && (
          <span className="absolute top-1 right-2 bg-[#ba1a1a] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {incidentCount}
          </span>
        )}
      </button>

      {/* Tab 4: Profil */}
      <button
        onClick={() => onNavigate('profile')}
        className={`flex flex-col items-center justify-center rounded px-3 py-1 min-h-[48px] min-w-[64px] active:scale-95 transition-transform duration-100 ${
          isProfilActive
            ? 'bg-[#004280] text-[#ffffff]'
            : 'text-[#444651] hover:bg-[#eaedff]'
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">
          account_circle
        </span>
        <span className="text-[11px] font-semibold mt-0.5">Profil</span>
      </button>
    </nav>
  );
};
