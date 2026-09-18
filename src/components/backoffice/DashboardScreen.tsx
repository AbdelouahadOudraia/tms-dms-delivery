import React from 'react';
import { useTms } from '../../context/TmsContext';
import { StatusBadge } from '../common/StatusBadge';
import { GoogleMapCard, GoogleMapMarker } from '../maps/GoogleMapCard';
import { PageHeader, SectionHeader } from '../common/BackofficeUI';
import { countOpenOperationalIncidents } from '../../utils/operationalIncidents';

export const DashboardScreen: React.FC = () => {
  const { deliveries, tours, incidents, setBackofficeTab } = useTms();

  const todayDeliveries = deliveries.length;
  const inProgress = deliveries.filter((d) => ['En route', 'Arrivé', 'Livraison en cours'].includes(d.status)).length;
  const pendingValidation = deliveries.filter((d) => d.status === 'À valider').length;
  const incidentCount = countOpenOperationalIncidents(incidents, deliveries);

  const activeTours = tours.filter((tour) => ['En cours', 'Affectée', 'À clôturer'].includes(tour.status));
  const driverPositions = [
    { x: 24, y: 62 },
    { x: 49, y: 46 },
    { x: 72, y: 58 },
    { x: 83, y: 35 },
  ];
  const operationalMarkers: GoogleMapMarker[] = [
    { id: 'central-hub', label: 'Dépôt central', detail: 'Casablanca Hub Ouest', kind: 'hub', x: 31, y: 31 },
    ...activeTours.slice(0, 4).map((tour, index) => ({
      id: tour.driverId,
      label: tour.driverName.split(' ')[0],
      detail: `${tour.id} · ${tour.zone}`,
      kind: 'driver' as const,
      ...driverPositions[index],
    })),
    { id: 'pending-proof', label: 'e-POD à valider', detail: `${pendingValidation} preuve(s) en attente`, kind: 'attention', x: 58, y: 72 },
  ];

  const kpis = [
    { label: 'Livraisons aujourd’hui', value: todayDeliveries, icon: 'inventory_2', color: '#0057A8', hint: 'Jour J' },
    { label: 'En cours', value: inProgress, icon: 'near_me', color: '#0057A8', hint: 'Sur le terrain' },
    { label: 'À valider', value: pendingValidation, icon: 'verified', color: '#E8722C', hint: 'e-POD superviseur', action: () => setBackofficeTab('validation') },
    { label: 'Incidents', value: incidentCount, icon: 'report', color: '#7F1D1D', hint: 'À traiter', action: () => setBackofficeTab('incidents') },
  ];

  return (
    <div className="bo-page !overflow-y-auto">
      <PageHeader title="Tableau de bord" subtitle="Résumé quotidien de l’exploitation TMS/DMS" actions={
        <button onClick={() => setBackofficeTab('control-tower')} className="bo-button-primary">
          <span className="material-symbols-outlined text-[16px]">monitoring</span>
          Ouvrir Control Tower
        </button>
      } />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            onClick={kpi.action}
            className="bo-panel p-4 text-left transition-colors hover:border-[#93C5FD]"
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-[#64748B]">{kpi.label}</p>
              <span className="material-symbols-outlined text-[19px]" style={{ color: kpi.color }}>{kpi.icon}</span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <span className="font-mono text-2xl font-semibold text-[#1F2937]">{kpi.value}</span>
              <span className="text-xs text-[#64748B]">{kpi.hint}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid min-h-[360px] shrink-0 grid-cols-1 gap-4 xl:grid-cols-[1.4fr_.8fr]">
        <section className="bo-panel flex min-h-0 flex-col overflow-hidden">
          <SectionHeader title="Carte d’exploitation" action={<button onClick={() => setBackofficeTab('control-tower')} className="text-[13px] font-medium text-[#0057A8]">Vue complète</button>} />
          <div className="flex-1 p-4">
            <GoogleMapCard
              query="33.5895,-7.6465"
              zoom={13}
              title="Google Maps — Casablanca Hub Ouest"
              className="h-full min-h-[280px]"
              markers={operationalMarkers}
            />
          </div>
        </section>

        <section className="bo-panel flex min-h-0 flex-col overflow-hidden">
          <SectionHeader title="Alertes importantes" action={<button onClick={() => setBackofficeTab('incidents')} className="text-[13px] font-medium text-[#0057A8]">Tout voir</button>} />
          <div className="flex-1 overflow-y-auto scrollbar-soft divide-y divide-[#EEF3F8] p-2">
            {incidents.slice(0, 5).map((incident) => {
              const severe = incident.severity === 'Bloquant' || ['Client absent', 'Colis abîmé', 'Produit endommagé'].some((label) => incident.type.includes(label));
              return (
                <div key={incident.id} className="p-3 text-[13px] hover:bg-[#F8FAFC]">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${severe ? 'border-[#FECACA] bg-[#FEF2F2] text-[#7F1D1D]' : 'border-[#BFDBFE] bg-[#EFF6FF] text-[#0057A8]'}`}>{incident.type}</span>
                    <span className="font-mono text-xs text-[#64748B]">{incident.timestamp}</span>
                  </div>
                  <p className="mt-2 font-medium text-[#1F2937]">{incident.customerName} • {incident.deliveryId}</p>
                  <p className="mt-1 line-clamp-2 text-[#64748B]">{incident.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="bo-panel mt-4 flex shrink-0 flex-col overflow-hidden">
        <SectionHeader title="Tournées actives" subtitle="Résumé opérationnel" action={<button onClick={() => setBackofficeTab('control-tower')} className="text-[13px] font-medium text-[#0057A8]">Analyser</button>} />
        <div className="max-h-[50vh] overflow-auto scrollbar-soft">
          <table className="bo-table min-w-[900px]">
            <thead>
              <tr>
                <th>Tournée</th><th>Chauffeur</th><th>Zone</th><th>Arrêts</th><th>Progression</th><th>Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF3F8]">
              {tours.filter((tour) => ['En cours', 'Affectée', 'À clôturer'].includes(tour.status)).slice(0, 6).map((tour) => {
                const percent = tour.deliveriesCount ? Math.round((tour.completedCount / tour.deliveriesCount) * 100) : 0;
                return (
                  <tr key={tour.id} className="hover:bg-[#F7FAFC]">
                    <td className="font-mono font-medium text-[#0057A8]">{tour.id}</td><td className="font-medium text-[#1F2937]">{tour.driverName}</td><td>{tour.zone}</td><td className="font-mono">{tour.completedCount} / {tour.deliveriesCount}</td><td><div className="h-1.5 w-32 rounded-full bg-[#E2E8F0]"><div className="h-full rounded-full bg-[#0057A8]" style={{ width: `${percent}%` }} /></div></td><td><StatusBadge status={tour.status} size="sm" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
