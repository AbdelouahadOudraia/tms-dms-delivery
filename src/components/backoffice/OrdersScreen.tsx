import React, { useMemo, useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { SimpleModal } from '../common/BackofficeUI';
import type { Delivery } from '../../types';

type DeliveryLogistics = {
  packageCount: number;
  totalWeight: number;
  requiredVehicle: 'Fourgon' | '3.5T' | 'Camion';
  goodsValue: number;
};

type WarehouseInfo = {
  id: string;
  name: string;
  code: string;
  address: string;
  capacity: string;
  zones: string[];
};

const WAREHOUSES: WarehouseInfo[] = [
  {
    id: 'CAS-OUEST',
    name: 'Casablanca Hub Ouest',
    code: 'DEP-CAS-O',
    address: "Zone logistique Lissasfa, route d'El Jadida",
    capacity: '1 600 palettes',
    zones: ['Maarif', 'Maarif Extension', 'Ain Diab', 'Hay Hassani', 'Bourgogne', 'CIL', 'Oasis'],
  },
  {
    id: 'CAS-CENTRE',
    name: 'Casablanca Hub Centre',
    code: 'DEP-CAS-C',
    address: 'Roches Noires, Casablanca',
    capacity: '1 200 palettes',
    zones: ['Centre Ville', 'Ghandi', 'Racine', 'Sidi Belyout', 'Belvédère', 'Derb Sultan', 'Roches Noires'],
  },
  {
    id: 'CAS-EST',
    name: 'Casablanca Hub Est',
    code: 'DEP-CAS-E',
    address: 'Zone industrielle Ain Sebaa, Casablanca',
    capacity: '2 000 palettes',
    zones: ['Ain Sebaa', 'Sidi Moumen'],
  },
  {
    id: 'CAS-SUD',
    name: 'Casablanca Hub Sud',
    code: 'DEP-CAS-S',
    address: 'Parc industriel Bouskoura',
    capacity: '900 palettes',
    zones: ['Bouskoura'],
  },
];

const formatBlNumber = (orderId: string) => orderId.replace(/^CMD-/, 'BL-');

const getDeliveryWarehouse = (delivery: Delivery) =>
  WAREHOUSES.find((warehouse) => warehouse.zones.includes(delivery.district)) || WAREHOUSES[0];

const parseWeight = (weight: string) => {
  const normalized = weight.replace(',', '.').replace(/[^\d.]/g, '');
  return Number.parseFloat(normalized) || 0;
};

const getDeliveryLogistics = (delivery: Delivery): DeliveryLogistics => {
  const packageCount = delivery.items.reduce((total, item) => total + item.quantity, 0);
  const totalWeight = delivery.items.reduce(
    (total, item) => total + parseWeight(item.weight) * item.quantity,
    0
  );
  const hasBulkyItem = delivery.items.some((item) => item.category === 'Lourd');
  const requiredVehicle =
    totalWeight >= 80 ? 'Camion' : totalWeight >= 35 || hasBulkyItem ? '3.5T' : 'Fourgon';
  const goodsValue = delivery.items.reduce((total, item) => {
    const unitValue = item.category === 'Fragile' ? 3400 : item.category === 'Lourd' ? 5200 : 1800;
    return total + unitValue * item.quantity;
  }, 0);

  return { packageCount, totalWeight, requiredVehicle, goodsValue };
};

export const OrdersScreen: React.FC = () => {
  const {
    deliveries,
    confirmDeliveryOrder,
    setBackofficeTab,
    setPlanningSelectionIds,
  } = useTms();

  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('Tous');
  const [timeSlotFilter, setTimeSlotFilter] = useState('Tous');
  const [vehicleFilter, setVehicleFilter] = useState('Tous');
  const [warehouseFilter, setWarehouseFilter] = useState('Tous');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [optimizedOrderIds, setOptimizedOrderIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  const unassignedDeliveries = useMemo(
    () => deliveries.filter((delivery) => !delivery.tourId && !delivery.driverId),
    [deliveries]
  );

  const filteredDeliveries = useMemo(
    () =>
      unassignedDeliveries.filter((delivery) => {
        const search = searchTerm.trim().toLowerCase();
        const logistics = getDeliveryLogistics(delivery);
        const matchesSearch =
          !search ||
          formatBlNumber(delivery.orderId).toLowerCase().includes(search) ||
          delivery.orderId.toLowerCase().includes(search) ||
          delivery.customerName.toLowerCase().includes(search) ||
          delivery.address.toLowerCase().includes(search);
        const matchesDistrict = districtFilter === 'Tous' || delivery.district === districtFilter;
        const matchesTimeSlot = timeSlotFilter === 'Tous' || delivery.timeSlot === timeSlotFilter;
        const matchesVehicle = vehicleFilter === 'Tous' || logistics.requiredVehicle === vehicleFilter;
        const selectedWarehouse = WAREHOUSES.find((warehouse) => warehouse.id === warehouseFilter);
        const matchesWarehouse =
          warehouseFilter === 'Tous' || Boolean(selectedWarehouse?.zones.includes(delivery.district));

        return matchesSearch && matchesDistrict && matchesTimeSlot && matchesVehicle && matchesWarehouse;
      }),
    [districtFilter, searchTerm, timeSlotFilter, unassignedDeliveries, vehicleFilter, warehouseFilter]
  );

  const districts = useMemo(
    () => {
      const warehouse = WAREHOUSES.find((item) => item.id === warehouseFilter);
      const warehouseDeliveries = warehouse
        ? unassignedDeliveries.filter((delivery) => warehouse.zones.includes(delivery.district))
        : unassignedDeliveries;
      return Array.from(new Set(warehouseDeliveries.map((delivery) => delivery.district)));
    },
    [unassignedDeliveries, warehouseFilter]
  );
  const timeSlots = useMemo(
    () => Array.from(new Set(unassignedDeliveries.map((delivery) => delivery.timeSlot))),
    [unassignedDeliveries]
  );
  const selectedWarehouse = WAREHOUSES.find((warehouse) => warehouse.id === warehouseFilter);

  const displayedDeliveries = useMemo(() => {
    if (optimizedOrderIds.length === 0) return filteredDeliveries;

    const optimizedRank = new Map<string, number>(
      optimizedOrderIds.map((id, index) => [id, index])
    );
    return [...filteredDeliveries].sort((first, second) => {
      const firstRank = optimizedRank.get(first.id);
      const secondRank = optimizedRank.get(second.id);
      if (firstRank === undefined && secondRank === undefined) return 0;
      if (firstRank === undefined) return 1;
      if (secondRank === undefined) return -1;
      return firstRank - secondRank;
    });
  }, [filteredDeliveries, optimizedOrderIds]);

  const visibleIds = displayedDeliveries.map((delivery) => delivery.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((deliveryId) => selectedIds.includes(deliveryId));

  const toggleDeliverySelection = (deliveryId: string) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(deliveryId)
        ? currentIds.filter((id) => id !== deliveryId)
        : [...currentIds, deliveryId]
    );
  };

  const toggleVisibleSelection = () => {
    setSelectedIds((currentIds) => {
      if (allVisibleSelected) {
        return currentIds.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...currentIds, ...visibleIds]));
    });
  };

  const handleCreateTour = () => {
    if (selectedIds.length === 0) return;

    selectedIds.forEach((deliveryId) => confirmDeliveryOrder(deliveryId));
    setPlanningSelectionIds(selectedIds);
    setBackofficeTab('tour-create');
  };

  const handleOptimize = () => {
    if (selectedIds.length === 0) return;

    const optimizedIds = unassignedDeliveries
      .filter((delivery) => selectedIds.includes(delivery.id))
      .sort(
        (first, second) =>
          first.district.localeCompare(second.district, 'fr') ||
          first.timeSlot.localeCompare(second.timeSlot, 'fr')
      )
      .map((delivery) => delivery.id);

    setOptimizedOrderIds(optimizedIds);
    setActionMessage(
      `${optimizedIds.length} BL optimisé(s) par zone et créneau. Vous pouvez maintenant valider la sélection.`
    );
  };

  const handleValidateAll = () => {
    if (selectedIds.length === 0) return;

    selectedIds.forEach((deliveryId) => confirmDeliveryOrder(deliveryId));
    setActionMessage(
      `${selectedIds.length} BL validé(s) et prêt(s) pour la création d'une tournée.`
    );
  };

  return (
    <div className="bo-page gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Ordres de livraison</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Consultez les BL non affectés et sélectionnez-les pour créer une tournée.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="font-mono text-[13px] text-[#64748B]">
            Total : <strong>{filteredDeliveries.length}</strong> BL
          </span>
          <button
            type="button"
            onClick={handleCreateTour}
            disabled={selectedIds.length === 0}
            className={`bo-button-primary ${selectedIds.length === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <span className="material-symbols-outlined text-[18px]">alt_route</span>
            Créer une tournée ({selectedIds.length})
          </button>
        </div>
      </div>

      <div className="bo-panel grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1.7fr_1fr_1fr_1fr_1fr]">
        <label className="text-[13px] font-medium text-[#475569]">
          <span className="mb-1.5 block">Recherche</span>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#94a3b8]">
              search
            </span>
            <input
              type="text"
              placeholder="Rechercher un BL ou un client..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="bo-input w-full pl-9"
            />
          </div>
        </label>

        <label className="text-[13px] font-medium text-[#475569]">
          <span className="mb-1.5 block">Entrepôt</span>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#0057A8]">
              warehouse
            </span>
            <select
              className="bo-input w-full pl-9"
              value={warehouseFilter}
              onChange={(event) => {
                setWarehouseFilter(event.target.value);
                setDistrictFilter('Tous');
                setOptimizedOrderIds([]);
              }}
            >
              <option value="Tous">Tous les entrepôts</option>
              {WAREHOUSES.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
        </label>

        <FilterSelect
          label="Zone / Quartier"
          value={districtFilter}
          onChange={setDistrictFilter}
          allLabel="Toutes les zones"
          options={districts}
        />
        <FilterSelect
          label="Créneau"
          value={timeSlotFilter}
          onChange={setTimeSlotFilter}
          allLabel="Tous les créneaux"
          options={timeSlots}
        />
        <FilterSelect
          label="Type de véhicule"
          value={vehicleFilter}
          onChange={setVehicleFilter}
          allLabel="Tous les véhicules"
          options={['Fourgon', '3.5T', 'Camion']}
        />

        {selectedWarehouse && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-md border border-[#DBEAFE] bg-[#F8FBFF] px-3 py-2 text-[12px] text-[#475569] sm:col-span-2 xl:col-span-5">
            <span className="inline-flex items-center gap-1.5 font-bold text-[#0057A8]">
              <span className="material-symbols-outlined text-[17px]">warehouse</span>
              {selectedWarehouse.name}
            </span>
            <span>Code : <strong>{selectedWarehouse.code}</strong></span>
            <span>Adresse : <strong>{selectedWarehouse.address}</strong></span>
            <span>Capacité : <strong>{selectedWarehouse.capacity}</strong></span>
            <span>Zones desservies : <strong>{selectedWarehouse.zones.length}</strong></span>
          </div>
        )}
      </div>

      {actionMessage && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2.5 text-[13px] text-[#1E40AF]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{actionMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="font-bold text-[#0057A8] hover:opacity-70"
            aria-label="Fermer le message"
          >
            ×
          </button>
        </div>
      )}

      <div className="bo-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-2.5">
          <div className="text-[13px] text-[#64748B]">
            <strong className="text-[#1E293B]">{selectedIds.length}</strong> BL sélectionné(s)
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleOptimize}
              disabled={selectedIds.length === 0}
              className={`bo-button-primary h-8 px-3 text-[12px] ${
                selectedIds.length === 0 ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">conversion_path</span>
              Optimiser
            </button>
            <button
              type="button"
              onClick={handleValidateAll}
              disabled={selectedIds.length === 0}
              className={`bo-button-secondary h-8 px-3 text-[12px] ${
                selectedIds.length === 0 ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              Valider tous
            </button>
            {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedIds([]);
                setOptimizedOrderIds([]);
                setActionMessage(null);
              }}
              className="text-[12px] font-semibold text-[#0057A8] hover:underline"
            >
              Effacer la sélection
            </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto scrollbar-soft">
          <table className="bo-table min-w-[1180px]">
            <thead className="sticky top-0 z-10 border-b border-[#e2e8f0] bg-slate-50 text-[#64748b]">
              <tr>
                <th className="w-12 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleVisibleSelection}
                    aria-label="Sélectionner tous les BL visibles"
                    className="h-4 w-4 rounded border-[#CBD5E1] accent-[#0057A8]"
                  />
                </th>
                <th className="px-3 py-3 font-semibold">N° BL</th>
                <th className="px-3 py-3 font-semibold">Client</th>
                <th className="px-3 py-3 font-semibold">Entrepôt</th>
                <th className="px-3 py-3 font-semibold">Zone / Quartier</th>
                <th className="px-3 py-3 font-semibold">Créneau</th>
                <th className="px-3 py-3 font-semibold">Nb colis</th>
                <th className="px-3 py-3 font-semibold">Poids</th>
                <th className="px-3 py-3 font-semibold">Véhicule requis</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {displayedDeliveries.map((delivery) => {
                const logistics = getDeliveryLogistics(delivery);
                const warehouse = getDeliveryWarehouse(delivery);
                const selected = selectedIds.includes(delivery.id);

                return (
                  <tr
                    key={delivery.id}
                    className={`transition-colors ${selected ? 'bg-[#EFF6FF]' : 'hover:bg-slate-50/80'}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleDeliverySelection(delivery.id)}
                        aria-label={`Sélectionner ${formatBlNumber(delivery.orderId)}`}
                        className="h-4 w-4 rounded border-[#CBD5E1] accent-[#0057A8]"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono font-bold text-[#0057A8]">
                      {formatBlNumber(delivery.orderId)}
                    </td>
                    <td className="px-3 py-3 font-bold text-[#1e293b]">{delivery.customerName}</td>
                    <td className="px-3 py-3">
                      <p className="whitespace-nowrap font-semibold text-[#334155]">{warehouse.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-[#64748B]">{warehouse.code}</p>
                    </td>
                    <td className="px-3 py-3 text-[#64748b]">
                      {delivery.district}, {delivery.city}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold text-[#1e293b]">
                      {delivery.timeSlot}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[#334155]">
                      {logistics.packageCount} colis
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[#334155]">
                      {Math.round(logistics.totalWeight)} kg
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 text-[12px] font-semibold text-[#0057A8]">
                        {logistics.requiredVehicle}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedDelivery(delivery)}
                        title="Voir les détails du BL"
                        className="rounded border border-[#cbd5e1] px-2.5 py-1 text-xs font-semibold text-[#0057A8] hover:bg-slate-100"
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredDeliveries.length === 0 && (
            <div className="flex min-h-52 flex-col items-center justify-center px-4 text-center">
              <span className="material-symbols-outlined text-4xl text-[#94A3B8]">inventory_2</span>
              <p className="mt-3 font-semibold text-[#334155]">Aucun BL disponible</p>
              <p className="mt-1 text-sm text-[#64748B]">
                Modifiez les filtres pour afficher d'autres ordres de livraison.
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedDelivery && (
        <OrderDetailsModal
          delivery={selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
        />
      )}
    </div>
  );
};

const FilterSelect: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: string[];
}> = ({ label, value, onChange, allLabel, options }) => (
  <label className="text-[13px] font-medium text-[#475569]">
    <span className="mb-1.5 block">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="bo-input w-full"
    >
      <option value="Tous">{allLabel}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
    <p className="text-[12px] font-medium text-[#64748B]">{label}</p>
    <div className="mt-1 text-sm font-semibold text-[#1E293B]">{value}</div>
  </div>
);

const DetailSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-md border border-[#E2E8F0] p-3">
    <h3 className="mb-3 text-[13px] font-bold text-[#1E293B]">{title}</h3>
    {children}
  </section>
);

const OrderDetailsModal: React.FC<{ delivery: Delivery; onClose: () => void }> = ({ delivery, onClose }) => {
  const logistics = getDeliveryLogistics(delivery);
  const warehouse = getDeliveryWarehouse(delivery);

  return (
    <SimpleModal
      title={`Détails ${formatBlNumber(delivery.orderId)}`}
      subtitle="Informations complètes du bon de livraison"
      onClose={onClose}
    >
      <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5 scrollbar-soft">
        <DetailSection title="Informations BL">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem label="N° BL" value={formatBlNumber(delivery.orderId)} />
            <DetailItem label="Statut" value={delivery.status} />
            <DetailItem label="Entrepôt de départ" value={`${warehouse.name} · ${warehouse.code}`} />
            <DetailItem label="Créneau de livraison" value={delivery.timeSlot} />
            <DetailItem
              label="Valeur de la marchandise"
              value={`${logistics.goodsValue.toLocaleString('fr-FR')} MAD`}
            />
          </div>
        </DetailSection>

        <DetailSection title="Client & destination">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem label="Client" value={delivery.customerName} />
            <DetailItem label="Téléphone" value={delivery.phone} />
            <div className="sm:col-span-2">
              <DetailItem label="Adresse complète" value={delivery.address} />
            </div>
            <DetailItem label="Zone / quartier / ville" value={`${delivery.district}, ${delivery.city}`} />
            <DetailItem
              label="Coordonnées GPS"
              value={`${delivery.coordinates.lat}, ${delivery.coordinates.lng}`}
            />
          </div>
        </DetailSection>

        <DetailSection title="Informations logistiques">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem label="Nombre de colis" value={`${logistics.packageCount} colis`} />
            <DetailItem label="Poids total" value={`${Math.round(logistics.totalWeight)} kg`} />
            <DetailItem label="Type de véhicule requis" value={logistics.requiredVehicle} />
          </div>
        </DetailSection>

        <DetailSection title="Articles">
          <div className="divide-y divide-[#F1F5F9]">
            {delivery.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-semibold text-[#1e293b]">{item.name}</p>
                  <p className="text-[12px] text-[#64748B]">
                    {item.ref} · {item.category} · {item.weight}
                  </p>
                </div>
                <span className="font-mono text-[13px] text-[#475569]">x{item.quantity}</span>
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection title="Instructions de livraison">
          <p className="text-sm leading-6 text-[#475569]">
            {delivery.instructions || 'Aucune instruction particulière.'}
          </p>
        </DetailSection>

        <div className="flex justify-end border-t border-[#E2E8F0] pt-4">
          <button type="button" onClick={onClose} className="bo-button-secondary">
            Fermer
          </button>
        </div>
      </div>
    </SimpleModal>
  );
};
