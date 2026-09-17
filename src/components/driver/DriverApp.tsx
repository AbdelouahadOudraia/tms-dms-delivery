import React from 'react';
import { useTms } from '../../context/TmsContext';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { DeliveriesScreen } from './screens/DeliveriesScreen';
import { TourOverviewScreen } from './screens/TourOverviewScreen';
import { NavigationScreen } from './screens/NavigationScreen';
import { DeliveryDetailScreen } from './screens/DeliveryDetailScreen';
import { ArrivalScreen } from './screens/ArrivalScreen';
import { ItemCheckScreen } from './screens/ItemCheckScreen';
import { PODScreen } from './screens/PODScreen';
import { SuccessScreen } from './screens/SuccessScreen';
import { FailedDeliveryScreen } from './screens/FailedDeliveryScreen';
import { TourCompletedScreen } from './screens/TourCompletedScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';

const demoScreens = [
  { id: 'login', label: 'Connexion', icon: 'login' },
  { id: 'home', label: 'Accueil', icon: 'dashboard' },
  { id: 'tour-overview', label: 'Tournée', icon: 'alt_route' },
  { id: 'deliveries', label: 'Livraisons', icon: 'local_shipping' },
  { id: 'detail', label: 'Détail', icon: 'assignment' },
  { id: 'navigation', label: 'GPS', icon: 'near_me' },
  { id: 'arrival', label: 'Arrivée', icon: 'pin_drop' },
  { id: 'items', label: 'Articles', icon: 'inventory_2' },
  { id: 'pod', label: 'e-POD', icon: 'draw' },
  { id: 'success', label: 'Succès', icon: 'check_circle' },
  { id: 'failed', label: 'Échec', icon: 'report' },
  { id: 'history', label: 'Historique', icon: 'history' },
  { id: 'completed', label: 'Fin tournée', icon: 'flag' },
  { id: 'profile', label: 'Profil', icon: 'account_circle' },
];

export const DriverApp: React.FC = () => {
  const { driverScreen, setDriverScreen } = useTms();

  const isFullscreenFlow =
    driverScreen === 'login' ||
    driverScreen === 'arrival' ||
    driverScreen === 'items' ||
    driverScreen === 'pod' ||
    driverScreen === 'success' ||
    driverScreen === 'failed' ||
    driverScreen === 'navigation' ||
    driverScreen === 'completed';

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-[#DCEBFA] via-[#EEF3F8] to-[#F7FAFC] p-2 sm:p-4 items-center justify-center select-none overflow-hidden">
      {/* Device frame simulating modern Android handset */}
      <div className="w-full max-w-[390px] flex-1 min-h-0 max-h-[780px] bg-[#111827] rounded-[42px] p-3 shadow-lg shadow-[#7998B5]/25 ring-1 ring-white flex flex-col relative overflow-hidden">
        {/* Android Camera Hole Punch & Speaker */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 pointer-events-none">
          <div className="w-3.5 h-3.5 rounded-full bg-black ring-2 ring-slate-800" />
        </div>

        {/* Screen Bezel Inside */}
        <div className="flex-1 bg-white rounded-[32px] overflow-hidden flex flex-col relative">
          {/* Android Status Bar */}
          <div className="h-7 bg-white px-5 shrink-0 flex items-center justify-between text-[11px] font-semibold text-[#1D2229] select-none z-30 border-b border-slate-100">
            <span className="font-mono">10:42</span>
            <div className="flex items-center gap-2 text-[#5B6470]">
              <span className="material-symbols-outlined text-[14px]">wifi</span>
              <span className="material-symbols-outlined text-[14px]">signal_cellular_alt</span>
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-mono">89%</span>
                <span className="material-symbols-outlined text-[14px] text-[#0057A8]">
                  battery_charging_full
                </span>
              </div>
            </div>
          </div>

          {/* Active Screen View */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {driverScreen === 'login' && <LoginScreen />}
            {driverScreen === 'home' && <HomeScreen />}
            {driverScreen === 'tour-overview' && <TourOverviewScreen />}
            {driverScreen === 'deliveries' && <DeliveriesScreen />}
            {driverScreen === 'detail' && <DeliveryDetailScreen />}
            {driverScreen === 'navigation' && <NavigationScreen />}
            {driverScreen === 'arrival' && <ArrivalScreen />}
            {driverScreen === 'items' && <ItemCheckScreen />}
            {driverScreen === 'pod' && <PODScreen />}
            {driverScreen === 'success' && <SuccessScreen />}
            {driverScreen === 'failed' && <FailedDeliveryScreen />}
            {driverScreen === 'completed' && <TourCompletedScreen />}
            {driverScreen === 'history' && <HistoryScreen />}
            {driverScreen === 'profile' && <ProfileScreen />}
          </div>

          {/* Android Bottom Navigation Bar (Tabs) */}
          {!isFullscreenFlow && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E3E5E8] px-2 flex items-center justify-around z-40 shadow-sm">
              <button
                onClick={() => setDriverScreen('home')}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${
                  driverScreen === 'home'
                    ? 'text-[#0057A8] font-bold'
                    : 'text-[#5B6470] hover:text-[#1D2229]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  dashboard
                </span>
                <span className="text-[10px]">Accueil</span>
              </button>

              <button
                onClick={() => setDriverScreen('tour-overview')}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${
                  driverScreen === 'tour-overview' || driverScreen === 'deliveries' || driverScreen === 'detail'
                    ? 'text-[#0057A8] font-bold'
                    : 'text-[#5B6470] hover:text-[#1D2229]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  alt_route
                </span>
                <span className="text-[10px]">Tournée</span>
              </button>

              <button
                onClick={() => setDriverScreen('history')}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${
                  driverScreen === 'history'
                    ? 'text-[#0057A8] font-bold'
                    : 'text-[#5B6470] hover:text-[#1D2229]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  history
                </span>
                <span className="text-[10px]">Historique</span>
              </button>

              <button
                onClick={() => setDriverScreen('profile')}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${
                  driverScreen === 'profile'
                    ? 'text-[#0057A8] font-bold'
                    : 'text-[#5B6470] hover:text-[#1D2229]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  account_circle
                </span>
                <span className="text-[10px]">Profil</span>
              </button>
            </div>
          )}

          {/* Android Gesture Bar */}
          <div className="h-4 bg-white flex items-center justify-center shrink-0 z-50 pointer-events-none">
            <div className="w-28 h-1 bg-slate-300 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mt-3 w-full max-w-[760px] overflow-hidden rounded-2xl border border-[#DDE7F0] bg-white/95 p-2 shadow-sm shadow-[#C7D9E8]/40 backdrop-blur">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A8A9B]">Écrans mobile</p>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-soft pb-1">
          {demoScreens.map((screen) => {
            const isActive = driverScreen === screen.id;

            return (
              <button
                key={screen.id}
                onClick={() => setDriverScreen(screen.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all ${
                  isActive
                    ? 'border-[#0057A8] bg-[#0057A8] text-white shadow-sm'
                    : 'border-[#DDE7F0] bg-[#F7FAFC] text-[#516173] hover:border-[#8FBCE6] hover:text-[#0057A8]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{screen.icon}</span>
                <span>{screen.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
