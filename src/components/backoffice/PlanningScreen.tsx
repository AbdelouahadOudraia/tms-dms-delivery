import React, { useMemo, useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { FilterBar, FilterField, PageHeader, SectionHeader } from '../common/BackofficeUI';
import { StatusBadge } from '../common/StatusBadge';

export const PlanningScreen: React.FC = () => {
  const { tours, deliveries, setBackofficeTab } = useTms();
  const [status, setStatus] = useState('Tous');

  const plannedTours = useMemo(
    () => tours.filter((tour) => status === 'Tous' || tour.status === status),
    [status, tours]
  );

  return (
    <div className="bo-page">
      <PageHeader
        title="Planification"
        subtitle="Préparer les tournées, contrôler les ressources et les créneaux du jour"
        actions={(
          <button onClick={() => setBackofficeTab('tours')} className="bo-button-primary">
            <span className="material-symbols-outlined text-[18px]">alt_route</span>
            Gérer les tournées
          </button>
        )}
      />

      <FilterBar>
        <FilterField label="Date"><select className="bo-input w-full"><option>15 septembre 2026</option></select></FilterField>
        <FilterField label="Statut">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="bo-input w-full">
            {['Tous', 'Brouillon', 'Planifiée', 'Affectée', 'En cours', 'À clôturer', 'Terminée'].map((value) => <option key={value}>{value}</option>)}
          </select>
        </FilterField>
      </FilterBar>

      <section className="bo-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <SectionHeader title="Programme du 15 septembre 2026" subtitle={`${plannedTours.length} tournée(s) dans la vue`} />
        <div className="scrollbar-soft min-h-0 flex-1 overflow-auto">
          <table className="bo-table min-w-[900px]">
            <thead><tr><th>Tournée</th><th>Zone</th><th>Chauffeur</th><th>Véhicule</th><th>Horaires</th><th>Commandes</th><th>Statut</th></tr></thead>
            <tbody>{plannedTours.map((tour) => {
              const assignedCount = deliveries.filter((delivery) => delivery.tourId === tour.id).length;
              return (
                <tr key={tour.id}>
                  <td className="whitespace-nowrap font-mono font-medium text-[#0057A8]">{tour.id}</td>
                  <td className="max-w-[300px] truncate" title={tour.zone}>{tour.zone}</td>
                  <td className="whitespace-nowrap font-medium text-[#1F2937]">{tour.driverName}</td>
                  <td className="whitespace-nowrap font-mono">{tour.vehicleId}</td>
                  <td className="whitespace-nowrap font-mono">{tour.departureTime} → {tour.estimatedEndTime}</td>
                  <td className="font-mono">{assignedCount}</td>
                  <td><StatusBadge status={tour.status} size="sm" /></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
