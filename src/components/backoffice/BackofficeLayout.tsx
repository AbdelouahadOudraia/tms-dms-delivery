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
import { ControlTowerScreen } from './ControlTowerScreen';
import { AddressesScreen } from './AddressesScreen';
import { ZonesScreen } from './ZonesScreen';
import { PlanningScreen } from './PlanningScreen';
import { ProvidersScreen } from './ProvidersScreen';
import { countOpenOperationalIncidents } from '../../utils/operationalIncidents';

const navSections = [
  {
    title: 'Pilotage',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', icon: 'dashboard' },
      { id: 'control-tower', label: 'Control Tower', icon: 'monitoring' },
    ],
  },
  {
    title: 'Transport',
    items: [
      { id: 'orders', label: 'Ordres de livraison', icon: 'receipt_long' },
      { id: 'planning', label: 'Planification', icon: 'event_note' },
      { id: 'tours', label: 'Tournées', icon: 'alt_route' },
    ],
  },
  {
    title: 'Livraison',
    items: [
      { id: 'deliveries', label: 'Livraisons', icon: 'local_shipping' },
      { id: 'validation', label: 'Validation e-POD', icon: 'verified' },
      { id: 'incidents', label: 'Incidents', icon: 'report' },
    ],
  },
  {
    title: 'Ressources',
    items: [
      { id: 'drivers', label: 'Chauffeurs', icon: 'person' },
      { id: 'vehicles', label: 'Véhicules', icon: 'local_shipping' },
      { id: 'providers', label: 'Prestataires', icon: 'business' },
    ],
  },
  {
    title: 'Référentiels',
    items: [
      { id: 'addresses', label: 'Adresses', icon: 'location_on' },
      { id: 'zones', label: 'Zones', icon: 'map' },
    ],
  },
  {
    title: 'Configuration',
    items: [{ id: 'settings', label: 'Règles & workflow', icon: 'settings' }],
  },
];

export const BackofficeLayout: React.FC = () => {
  const { backofficeTab, setBackofficeTab, deliveries, incidents } = useTms();

  const pendingPODCount = deliveries.filter((d) => d.status === 'À valider').length;
  const incidentCount = countOpenOperationalIncidents(incidents, deliveries);

  const normalizedTab =
    backofficeTab === 'tracking'
      ? 'deliveries'
      : backofficeTab === 'tour-create'
      ? 'tours'
      : backofficeTab === 'pending-validation'
      ? 'validation'
      : backofficeTab === 'anomalies'
      ? 'incidents'
      : backofficeTab;

  const badgeFor = (itemId: string) => {
    if (itemId === 'validation' && pendingPODCount > 0) return pendingPODCount;
    if (itemId === 'incidents' && incidentCount > 0) return incidentCount;
    return undefined;
  };

  const handleNav = (itemId: string) => setBackofficeTab(itemId);

  return (
    <div className="backoffice-shell flex h-full flex-1 overflow-hidden bg-[#F5F7FA]">
      <aside className="flex w-60 shrink-0 select-none flex-col justify-between border-r border-[#E2E8F0] bg-white text-[#475569]">
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-[#E2E8F0] px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#EFF6FF] text-[#0057A8]">
              <span className="material-symbols-outlined text-[22px]">local_shipping</span>
            </div>
            <div>
              <span className="block text-sm font-semibold text-[#1F2937]">TMS Delivery</span>
              <span className="block text-xs text-[#64748B]">Exploitation transport</span>
            </div>
          </div>

          <nav className="scrollbar-soft min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
            {navSections.map((section) => (
              <div key={section.title}>
                <span className="block px-3 pb-1.5 text-xs font-medium text-[#94A3B8]">{section.title}</span>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = normalizedTab === item.id;
                    const badge = badgeFor(item.id);

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        className={`relative flex h-10 w-full items-center justify-between rounded-md px-3 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[#EFF6FF] text-[#0057A8] before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-[#0057A8]'
                            : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#1F2937]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                          <span>{item.label}</span>
                        </span>
                        {badge !== undefined && <span className="min-w-5 rounded-full bg-[#FFF7ED] px-1.5 py-0.5 text-center text-xs font-medium text-[#C2410C]">{badge}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-[#E2E8F0] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-xs font-semibold text-[#0057A8]">KD</div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-[#1F2937]">Karim Dispatcher</span>
              <span className="block truncate text-xs text-[#64748B]">Superviseur logistique</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#1976D2]">warehouse</span>
            <span className="text-[13px] text-[#64748B]">Dépôt central</span>
            <span className="text-[13px] font-medium text-[#1F2937]">Casablanca Hub Ouest</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-2.5 py-1 text-xs font-medium text-[#166534]">
              <span className="w-2 h-2 rounded-full bg-[#2E9E5B]" />
              Mode démo · e-POD simulé
            </span>
            <span className="font-mono text-xs text-[#64748B]">15/09/2026 10:42</span>
          </div>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden">
          {normalizedTab === 'dashboard' && <DashboardScreen />}
          {normalizedTab === 'control-tower' && <ControlTowerScreen />}
          {normalizedTab === 'orders' && <OrdersScreen />}
          {normalizedTab === 'planning' && <PlanningScreen />}
          {normalizedTab === 'tours' && <ToursScreen />}
          {normalizedTab === 'deliveries' && <TrackingScreen />}
          {normalizedTab === 'drivers' && <FleetScreen defaultTab="drivers" />}
          {normalizedTab === 'vehicles' && <FleetScreen defaultTab="vehicles" />}
          {normalizedTab === 'providers' && <ProvidersScreen />}
          {normalizedTab === 'validation' && <ValidationScreen />}
          {normalizedTab === 'incidents' && <AnomaliesScreen />}
          {normalizedTab === 'addresses' && <AddressesScreen />}
          {normalizedTab === 'zones' && <ZonesScreen />}
          {normalizedTab === 'settings' && <SettingsScreen />}
        </main>
      </div>
    </div>
  );
};
