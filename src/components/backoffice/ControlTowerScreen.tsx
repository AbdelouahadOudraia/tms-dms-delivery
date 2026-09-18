import React, { useEffect, useMemo, useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { Delivery, DeliveryStatus } from '../../types';
import { FilterBar, FilterField, PageHeader, SectionHeader } from '../common/BackofficeUI';
import { StatusBadge } from '../common/StatusBadge';
import { GoogleMapCard, GoogleMapMarker, GoogleMapRoutePoint } from '../maps/GoogleMapCard';

const DEPOT_OPTIONS = ['Tous', 'Casablanca Hub Ouest'];
const STATUS_OPTIONS = ['Toutes', 'Planifiée', 'Affectée', 'En cours', 'À clôturer', 'Terminée'];

const getStopSummary = (statuses: string[]) => {
  const delivered = statuses.filter((status) => status === 'Validée' || status === 'À valider').length;
  const inProgress = statuses.filter((status) => ['Livraison en cours', 'En route', 'Arrivé'].includes(status)).length;
  const failed = statuses.filter((status) => status === 'Échec' || status === 'Rejetée' || status === 'Retournée').length;
  const remaining = Math.max(statuses.length - delivered - inProgress - failed, 0);

  return { delivered, inProgress, failed, remaining };
};

const StopSummaryBadge: React.FC<{ label: string; value: number; className: string }> = ({ label, value, className }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${className}`}>
    <strong className="font-semibold">{value}</strong>
    {label}
  </span>
);

const getStopMarkerKind = (status: DeliveryStatus): GoogleMapMarker['kind'] => {
  if (status === 'Validée' || status === 'À valider') return 'success';
  if (['Livraison en cours', 'En route', 'Arrivé'].includes(status)) return 'stop';
  if (status === 'Échec' || status === 'Rejetée' || status === 'Retournée') return 'failed';
  return 'pending';
};

const buildTourMapOverlay = (tourDeliveries: Delivery[]) => {
  const padding = 16;
  const fallbackStep = tourDeliveries.length > 1 ? (100 - padding * 2) / (tourDeliveries.length - 1) : 0;
  const coordinates = tourDeliveries.map((delivery) => delivery.coordinates);
  const latitudes = coordinates.map((coordinate) => coordinate.lat);
  const longitudes = coordinates.map((coordinate) => coordinate.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;

  const points = tourDeliveries.map((delivery, index) => ({
    id: delivery.id,
    x: coordinates.length > 1 ? padding + ((delivery.coordinates.lng - minLng) / lngRange) * (100 - padding * 2) : 50 + fallbackStep * index,
    y: coordinates.length > 1 ? padding + ((maxLat - delivery.coordinates.lat) / latRange) * (100 - padding * 2) : 50,
  }));

  const markers: GoogleMapMarker[] = points.map((point, index) => {
    const delivery = tourDeliveries[index];
    return {
      ...point,
      label: String(delivery.sequence),
      detail: `${delivery.customerName} · ${delivery.status}`,
      kind: getStopMarkerKind(delivery.status),
    };
  });
  const routePath: GoogleMapRoutePoint[] = points.map((point) => ({ id: point.id, x: point.x, y: point.y }));

  return { markers, routePath };
};

export const ControlTowerScreen: React.FC = () => {
  const { tours, deliveries, drivers, vehicles } = useTms();
  const [selectedTourId, setSelectedTourId] = useState(tours[0]?.id || '');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [dateFilter, setDateFilter] = useState('Aujourd’hui');
  const [depotFilter, setDepotFilter] = useState('Tous');
  const [zoneFilter, setZoneFilter] = useState('Tous');
  const [driverFilter, setDriverFilter] = useState('Tous');
  const [vehicleFilter, setVehicleFilter] = useState('Tous');
  const [statusFilter, setStatusFilter] = useState('Toutes');
  const [lastUpdated, setLastUpdated] = useState('10:42');
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const dateOptions = useMemo(() => ['Aujourd’hui', ...Array.from(new Set(tours.map((tour) => tour.date)))], [tours]);
  const zoneOptions = useMemo(() => ['Tous', ...Array.from(new Set(tours.map((tour) => tour.zone)))], [tours]);
  const driverOptions = useMemo(
    () => [
      { value: 'Tous', label: 'Tous' },
      ...tours
        .map((tour) => {
          const driver = drivers.find((item) => item.id === tour.driverId);
          return { value: tour.driverId, label: driver?.name || tour.driverName };
        })
        .filter((option, index, options) => options.findIndex((item) => item.value === option.value) === index),
    ],
    [drivers, tours]
  );
  const vehicleOptions = useMemo(
    () => [
      { value: 'Tous', label: 'Tous' },
      ...tours
        .map((tour) => {
          const vehicle = vehicles.find((item) => item.id === tour.vehicleId);
          return { value: tour.vehicleId, label: vehicle ? `${vehicle.id} · ${vehicle.model}` : `${tour.vehicleId} · ${tour.vehicleModel}` };
        })
        .filter((option, index, options) => options.findIndex((item) => item.value === option.value) === index),
    ],
    [tours, vehicles]
  );

  const handleRefresh = () => {
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setLastUpdated(time);
    setRefreshMessage('Données de démonstration actualisées.');
    setTimeout(() => setRefreshMessage(null), 2500);
  };

  const handleResetFilters = () => {
    setDateFilter('Aujourd’hui');
    setDepotFilter('Tous');
    setZoneFilter('Tous');
    setDriverFilter('Tous');
    setVehicleFilter('Tous');
    setStatusFilter('Toutes');
  };

  const filteredTours = useMemo(
    () =>
      tours.filter((tour) => {
        const matchesDate = dateFilter === 'Aujourd’hui' || tour.date === dateFilter;
        const matchesDepot = depotFilter === 'Tous' || depotFilter === 'Casablanca Hub Ouest';
        const matchesZone = zoneFilter === 'Tous' || tour.zone === zoneFilter;
        const matchesDriver = driverFilter === 'Tous' || tour.driverId === driverFilter;
        const matchesVehicle = vehicleFilter === 'Tous' || tour.vehicleId === vehicleFilter;
        const matchesStatus = statusFilter === 'Toutes' || tour.status === statusFilter;

        return matchesDate && matchesDepot && matchesZone && matchesDriver && matchesVehicle && matchesStatus;
      }),
    [dateFilter, depotFilter, driverFilter, statusFilter, tours, vehicleFilter, zoneFilter]
  );

  useEffect(() => {
    if (filteredTours.length > 0 && !filteredTours.some((tour) => tour.id === selectedTourId)) {
      setSelectedTourId(filteredTours[0].id);
    }
  }, [filteredTours, selectedTourId]);

  const selectedTour = filteredTours.find((tour) => tour.id === selectedTourId) || tours.find((tour) => tour.id === selectedTourId) || filteredTours[0] || tours[0];
  const selectedDeliveries = useMemo(
    () => deliveries.filter((delivery) => delivery.tourId === selectedTour?.id).sort((a, b) => a.sequence - b.sequence),
    [deliveries, selectedTour?.id]
  );
  const selectedTourMapOverlay = useMemo(() => buildTourMapOverlay(selectedDeliveries), [selectedDeliveries]);
  const tourCounters: Array<[string, number]> = [
    ['À planifier', tours.filter((tour) => ['Brouillon', 'Planifiée'].includes(tour.status)).length],
    ['En cours', tours.filter((tour) => tour.status === 'En cours').length],
    ['À clôturer', tours.filter((tour) => tour.status === 'À clôturer').length],
    ['Terminées', tours.filter((tour) => tour.status === 'Terminée').length],
    ['Annulées', tours.filter((tour) => tour.status === 'Annulée').length],
  ];
  const deliveryCounters: Array<[string, number]> = [
    ['À livrer', deliveries.filter((d) => ['À planifier', 'Planifiée', 'Affectée'].includes(d.status)).length],
    ['En cours', deliveries.filter((d) => ['En route', 'Arrivé', 'Livraison en cours'].includes(d.status)).length],
    ['Livrées', deliveries.filter((d) => ['À valider', 'Validée'].includes(d.status)).length],
    ['Échecs', deliveries.filter((d) => d.status === 'Échec').length],
  ];

  return (
    <div className="bo-page">
      <PageHeader
        title="Control Tower"
        subtitle="Suivi opérationnel des tournées et livraisons"
        actions={
          <>
            <span className="hidden text-[13px] text-[#64748B] lg:inline">Dernière actualisation : {lastUpdated}</span>
            <button onClick={handleRefresh} className="bo-button-secondary"><span className="material-symbols-outlined text-[18px]">refresh</span>Actualiser</button>
          </>
        }
      />

      {refreshMessage && <div className="mb-4 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-[13px] font-medium text-[#166534]">{refreshMessage}</div>}

      <FilterBar action={<button onClick={handleResetFilters} className="text-[13px] font-medium text-[#0057A8]">Réinitialiser</button>}>
        <FilterField label="Date">
          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="bo-input w-full">
            {dateOptions.map((value) => <option key={value}>{value}</option>)}
          </select>
        </FilterField>

        <FilterField label="Dépôt">
          <select value={depotFilter} onChange={(event) => setDepotFilter(event.target.value)} className="bo-input w-full">
            {DEPOT_OPTIONS.map((value) => <option key={value}>{value}</option>)}
          </select>
        </FilterField>

        <FilterField label="Zone" className="min-w-[220px]">
          <select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)} className="bo-input w-full">
            {zoneOptions.map((value) => <option key={value}>{value}</option>)}
          </select>
        </FilterField>

        <FilterField label="Chauffeur">
          <select value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)} className="bo-input w-full">
            {driverOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </FilterField>

        <FilterField label="Véhicule" className="min-w-[220px]">
          <select value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)} className="bo-input w-full">
            {vehicleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </FilterField>

        <FilterField label="Statut">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="bo-input w-full">
            {STATUS_OPTIONS.map((value) => <option key={value}>{value}</option>)}
          </select>
        </FilterField>
      </FilterBar>

      <div className="bo-panel mb-4 flex shrink-0 flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 text-[13px]">
        <div className="flex items-center gap-4"><span className="font-medium text-[#1F2937]">Tournées</span>{tourCounters.map(([label, value]) => <span key={label} className="text-[#64748B]">{label} <strong className="ml-1 font-semibold text-[#1F2937]">{value}</strong></span>)}</div>
        <span className="hidden h-5 w-px bg-[#E2E8F0] xl:block" />
        <div className="flex items-center gap-4"><span className="font-medium text-[#1F2937]">Livraisons</span>{deliveryCounters.map(([label, value]) => <span key={label} className="text-[#64748B]">{label} <strong className="ml-1 font-semibold text-[#1F2937]">{value}</strong></span>)}</div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        <section className="bo-panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <SectionHeader
            title="Tournées opérationnelles"
            subtitle={`${filteredTours.length} tournée(s) dans la vue actuelle`}
            action={<div className="flex rounded-md border border-[#CBD5E1] bg-[#F8FAFC] p-0.5 text-[13px]"><button onClick={() => setViewMode('list')} className={`h-8 rounded px-3 font-medium ${viewMode === 'list' ? 'bg-white text-[#0057A8] ring-1 ring-[#E2E8F0]' : 'text-[#64748B]'}`}>Liste</button><button onClick={() => setViewMode('map')} className={`h-8 rounded px-3 font-medium ${viewMode === 'map' ? 'bg-white text-[#0057A8] ring-1 ring-[#E2E8F0]' : 'text-[#64748B]'}`}>Carte</button></div>}
          />
          {viewMode === 'map' ? (
            <div className="min-h-0 flex-1 p-4">
              <GoogleMapCard
                query={`${selectedTour.zone}, Casablanca`}
                zoom={12}
                title={`Google Maps — ${selectedTour.id}`}
                className="h-full min-h-[360px]"
                markers={selectedTourMapOverlay.markers}
                routePath={selectedTourMapOverlay.routePath}
                markerSize="md"
                showMarkerLabels={false}
                showLegend={false}
              />
            </div>
          ) : (
            <div className="scrollbar-soft min-h-0 flex-1 overflow-auto">
              <table className="bo-table min-w-[900px]">
                <thead><tr><th>Tournée / zone</th><th>Chauffeur</th><th>Véhicule</th><th>Horaires</th><th>Progression</th><th>Arrêts</th><th>Statut</th></tr></thead>
                <tbody>{filteredTours.map((tour) => {
                  const tourDeliveries = deliveries.filter((delivery) => delivery.tourId === tour.id).sort((a, b) => a.sequence - b.sequence);
                  const stopSummary = getStopSummary(tourDeliveries.map((delivery) => delivery.status));
                  const progress = tour.deliveriesCount ? Math.round((tour.completedCount / tour.deliveriesCount) * 100) : 0;
                  return <tr key={tour.id} onClick={() => setSelectedTourId(tour.id)} className={`cursor-pointer ${selectedTourId === tour.id ? '!bg-[#EFF6FF]' : ''}`}>
                    <td><span className="block font-mono font-medium text-[#0057A8]">{tour.id}</span><span className="block max-w-48 truncate text-[13px] text-[#64748B]">{tour.zone}</span></td>
                    <td><span className="block font-medium text-[#1F2937]">{tour.driverName}</span><span className="text-[13px] text-[#64748B]">{tour.driverPhone}</span></td>
                    <td><span className="block font-mono text-[#1F2937]">{tour.vehicleId}</span><span className="text-[13px] text-[#64748B]">{tour.vehicleModel}</span></td>
                    <td className="font-mono">{tour.departureTime} → {tour.estimatedEndTime}</td>
                    <td><div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded-full bg-[#E2E8F0]"><div className="h-full rounded-full bg-[#0057A8]" style={{ width: `${progress}%` }} /></div><span className="text-xs text-[#64748B]">{tour.completedCount}/{tour.deliveriesCount}</span></div></td>
                    <td>
                      <div className="flex min-w-[260px] flex-wrap items-center gap-1.5">
                        <StopSummaryBadge label="livrés" value={stopSummary.delivered} className="bg-[#ECFDF3] text-[#166534]" />
                        <StopSummaryBadge label="en cours" value={stopSummary.inProgress} className="bg-[#EFF6FF] text-[#0057A8]" />
                        <StopSummaryBadge label="échecs" value={stopSummary.failed} className="bg-[#FEF2F2] text-[#7F1D1D]" />
                        <StopSummaryBadge label="restants" value={stopSummary.remaining} className="bg-[#F8FAFC] text-[#475569] ring-1 ring-inset ring-[#E2E8F0]" />
                      </div>
                    </td>
                    <td><StatusBadge status={tour.status} size="sm" /></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="bo-panel hidden w-[340px] shrink-0 flex-col overflow-hidden xl:flex">
          <SectionHeader title="Détail tournée" subtitle={selectedTour ? `${selectedTour.id} · ${selectedTour.zone}` : undefined} />
          {selectedTour && <div className="scrollbar-soft min-h-0 flex-1 overflow-y-auto p-4">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-3 border-b border-[#E2E8F0] pb-4 text-[13px]">
              <div><dt className="text-[#64748B]">Chauffeur</dt><dd className="mt-0.5 font-medium text-[#1F2937]">{selectedTour.driverName}</dd></div>
              <div><dt className="text-[#64748B]">Véhicule</dt><dd className="mt-0.5 font-mono text-[#1F2937]">{selectedTour.vehicleId}</dd></div>
              <div><dt className="text-[#64748B]">Distance</dt><dd className="mt-0.5 font-medium text-[#1F2937]">18,4 km</dd></div>
              <div><dt className="text-[#64748B]">Fin estimée</dt><dd className="mt-0.5 font-mono text-[#1F2937]">{selectedTour.estimatedEndTime}</dd></div>
            </dl>
            <GoogleMapCard
              query={`${selectedTour.zone}, Casablanca`}
              zoom={12}
              title={`Google Maps — ${selectedTour.id}`}
              className="my-4 h-44"
              markers={selectedTourMapOverlay.markers}
              routePath={selectedTourMapOverlay.routePath}
              markerSize="sm"
              showMarkerLabels={false}
              showOpenLink={false}
              showLegend={false}
            />
            <h3 className="mb-2 text-sm font-semibold text-[#1F2937]">Arrêts</h3>
            <div className="divide-y divide-[#E2E8F0]">{selectedDeliveries.map((delivery) => <div key={delivery.id} className="flex gap-3 py-3 text-[13px]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-xs font-medium text-[#0057A8]">{delivery.sequence}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate font-medium text-[#1F2937]">{delivery.customerName}</p><StatusBadge status={delivery.status} size="sm" /></div><p className="mt-0.5 text-[#64748B]">{delivery.district} · {delivery.timeSlot}</p></div></div>)}</div>
          </div>}
        </aside>
      </div>
    </div>
  );
};
