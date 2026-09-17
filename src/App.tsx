import React from 'react';
import { TmsProvider, useTms } from './context/TmsContext';
import { BackofficeLayout } from './components/backoffice/BackofficeLayout';
import { DriverApp } from './components/driver/DriverApp';

const MainApp: React.FC = () => {
  const {
    activeViewMode,
    setActiveViewMode,
    resetDemoData,
    deliveries,
    setDriverScreen,
    setSelectedDeliveryId,
    setBackofficeTab,
  } = useTms();

  const pendingCount = deliveries.filter((d) => d.status === 'À valider').length;

  const handleStartScenario = () => {
    setSelectedDeliveryId('CMD-45821');
    setDriverScreen('detail');
    setActiveViewMode('split');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#EEF3F8] font-sans">
      {/* Top Application Bar: Platform Switcher & Scenario Guide */}
      <header className="h-12 bg-gradient-to-r from-[#003B73] via-[#0057A8] to-[#073B73] border-b border-[#00315F] px-4 flex items-center justify-between shrink-0 z-50 text-white select-none shadow-md shadow-slate-900/20 backdrop-blur">
        {/* Left: Product title & tag */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-xl bg-white text-[#0057A8] flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[19px]">route</span>
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#FFD200] ring-2 ring-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block leading-tight">
                TMS / DMS Delivery
              </span>
            </div>
          </div>
          <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-[#D6E9FA] bg-white/10 px-3 py-1 rounded-full border border-white/15 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8FBCE6]" />
            Casablanca Hub
          </span>
        </div>

        {/* Center: Unified view mode segmented control */}
        <div className="flex items-center gap-1 rounded-2xl border border-white/20 bg-[#003B73]/35 p-1 text-xs shadow-inner">
          <span className="hidden lg:inline px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">
            Vue
          </span>
          <button
            onClick={() => setActiveViewMode('split')}
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeViewMode === 'split'
                ? 'bg-white text-[#0057A8] shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">view_column</span>
            <span>Vue Côte à Côte</span>
          </button>

          <button
            onClick={() => setActiveViewMode('backoffice')}
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeViewMode === 'backoffice'
                ? 'bg-white text-[#0057A8] shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">desktop_windows</span>
            <span>Backoffice Web</span>
          </button>

          <button
            onClick={() => setActiveViewMode('driver')}
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeViewMode === 'driver'
                ? 'bg-white text-[#0057A8] shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">smartphone</span>
            <span>App Chauffeur Mobile</span>
          </button>
        </div>

        {/* Right: Quick Scenario & Reset */}
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span
              title="Preuves e-POD en attente de validation"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#FBD9C3] bg-[#FFF4EA] px-3 py-1 text-xs font-bold text-[#B8561B]"
            >
              <span className="material-symbols-outlined text-[15px]">verified</span>
              <span>{pendingCount} e-POD à valider</span>
            </span>
          )}

          <button
            onClick={handleStartScenario}
            title="Lancer le parcours étape par étape"
            className="hidden md:flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-1 text-xs font-bold text-slate-100 transition-colors hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[16px] text-[#D71920]">play_circle</span>
            <span>Scénario complet</span>
          </button>

          <button
            onClick={resetDemoData}
            title="Réinitialiser les données de démo"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/15 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
          </button>
        </div>
      </header>

      {/* Main Display Container */}
      <main className="flex-1 flex overflow-hidden">
        {activeViewMode === 'backoffice' && (
          <div className="flex-1 flex h-full overflow-hidden">
            <BackofficeLayout />
          </div>
        )}

        {activeViewMode === 'driver' && (
          <div className="flex-1 flex h-full overflow-hidden items-center justify-center bg-gradient-to-br from-[#DCEBFA] via-[#EEF3F8] to-[#F7FAFC]">
            <DriverApp />
          </div>
        )}

        {activeViewMode === 'split' && (
          <div className="flex-1 flex h-full overflow-hidden">
            {/* Left Backoffice Web Platform */}
            <div className="flex-1 flex h-full overflow-hidden border-r border-[#DDE7F0]">
              <BackofficeLayout />
            </div>

            {/* Right Mobile Driver Handset */}
            <div className="w-[430px] shrink-0 flex flex-col h-full bg-gradient-to-br from-[#DCEBFA] via-[#EEF3F8] to-[#F7FAFC] border-l border-[#DDE7F0] overflow-hidden">
              <div className="h-9 bg-white/90 px-4 flex items-center justify-between text-xs text-[#5B6470] shrink-0 border-b border-[#DDE7F0] backdrop-blur">
                <span className="font-bold flex items-center gap-1.5 text-[#1D2229]">
                  <span className="material-symbols-outlined text-[16px] text-[#0057A8]">phone_android</span>
                  <span>Terminal Chauffeur (En direct)</span>
                </span>
                <span className="font-mono text-[10px] text-[#0057A8] font-bold">
                  Youssef El Amrani
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <DriverApp />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export function App() {
  return (
    <TmsProvider>
      <MainApp />
    </TmsProvider>
  );
}

export default App;
