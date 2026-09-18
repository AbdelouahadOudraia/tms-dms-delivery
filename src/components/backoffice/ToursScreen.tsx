import React, { useMemo, useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { StatusBadge } from '../common/StatusBadge';
import { Delivery, DeliveryStatus, Tour } from '../../types';
import { GoogleMapCard, GoogleMapMarker, GoogleMapRoutePoint } from '../maps/GoogleMapCard';
import { PageHeader, SectionHeader } from '../common/BackofficeUI';

type CreateTourForm = {
  date: string;
  zone: string;
  departureTime: string;
  estimatedEndTime: string;
  driverId: string;
  vehicleId: string;
  deliveryIds: string[];
};

const ZONE_OPTIONS = [
  'Casablanca Ouest (Maarif, Ain Diab, Hay Hassani)',
  'Casablanca Centre & Port (Sidi Belyout, Belvédère)',
  'Casablanca Est (Ain Sebaa, Sidi Moumen)',
  'Casablanca Sud (Californie, Bouskoura)',
];

const getStopMarkerKind = (status: DeliveryStatus): GoogleMapMarker['kind'] => {
  if (status === 'Validée' || status === 'À valider') return 'success';
  if (['Livraison en cours', 'En route', 'Arrivé'].includes(status)) return 'stop';
  if (status === 'Échec' || status === 'Rejetée' || status === 'Retournée') return 'failed';
  return 'pending';
};

const buildTourMapOverlay = (tourDeliveries: Delivery[]) => {
  if (tourDeliveries.length === 0) {
    return {
      markers: [
        {
          id: 'hub',
          label: 'Dépôt',
          detail: 'Casablanca Hub Ouest',
          kind: 'hub' as const,
          x: 28,
          y: 66,
        },
      ],
      routePath: [],
    };
  }

  const padding = 16;
  const coordinates = tourDeliveries.map((delivery) => delivery.coordinates);
  const latitudes = coordinates.map((coordinate) => coordinate.lat);
  const longitudes = coordinates.map((coordinate) => coordinate.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;

  const stopPoints = tourDeliveries.map((delivery) => ({
    id: delivery.id,
    x: padding + ((delivery.coordinates.lng - minLng) / lngRange) * (100 - padding * 2),
    y: padding + ((maxLat - delivery.coordinates.lat) / latRange) * (100 - padding * 2),
  }));

  const hubPoint = { id: 'hub', x: 12, y: 82 };
  const markers: GoogleMapMarker[] = [
    {
      ...hubPoint,
      label: 'Dépôt',
      detail: 'Casablanca Hub Ouest',
      kind: 'hub',
    },
    ...stopPoints.map((point, index) => {
      const delivery = tourDeliveries[index];

      return {
        ...point,
        label: String(delivery.sequence || index + 1),
        detail: `${delivery.customerName} · ${delivery.status}`,
        kind: getStopMarkerKind(delivery.status),
      };
    }),
  ];
  const routePath: GoogleMapRoutePoint[] = [hubPoint, ...stopPoints].map((point) => ({
    id: point.id,
    x: point.x,
    y: point.y,
  }));

  return { markers, routePath };
};

export const ToursScreen: React.FC = () => {
  const {
    tours,
    drivers,
    vehicles,
    deliveries,
    createTour,
    dispatchTour,
    backofficeTab,
    setBackofficeTab,
  } = useTms();

  const [selectedTour, setSelectedTour] = useState<Tour>(tours[0]);
  const [showCreatePage, setShowCreatePage] = useState<boolean>(backofficeTab === 'tour-create');
  const [showDispatchModal, setShowDispatchModal] = useState<boolean>(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0].id);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0].id);
  const [dispatchSuccessToast, setDispatchSuccessToast] = useState<string | null>(null);
  const [form, setForm] = useState<CreateTourForm>({
    date: '15 Septembre 2026',
    zone: ZONE_OPTIONS[0],
    departureTime: '09:00',
    estimatedEndTime: '17:30',
    driverId: drivers.find((driver) => driver.status === 'Disponible')?.id || drivers[0].id,
    vehicleId: vehicles.find((vehicle) => vehicle.status === 'Disponible')?.id || vehicles[0].id,
    deliveryIds: [],
  });

  const selectedTourSafe = tours.find((tour) => tour.id === selectedTour.id) || tours[0];
  const tourDeliveries = deliveries.filter((delivery) => delivery.tourId === selectedTourSafe.id);
  const selectedTourMapOverlay = useMemo(
    () => buildTourMapOverlay(tourDeliveries),
    [tourDeliveries]
  );

  const candidateDeliveries = useMemo(() => {
    const zoneDistricts = form.zone
      .match(/\(([^)]+)\)/)?.[1]
      .split(',')
      .map((district) => district.trim().toLowerCase()) || [];

    return deliveries.filter(
      (delivery) =>
        delivery.status === 'À planifier' &&
        !delivery.tourId &&
        delivery.deliveryDate === form.date &&
        zoneDistricts.includes(delivery.district.toLowerCase())
    );
  }, [deliveries, form.date, form.zone]);

  const closeCreatePage = () => {
    setShowCreatePage(false);
    setBackofficeTab('tours');
  };

  const toggleDelivery = (deliveryId: string) => {
    setForm((prev) => ({
      ...prev,
      deliveryIds: prev.deliveryIds.includes(deliveryId)
        ? prev.deliveryIds.filter((id) => id !== deliveryId)
        : [...prev.deliveryIds, deliveryId],
    }));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.deliveryIds.length === 0) return;

    const newTour = createTour(form);
    setSelectedTour(newTour);
    setSelectedDriverId(newTour.driverId);
    setSelectedVehicleId(newTour.vehicleId);
    setShowCreatePage(false);
    setBackofficeTab('tours');
    setDispatchSuccessToast(`Tournée ${newTour.id} créée avec ${form.deliveryIds.length} livraison(s).`);
    setTimeout(() => setDispatchSuccessToast(null), 3500);
    setForm((prev) => ({ ...prev, deliveryIds: [] }));
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatchTour(selectedTourSafe.id, selectedDriverId, selectedVehicleId);
    setShowDispatchModal(false);
    setDispatchSuccessToast(
      `Tournée ${selectedTourSafe.id} envoyée avec succès sur le terminal du chauffeur.`
    );
    setTimeout(() => setDispatchSuccessToast(null), 3500);
  };

  if (showCreatePage) {
    const selectedDriver = drivers.find((driver) => driver.id === form.driverId);
    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === form.vehicleId);

    return (
      <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={closeCreatePage}
              className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-[#0057A8] hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Retour aux tournées
            </button>
            <h1 className="text-xl font-bold text-[#1e293b]">Créer une nouvelle tournée</h1>
            <p className="text-xs text-[#64748b] mt-0.5">
              Définir la zone, affecter un chauffeur, choisir un véhicule et sélectionner les livraisons.
            </p>
          </div>

          <div className="rounded-2xl border border-[#BCD6ED] bg-[#E8F2FB] px-4 py-3 text-xs text-[#0057A8]">
            <span className="font-bold block">Prévisualisation</span>
            <span>{form.deliveryIds.length} livraison(s) sélectionnée(s)</span>
          </div>
        </div>

        <form onSubmit={handleCreateSubmit} className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-3 gap-5 overflow-hidden">
          <div className="xl:col-span-2 flex flex-col gap-5 min-h-0 overflow-y-auto scrollbar-soft pr-1">
            <section className="bg-white rounded-2xl border border-[#e2e8f0] shadow-xs p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-[#1e293b]">1. Informations générales</h2>
                <p className="text-xs text-[#64748b] mt-0.5">Définir le périmètre et les horaires de la tournée.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-[#1e293b]">Date</span>
                  <input
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#1e293b] focus:border-[#0057A8] focus:outline-none"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-[#1e293b]">Zone de livraison</span>
                  <select
                    value={form.zone}
                    onChange={(e) => setForm((prev) => ({ ...prev, zone: e.target.value, deliveryIds: [] }))}
                    className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#1e293b] bg-white focus:border-[#0057A8] focus:outline-none"
                  >
                    {ZONE_OPTIONS.map((zone) => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-[#1e293b]">Départ prévu</span>
                  <input
                    type="time"
                    value={form.departureTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, departureTime: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#1e293b] focus:border-[#0057A8] focus:outline-none"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-[#1e293b]">Fin estimée</span>
                  <input
                    type="time"
                    value={form.estimatedEndTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, estimatedEndTime: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#1e293b] focus:border-[#0057A8] focus:outline-none"
                  />
                </label>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-[#e2e8f0] shadow-xs p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-[#1e293b]">2. Ressources affectées</h2>
                <p className="text-xs text-[#64748b] mt-0.5">Choisir le chauffeur et le véhicule disponibles.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-[#1e293b]">Chauffeur</span>
                  <select
                    value={form.driverId}
                    onChange={(e) => setForm((prev) => ({ ...prev, driverId: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#1e293b] bg-white focus:border-[#0057A8] focus:outline-none"
                  >
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} ({driver.status})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-[#1e293b]">Véhicule</span>
                  <select
                    value={form.vehicleId}
                    onChange={(e) => setForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#1e293b] bg-white focus:border-[#0057A8] focus:outline-none"
                  >
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.id} - {vehicle.model}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-[#e2e8f0] shadow-xs flex flex-col min-h-[300px] overflow-hidden">
              <div className="p-5 border-b border-[#e2e8f0]">
                <h2 className="text-sm font-bold text-[#1e293b]">3. Livraisons à intégrer</h2>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Sélectionner les commandes à ordonnancer dans cette tournée.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-soft divide-y divide-[#f1f5f9]">
                {candidateDeliveries.length === 0 && (
                  <div className="flex min-h-40 flex-col items-center justify-center px-6 text-center">
                    <span className="material-symbols-outlined text-[28px] text-[#94A3B8]">inventory_2</span>
                    <p className="mt-2 text-sm font-semibold text-[#334155]">Aucun BL confirmé disponible pour cette date et cette zone</p>
                    <p className="mt-1 text-xs text-[#64748B]">Confirmez d’abord les BL dans « Ordres de livraison » ou vérifiez la date et la zone.</p>
                  </div>
                )}
                {candidateDeliveries.map((delivery) => {
                  const selected = form.deliveryIds.includes(delivery.id);
                  return (
                    <label
                      key={delivery.id}
                      className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${selected ? 'bg-[#E8F2FB]' : 'hover:bg-slate-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleDelivery(delivery.id)}
                        className="mt-1 h-4 w-4 accent-[#0057A8]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <span className="font-mono text-xs font-bold text-[#0057A8]">{delivery.orderId.replace(/^CMD-/, 'BL-')}</span>
                            <h3 className="text-sm font-bold text-[#1e293b]">{delivery.customerName}</h3>
                          </div>
                          <StatusBadge status={delivery.status} size="sm" />
                        </div>
                        <p className="mt-1 text-xs text-[#64748b] truncate">
                          {delivery.address} ({delivery.district}) • {delivery.timeSlot}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="bg-white rounded-2xl border border-[#e2e8f0] shadow-xs p-5 h-fit space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#1e293b]">Résumé de création</h2>
              <p className="text-xs text-[#64748b] mt-0.5">Contrôle rapide avant enregistrement.</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                <span className="text-[#64748b] block">Zone</span>
                <strong className="text-[#1e293b]">{form.zone}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                  <span className="text-[#64748b] block">Départ</span>
                  <strong className="font-mono text-[#1e293b]">{form.departureTime}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                  <span className="text-[#64748b] block">Fin estimée</span>
                  <strong className="font-mono text-[#1e293b]">{form.estimatedEndTime}</strong>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#E8F2FB] border border-[#BCD6ED]">
                <span className="text-[#0057A8] font-bold block">Chauffeur</span>
                <span className="text-[#1e293b]">{selectedDriver?.name}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7FAFC] border border-[#e2e8f0]">
                <span className="text-[#64748b] block">Véhicule</span>
                <strong className="text-[#1e293b]">{selectedVehicle?.id}</strong>
                <span className="block text-[#64748b] mt-0.5">{selectedVehicle?.model}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FEF4EC] border border-[#FBD9C3] text-[#B8561B]">
                <span className="font-bold block">Livraisons sélectionnées</span>
                <span className="font-mono text-lg font-bold">{form.deliveryIds.length}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#e2e8f0] space-y-2">
              <button
                type="submit"
                disabled={form.deliveryIds.length === 0}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0057A8] hover:bg-[#004280] disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/20"
              >
                <span className="material-symbols-outlined text-[16px]">add_task</span>
                <span>Créer la tournée</span>
              </button>
              <button
                type="button"
                onClick={closeCreatePage}
                className="w-full px-4 py-2 rounded-xl border border-[#cbd5e1] text-xs font-semibold text-[#475569] hover:bg-slate-50"
              >
                Annuler
              </button>
            </div>
          </aside>
        </form>
      </div>
    );
  }

  return (
    <div className="bo-page">
      {/* Header */}
      <PageHeader title="Gestion des tournées" subtitle="Création, affectation, suivi des séquences et transmission vers l’application chauffeur" actions={
          <button
            onClick={() => setShowCreatePage(true)}
            className="bo-button-primary"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Créer une tournée</span>
          </button>
      } />

      {dispatchSuccessToast && (
        <div className="mb-4 flex h-10 shrink-0 items-center justify-between rounded-md bg-[#F0FDF4] px-3 text-[13px] font-medium text-[#166534]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{dispatchSuccessToast}</span>
          </div>
          <button onClick={() => setDispatchSuccessToast(null)} className="opacity-80 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Split View: Left List of Tours + Right Tour Details & Stops */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
        {/* Left: Tours List */}
        <div className="bo-panel flex w-full flex-col overflow-hidden lg:w-[300px]">
          <SectionHeader title="Tournées du jour" subtitle={`${tours.length} tournée(s)`} />

          <div className="flex-1 overflow-y-auto scrollbar-soft divide-y divide-[#f1f5f9]">
            {tours.map((t) => {
              const isSelected = t.id === selectedTourSafe.id;
              const percent = Math.round((t.completedCount / Math.max(t.deliveriesCount, 1)) * 100);

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTour(t)}
                  className={`cursor-pointer space-y-2 border-l-2 px-4 py-3 transition-colors ${
                    isSelected
                      ? 'border-l-[#0057A8] bg-[#EFF6FF]'
                      : 'border-l-transparent hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium text-[#0057A8]">
                      {t.id}
                    </span>
                    <StatusBadge status={t.status} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1F2937]">{t.driverName}</span>
                    <span className="font-mono text-[#64748b]">{t.vehicleId}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span className="truncate pr-2">{t.zone}</span>
                    <span className="font-mono font-semibold shrink-0">
                      {t.completedCount} / {t.deliveriesCount} arrêts
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#0057A8] h-full rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Tour Detailed View */}
        <div className="bo-panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#1F2937]">
                  Détail tournée {selectedTourSafe.id}
                </h2>
                <StatusBadge status={selectedTourSafe.status} size="md" />
              </div>
              <p className="mt-0.5 text-[13px] text-[#64748B]">
                Zone : {selectedTourSafe.zone} • {tourDeliveries.length} livraisons programmées
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDispatchModal(true)}
                className="bo-button-secondary"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Réaffecter</span>
              </button>

              <button
                onClick={() => setShowDispatchModal(true)}
                className="bo-button-primary"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Envoyer au chauffeur</span>
              </button>
            </div>
          </div>

          <dl className="grid grid-cols-4 gap-6 border-b border-[#E2E8F0] px-4 py-3 text-[13px]">
            <div><dt className="text-[#64748B]">Chauffeur</dt><dd className="mt-1 font-medium text-[#1F2937]">{selectedTourSafe.driverName}</dd>
            </div>
            <div><dt className="text-[#64748B]">Véhicule</dt><dd className="mt-1 font-mono text-[#0057A8]">{selectedTourSafe.vehicleId}</dd>
            </div>
            <div><dt className="text-[#64748B]">Départ prévu</dt><dd className="mt-1 font-mono text-[#1F2937]">{selectedTourSafe.departureTime}</dd>
            </div>
            <div><dt className="text-[#64748B]">Fin estimée</dt><dd className="mt-1 font-mono text-[#166534]">{selectedTourSafe.estimatedEndTime}</dd>
            </div>
          </dl>

          <div className="px-4 pb-4 border-b border-[#e2e8f0]">
            <GoogleMapCard
              query={`Casablanca ${selectedTourSafe.zone}`}
              zoom={13}
              title="Aperçu cartographique"
              className="h-40"
              markers={selectedTourMapOverlay.markers}
              routePath={selectedTourMapOverlay.routePath}
              markerSize="sm"
              showLegend={false}
              showMarkerLabels
            />
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-soft">
            <table className="bo-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Ordre</th><th>N° BL</th><th>Client</th><th>Adresse</th><th>Créneau</th><th>Articles</th><th>Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {tourDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[#64748b]">
                      Aucune livraison rattachée à cette tournée.
                    </td>
                  </tr>
                ) : (
                  tourDeliveries.map((del) => (
                    <tr key={del.id} className="hover:bg-slate-50/80">
                      <td className="font-mono font-medium text-[#0057A8]">#{del.sequence}</td>
                      <td className="font-mono font-medium text-[#1F2937]">{del.orderId.replace(/^CMD-/, 'BL-')}</td>
                      <td className="font-medium text-[#1F2937]">{del.customerName}</td>
                      <td className="max-w-[200px] truncate text-[#64748B]">
                        {del.address} ({del.district})
                      </td>
                      <td className="font-mono">{del.timeSlot}</td><td>{del.items.map((it) => it.name).join(', ')}</td><td><StatusBadge status={del.status} size="sm" /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showDispatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={handleDispatchSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#0057A8]">{selectedTourSafe.id}</span>
                <h3 className="text-base font-bold text-[#1e293b]">Affectation & Transmission tournée</h3>
              </div>
              <button type="button" onClick={() => setShowDispatchModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1e293b] block">Sélectionner le chauffeur</label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#1e293b]"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.status} • {d.phone})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1e293b] block">Sélectionner le véhicule</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#1e293b]"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.id} - {v.model} ({v.capacity})</option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
              <span className="font-bold block">Transmission push mobile</span>
              <p className="text-[11px] text-blue-800">
                La tournée sera instantanément envoyée sur l'application chauffeur Android avec les {tourDeliveries.length} livraisons ordonnancées.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="px-4 py-2 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#475569] hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#0057A8] hover:bg-[#004280] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-950/20"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Confirmer & Envoyer</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
