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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F5F7FA] font-sans text-[#1F2937]">
      {/* Top Application Bar: Platform Switcher & Scenario Guide */}
      <header className="z-50 flex h-14 shrink-0 select-none items-center justify-between border-b border-[#E2E8F0] bg-white px-5">
        {/* Left: Product title & tag */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-[#0057A8] text-white">
              <span className="material-symbols-outlined text-[17px]">route</span>
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#FFD200] ring-2 ring-white" />
            </div>
            <div>
              <span className="block text-sm font-semibold leading-tight text-[#1F2937]">
                TMS / DMS Delivery
              </span>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1 text-xs font-medium text-[#0057A8] lg:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0057A8]" />
            Casablanca Hub
          </span>
        </div>

        {/* Center: Unified view mode segmented control */}
        <div className="flex items-center gap-0.5 rounded-md border border-[#CBD5E1] bg-[#F8FAFC] p-0.5 text-[13px]">
          <button
            onClick={() => setActiveViewMode('split')}
            className={`flex h-8 items-center gap-1.5 rounded px-3 font-medium transition-colors ${
              activeViewMode === 'split'
                ? 'bg-white text-[#0057A8] ring-1 ring-[#E2E8F0]'
                : 'text-[#64748B] hover:bg-white hover:text-[#1F2937]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">view_column</span>
            <span>Vue Côte à Côte</span>
          </button>

          <button
            onClick={() => setActiveViewMode('backoffice')}
            className={`flex h-8 items-center gap-1.5 rounded px-3 font-medium transition-colors ${
              activeViewMode === 'backoffice'
                ? 'bg-white text-[#0057A8] ring-1 ring-[#E2E8F0]'
                : 'text-[#64748B] hover:bg-white hover:text-[#1F2937]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">desktop_windows</span>
            <span>Backoffice Web</span>
          </button>

          <button
            onClick={() => setActiveViewMode('driver')}
            className={`flex h-8 items-center gap-1.5 rounded px-3 font-medium transition-colors ${
              activeViewMode === 'driver'
                ? 'bg-white text-[#0057A8] ring-1 ring-[#E2E8F0]'
                : 'text-[#64748B] hover:bg-white hover:text-[#1F2937]'
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
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#FED7AA] bg-[#FFF7ED] px-2.5 text-xs font-medium text-[#C2410C]"
            >
              <span className="material-symbols-outlined text-[15px]">verified</span>
              <span>{pendingCount} e-POD à valider</span>
            </span>
          )}

          <button
            onClick={handleStartScenario}
            title="Lancer le parcours étape par étape"
            className="hidden h-8 items-center gap-1.5 rounded-md border border-[#CBD5E1] bg-white px-2.5 text-xs font-medium text-[#475569] transition-colors hover:bg-[#F8FAFC] md:flex"
          >
            <span className="material-symbols-outlined text-[16px] text-[#D71920]">play_circle</span>
            <span>Scénario complet</span>
          </button>

          <button
            onClick={resetDemoData}
            title="Réinitialiser les données de démo"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#CBD5E1] bg-white text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#0057A8]"
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
          <div className="flex h-full flex-1 items-center justify-center overflow-hidden bg-[#F5F7FA]">
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
            <div className="flex h-full w-[430px] shrink-0 flex-col overflow-hidden border-l border-[#E2E8F0] bg-[#F5F7FA]">
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
