import React from 'react';
import { useTms } from '../../context/TmsContext';
import { DashboardScreen } from './DashboardScreen';
import { OrdersScreen } from './OrdersScreen';
import { ToursScreen } from './ToursScreen';
import { TrackingScreen } from './TrackingScreen';
import { ValidationScreen } from './ValidationScreen';
import { AnomaliesScreen } from './AnomaliesScreen';
import { FleetScreen } from './FleetScreen';
import { SettingsScreen } from './SettingsScreen';

export const BackofficeLayout: React.FC = () => {
  const {
    backofficeTab,
    setBackofficeTab,
    deliveries,
  } = useTms();

  const pendingPODCount = deliveries.filter((d) => d.status === 'À valider').length;

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: 'dashboard',
    },
    {
      id: 'orders',
      label: 'Commandes',
      icon: 'receipt_long',
    },
    {
      id: 'tours',
      label: 'Tournées',
      icon: 'alt_route',
    },
    {
      id: 'deliveries',
      label: 'Livraisons',
      icon: 'local_shipping',
    },
    {
      id: 'drivers',
      label: 'Chauffeurs',
      icon: 'person',
    },
    {
      id: 'vehicles',
      label: 'Véhicules',
      icon: 'local_shipping',
    },
    {
      id: 'validation',
      label: 'Validation',
      icon: 'verified',
      badge: pendingPODCount > 0 ? pendingPODCount : undefined,
      badgeColor: 'bg-[#E8722C] text-white',
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: 'settings',
    },
  ];

  // Map legacy tab keys if needed
  const normalizedTab =
    backofficeTab === 'tracking'
      ? 'deliveries'
      : backofficeTab === 'pending-validation'
      ? 'validation'
      : backofficeTab;

  return (
    <div className="flex-1 flex h-full bg-[#EEF3F8] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#FBFDFF] text-[#516173] flex flex-col justify-between shrink-0 select-none shadow-sm shadow-slate-200/80 border-r border-[#DDE7F0]">
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Logo & Brand Header */}
          <div className="p-5 border-b border-[#DDE7F0] flex items-center gap-3 bg-gradient-to-br from-[#003B73] via-[#0057A8] to-[#0067C5]">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#0057A8] flex items-center justify-center shadow-md shadow-blue-900/15">
              <span className="material-symbols-outlined text-[24px]">
                local_shipping
              </span>
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight block">
                TMS Delivery
              </span>
              <span className="text-[10px] text-[#D6E9FA] font-bold uppercase tracking-wider block">
                Dispatch Control Tower
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-soft p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#7A8A9B] px-3 pt-2 pb-1 block tracking-wider">
              Navigation métier
            </span>
            {NAV_ITEMS.map((item) => {
              const isActive =
                normalizedTab === item.id ||
                (item.id === 'deliveries' && backofficeTab === 'tracking') ||
                (item.id === 'validation' && backofficeTab === 'pending-validation');

              return (
                <button
                  key={item.id}
                  onClick={() => setBackofficeTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#0057A8] text-white shadow-md shadow-blue-900/15 font-bold ring-1 ring-[#0057A8]'
                      : 'text-[#516173] hover:text-[#0057A8] hover:bg-[#EEF3F8]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dispatcher Session Footer */}
        <div className="p-4 border-t border-[#DDE7F0] bg-[#EEF3F8]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0057A8] text-white font-bold flex items-center justify-center text-xs shadow-inner">
              KD
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-[#1D2229] truncate block">
                Karim Dispatcher
              </span>
              <span className="text-[10px] text-[#5B6470] truncate block">
                Superviseur Logistique
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <header className="h-12 bg-white/95 border-b border-[#DDE7F0] px-6 flex items-center justify-between shrink-0 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#1976D2]">warehouse</span>
            <span className="text-xs font-bold text-[#5B6470]">Dépôt Central :</span>
            <span className="text-xs font-bold text-[#1D2229]">
              Casablanca Hub Ouest (Aïn Diab / Maarif)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAF5EE] text-[#176B3A] border border-[#BEE3CE] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#2E9E5B]" />
              Système connecté (Direct e-POD)
            </span>
            <span className="text-[#5B6470] font-mono">15/09/2026 10:42</span>
          </div>
        </header>

        {/* Active Backoffice View */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {normalizedTab === 'dashboard' && <DashboardScreen />}
          {normalizedTab === 'orders' && <OrdersScreen />}
          {normalizedTab === 'tours' && <ToursScreen />}
          {normalizedTab === 'deliveries' && <TrackingScreen />}
          {normalizedTab === 'drivers' && <FleetScreen defaultTab="drivers" />}
          {normalizedTab === 'vehicles' && <FleetScreen defaultTab="vehicles" />}
          {normalizedTab === 'validation' && <ValidationScreen />}
          {normalizedTab === 'settings' && <SettingsScreen />}
          {normalizedTab === 'anomalies' && <AnomaliesScreen />}
        </main>
      </div>
    </div>
  );
};
