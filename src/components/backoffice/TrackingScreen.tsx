import React, { useMemo, useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { StatusBadge } from '../common/StatusBadge';
import { Delivery } from '../../types';

export const TrackingScreen: React.FC = () => {
  const { deliveries, drivers, tours, setSelectedDeliveryId, setBackofficeTab } = useTms();

  const [selectedDelivery, setSelectedDelivery] = useState<Delivery>(deliveries[1]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [driverFilter, setDriverFilter] = useState('Tous');
  const [tourFilter, setTourFilter] = useState('Tous');

  const filteredDeliveries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return deliveries.filter((delivery) => {
      const matchesSearch =
        !normalizedSearch ||
        delivery.orderId.toLowerCase().includes(normalizedSearch) ||
        delivery.customerName.toLowerCase().includes(normalizedSearch) ||
        delivery.district.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'Tous' || delivery.status === statusFilter;
      const matchesDriver = driverFilter === 'Tous' || delivery.driverName === driverFilter;
      const matchesTour = tourFilter === 'Tous' || delivery.tourId === tourFilter;

      return matchesSearch && matchesStatus && matchesDriver && matchesTour;
    });
  }, [deliveries, driverFilter, searchTerm, statusFilter, tourFilter]);

  const activeCount = deliveries.filter((delivery) =>
    ['En route', 'Arrivé', 'Livraison en cours'].includes(delivery.status)
  ).length;

  return (
    <div className="bo-page !p-0">
      <div className="shrink-0 px-6 pb-4 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#182433]">Livraisons</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Suivi opérationnel des commandes, heures réelles, anomalies et preuves terrain.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right">
            <div className="px-3 py-1.5">
              <span className="block text-xs text-[#64748B]">Total</span>
              <span className="font-mono text-lg font-semibold text-[#1F2937]">{deliveries.length}</span>
            </div>
            <div className="border-l border-[#E2E8F0] px-3 py-1.5">
              <span className="block text-xs text-[#0057A8]">En cours</span>
              <span className="font-mono text-lg font-semibold text-[#0057A8]">{activeCount}</span>
            </div>
            <div className="border-l border-[#E2E8F0] px-3 py-1.5">
              <span className="block text-xs text-[#C2410C]">À valider</span>
              <span className="font-mono text-lg font-semibold text-[#C2410C]">
                {deliveries.filter((delivery) => delivery.status === 'À valider').length}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[minmax(220px,1fr)_150px_190px_150px] gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8EA0B5] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Commande, client ou zone"
              className="bo-input w-full pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="bo-input"
          >
            <option value="Tous">Tous statuts</option>
            <option value="À planifier">À planifier</option>
            <option value="Affectée">Affectée</option>
            <option value="En route">En route</option>
            <option value="Arrivé">Arrivé</option>
            <option value="Livraison en cours">En cours</option>
            <option value="À valider">À valider</option>
            <option value="Validée">Validée</option>
            <option value="Échec">Échec</option>
            <option value="Rejetée">Rejetée</option>
          </select>
          <select
            value={driverFilter}
            onChange={(event) => setDriverFilter(event.target.value)}
            className="bo-input"
          >
            <option value="Tous">Tous chauffeurs</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.name}>
                {driver.name}
              </option>
            ))}
          </select>
          <select
            value={tourFilter}
            onChange={(event) => setTourFilter(event.target.value)}
            className="bo-input"
          >
            <option value="Tous">Toutes tournées</option>
            {tours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] gap-4 overflow-hidden px-6 pb-6">
        <section className="bo-panel flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DDE7F0] bg-[#F7FAFC] flex items-center justify-between">
            <span className="text-xs font-bold text-[#182433] uppercase tracking-wide">
              Flux livraisons ({filteredDeliveries.length})
            </span>
            <span className="text-xs font-semibold text-[#176B3A] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2E9E5B]" />
              Données de démonstration
            </span>
          </div>

          <div className="flex-1 overflow-auto scrollbar-soft">
            <table className="bo-table min-w-[740px]">
              <thead className="bg-white text-[#627286] border-b border-[#DDE7F0] sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-bold">Commande</th>
                  <th className="px-4 py-3 font-bold">Client</th>
                  <th className="px-4 py-3 font-bold">Tournée</th>
                  <th className="px-4 py-3 font-bold">Zone</th>
                  <th className="px-4 py-3 font-bold">Créneau</th>
                  <th className="px-4 py-3 font-bold">Statut</th>
                  <th className="sticky right-0 bg-white px-4 py-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF2F7]">
                {filteredDeliveries.map((delivery) => {
                  const isSelected = delivery.id === selectedDelivery.id;
                  return (
                    <tr
                      key={delivery.id}
                      onClick={() => setSelectedDelivery(delivery)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#E8F2FB]' : 'hover:bg-[#F7FAFC]'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-[#0057A8]">
                        {delivery.orderId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-bold text-[#182433]">{delivery.customerName}</span>
                        <span className="block whitespace-nowrap text-xs text-[#627286]">{delivery.phone}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[#34475C]">{delivery.tourId}</td>
                      <td className="px-4 py-3 text-[#627286]">{delivery.district}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-[#182433]">{delivery.timeSlot}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={delivery.status} size="sm" />
                      </td>
                      <td className={`sticky right-0 px-4 py-3 text-right ${isSelected ? 'bg-[#E8F2FB]' : 'bg-white'}`}>
                        {delivery.status === 'À valider' ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedDeliveryId(delivery.id);
                              setBackofficeTab('pending-validation');
                            }}
                            className="h-8 px-3 rounded-lg bg-[#0057A8] hover:bg-[#004280] text-white font-bold text-[11px]"
                          >
                            Examiner
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedDelivery(delivery);
                            }}
                            className="h-8 px-3 rounded-lg border border-[#DDE7F0] hover:bg-[#F7FAFC] text-[#0057A8] font-bold text-[11px]"
                          >
                            Détail
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="bo-panel flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DDE7F0] bg-[#F7FAFC] flex items-center justify-between">
            <span className="text-xs font-bold text-[#182433] uppercase tracking-wide">
              Détail livraison
            </span>
            <StatusBadge status={selectedDelivery.status} size="sm" />
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-soft p-4 space-y-4 text-xs">
            <div className="rounded-lg bg-[#E8F2FB] border border-[#BCD6ED] p-4">
              <span className="font-mono font-bold text-[#0057A8] text-sm">
                {selectedDelivery.orderId}
              </span>
              <h2 className="text-base font-bold text-[#182433] mt-1">
                {selectedDelivery.customerName}
              </h2>
              <p className="text-[#4B5E72] mt-2 leading-relaxed">
                {selectedDelivery.address}, {selectedDelivery.district} – {selectedDelivery.city}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#DDE7F0] bg-[#F7FAFC] p-3">
                <span className="block text-[10px] text-[#627286] uppercase font-bold">Tournée</span>
                <span className="font-mono font-bold text-[#182433]">{selectedDelivery.tourId}</span>
              </div>
              <div className="rounded-lg border border-[#DDE7F0] bg-[#F7FAFC] p-3">
                <span className="block text-[10px] text-[#627286] uppercase font-bold">Véhicule</span>
                <span className="font-mono font-bold text-[#182433]">{selectedDelivery.vehicleId}</span>
              </div>
              <div className="rounded-lg border border-[#DDE7F0] bg-[#F7FAFC] p-3">
                <span className="block text-[10px] text-[#627286] uppercase font-bold">Créneau</span>
                <span className="font-mono font-bold text-[#182433]">{selectedDelivery.timeSlot}</span>
              </div>
              <div className="rounded-lg border border-[#DDE7F0] bg-[#F7FAFC] p-3">
                <span className="block text-[10px] text-[#627286] uppercase font-bold">Heure réelle</span>
                <span className="font-mono font-bold text-[#182433]">
                  {selectedDelivery.deliveryTime || selectedDelivery.arrivalTime || '-'}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-[#DDE7F0] p-4">
              <h3 className="text-sm font-bold text-[#182433] mb-3">Chauffeur</h3>
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#182433]">{selectedDelivery.driverName}</span>
                <span className="font-mono text-[#627286]">06 61 22 33 44</span>
              </div>
            </div>

            <div className="rounded-lg border border-[#DDE7F0] p-4">
              <h3 className="text-sm font-bold text-[#182433] mb-3">
                Articles ({selectedDelivery.items.length})
              </h3>
              <div className="space-y-2">
                {selectedDelivery.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg bg-[#F7FAFC] border border-[#EDF2F7] p-2.5">
                    <span>
                      <span className="block font-bold text-[#182433]">{item.name}</span>
                      <span className="font-mono text-[10px] text-[#627286]">{item.ref}</span>
                    </span>
                    <span className="font-mono font-bold text-[#0057A8]">×{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedDelivery.status === 'À valider' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDeliveryId(selectedDelivery.id);
                  setBackofficeTab('pending-validation');
                }}
                className="w-full h-11 bg-[#0057A8] hover:bg-[#004280] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                Examiner la preuve e-POD
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
