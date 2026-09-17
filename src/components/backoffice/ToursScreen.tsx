import React, { useMemo, useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { StatusBadge } from '../common/StatusBadge';
import { Tour } from '../../types';

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

export const ToursScreen: React.FC = () => {
  const { tours, drivers, vehicles, deliveries, createTour, dispatchTour } = useTms();

  const [selectedTour, setSelectedTour] = useState<Tour>(tours[0]);
  const [showCreatePage, setShowCreatePage] = useState<boolean>(false);
  const [showDispatchModal, setShowDispatchModal] = useState<boolean>(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0].id);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0].id);
  const [dispatchSuccessToast, setDispatchSuccessToast] = useState<string | null>(null);
  const [form, setForm] = useState<CreateTourForm>({
    date: '17 Septembre 2026',
    zone: ZONE_OPTIONS[0],
    departureTime: '09:00',
    estimatedEndTime: '17:30',
    driverId: drivers.find((driver) => driver.status === 'Disponible')?.id || drivers[0].id,
    vehicleId: vehicles.find((vehicle) => vehicle.status === 'Disponible')?.id || vehicles[0].id,
    deliveryIds: [],
  });

  const selectedTourSafe = tours.find((tour) => tour.id === selectedTour.id) || tours[0];
  const tourDeliveries = deliveries.filter((delivery) => delivery.tourId === selectedTourSafe.id);

  const candidateDeliveries = useMemo(() => {
    const planned = deliveries.filter(
      (delivery) => delivery.status === 'À planifier' || delivery.status === 'Planifiée'
    );

    if (planned.length > 0) return planned.slice(0, 8);

    return deliveries
      .filter((delivery) => delivery.status === 'Affectée')
      .slice(0, 8);
  }, [deliveries]);

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
              onClick={() => setShowCreatePage(false)}
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
                    onChange={(e) => setForm((prev) => ({ ...prev, zone: e.target.value }))}
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
                            <span className="font-mono text-xs font-bold text-[#0057A8]">{delivery.orderId}</span>
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
                onClick={() => setShowCreatePage(false)}
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
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Gestion des tournées</h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            Création, affectation, suivi des séquences et transmission vers l'application chauffeur.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreatePage(true)}
            className="px-4 py-2 rounded-xl border border-[#BCD6ED] bg-white hover:bg-[#E8F2FB] text-[#0057A8] text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Créer une tournée</span>
          </button>
          <button
            onClick={() => setShowDispatchModal(true)}
            className="px-4 py-2 rounded-xl bg-[#0057A8] hover:bg-[#004280] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-950/20"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            <span>Affecter & Envoyer au chauffeur</span>
          </button>
        </div>
      </div>

      {dispatchSuccessToast && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md flex items-center justify-between text-xs font-semibold animate-in fade-in">
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
      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Left: Tours List */}
        <div className="w-full lg:w-96 bg-white rounded-2xl border border-[#e2e8f0] shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#e2e8f0] bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-[#475569] uppercase tracking-wider">
              Tournées du jour ({tours.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-soft divide-y divide-[#f1f5f9]">
            {tours.map((t) => {
              const isSelected = t.id === selectedTourSafe.id;
              const percent = Math.round((t.completedCount / Math.max(t.deliveriesCount, 1)) * 100);

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTour(t)}
                  className={`p-4 cursor-pointer transition-colors space-y-2 ${
                    isSelected
                      ? 'bg-blue-50/40 border-l-4 border-l-[#0057A8]'
                      : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0057A8]">
                      {t.id}
                    </span>
                    <StatusBadge status={t.status} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1e293b]">{t.driverName}</span>
                    <span className="font-mono text-[#64748b]">{t.vehicleId}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#64748b]">
                    <span className="truncate pr-2">{t.zone}</span>
                    <span className="font-mono font-semibold shrink-0">
                      {t.completedCount} / {t.deliveriesCount} stops ({percent}%)
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
        <div className="flex-1 bg-white rounded-2xl border border-[#e2e8f0] shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#e2e8f0] bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1e293b]">
                  Détail Tournée {selectedTourSafe.id}
                </h2>
                <StatusBadge status={selectedTourSafe.status} size="md" />
              </div>
              <p className="text-xs text-[#64748b] mt-0.5">
                Zone : {selectedTourSafe.zone} • {tourDeliveries.length} livraisons programmées
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDispatchModal(true)}
                className="px-3.5 py-1.5 rounded-lg border border-[#cbd5e1] hover:bg-white text-xs font-bold text-[#0057A8] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Réaffecter</span>
              </button>

              <button
                onClick={() => setShowDispatchModal(true)}
                className="px-4 py-1.5 rounded-lg bg-[#0057A8] hover:bg-[#004280] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Envoyer au chauffeur</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 p-4 border-b border-[#e2e8f0] bg-white text-xs text-center">
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-[10px] text-[#64748b] block">Chauffeur</span>
              <strong className="text-[#1e293b]">{selectedTourSafe.driverName}</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-[10px] text-[#64748b] block">Véhicule</span>
              <strong className="font-mono text-[#0057A8]">{selectedTourSafe.vehicleId}</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-[10px] text-[#64748b] block">Départ prévu</span>
              <strong className="font-mono text-[#1e293b]">{selectedTourSafe.departureTime}</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-[10px] text-[#64748b] block">Fin estimée</span>
              <strong className="font-mono text-emerald-800">{selectedTourSafe.estimatedEndTime}</strong>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-soft">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[#64748b] border-b border-[#e2e8f0] sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-semibold">Ordre</th>
                  <th className="px-4 py-3 font-semibold">N° Commande</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Adresse</th>
                  <th className="px-4 py-3 font-semibold">Créneau</th>
                  <th className="px-4 py-3 font-semibold">Articles</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
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
                      <td className="px-4 py-3 font-mono font-bold text-[#0057A8]">#{del.sequence}</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#1e293b]">{del.orderId}</td>
                      <td className="px-4 py-3 font-bold text-[#1e293b]">{del.customerName}</td>
                      <td className="px-4 py-3 text-[#64748b] max-w-[200px] truncate">
                        {del.address} ({del.district})
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">{del.timeSlot}</td>
                      <td className="px-4 py-3 text-[#475569]">{del.items.map((it) => it.name).join(', ')}</td>
                      <td className="px-4 py-3"><StatusBadge status={del.status} size="sm" /></td>
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