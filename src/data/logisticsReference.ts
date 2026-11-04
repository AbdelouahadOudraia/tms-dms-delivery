import type { Delivery, Vehicle } from '../types';

export type RequiredVehicle = 'Fourgon' | '3.5T' | 'Camion';

export interface WarehouseInfo {
  id: string;
  name: string;
  code: string;
  address: string;
  capacity: string;
  zones: string[];
}

export interface DeliveryLogistics {
  packageCount: number;
  totalWeight: number;
  requiredVehicle: RequiredVehicle;
  goodsValue: number;
}

export const WAREHOUSES: WarehouseInfo[] = [
  {
    id: 'CAS-OUEST',
    name: 'Casablanca Hub Ouest',
    code: 'DEP-CAS-O',
    address: "Zone logistique Lissasfa, route d'El Jadida",
    capacity: '1 600 palettes',
    zones: [
      'Maarif',
      'Maarif Extension',
      'Ain Diab',
      'Hay Hassani',
      'Bourgogne',
      'CIL',
      'Oasis',
      'Anfa',
      'Palmier',
      'Beauséjour',
      'Derb Ghallef',
    ],
  },
  {
    id: 'CAS-CENTRE',
    name: 'Casablanca Hub Centre',
    code: 'DEP-CAS-C',
    address: 'Roches Noires, Casablanca',
    capacity: '1 200 palettes',
    zones: [
      'Centre Ville',
      'Ghandi',
      'Racine',
      'Sidi Belyout',
      'Belvédère',
      'Derb Sultan',
      'Roches Noires',
    ],
  },
  {
    id: 'CAS-EST',
    name: 'Casablanca Hub Est',
    code: 'DEP-CAS-E',
    address: 'Zone industrielle Ain Sebaa, Casablanca',
    capacity: '2 000 palettes',
    zones: ['Ain Sebaa', 'Sidi Moumen', 'Hay Mohammadi'],
  },
  {
    id: 'CAS-SUD',
    name: 'Casablanca Hub Sud',
    code: 'DEP-CAS-S',
    address: 'Parc industriel Bouskoura',
    capacity: '900 palettes',
    zones: ['Bouskoura', 'Californie', 'Sidi Maarouf'],
  },
];

export const getWarehouseForDistrict = (district: string) =>
  WAREHOUSES.find((warehouse) =>
    warehouse.zones.some((zone) => zone.toLocaleLowerCase('fr') === district.toLocaleLowerCase('fr'))
  );

export const getDeliveryWarehouse = (delivery: Delivery) => delivery.warehouseId
  ? WAREHOUSES.find((warehouse) => warehouse.id === delivery.warehouseId)
  : getWarehouseForDistrict(delivery.district);

export const getTourLoadError = (deliveries: Delivery[], vehicle: Vehicle, zone?: string): string | null => {
  if (!deliveries.length) return null;
  if (zone) {
    const warehouse = WAREHOUSES.find((item) => getTourZoneLabel(item) === zone || item.name === zone);
    if (!warehouse || deliveries.some((delivery) => getDeliveryWarehouse(delivery)?.id !== warehouse.id)) {
      return 'Les BL doivent partir du même entrepôt, correspondant à la zone choisie.';
    }
  }
  if (!vehicle.type || !Number.isFinite(vehicle.maxLoadKg) || vehicle.maxLoadKg! <= 0) {
    return 'Renseignez le type et la charge utile du véhicule avant son affectation.';
  }
  const logistics = deliveries.map(getDeliveryLogistics);
  const ranks = { Fourgon: 1, '3.5T': 2, Camion: 3 };
  if (logistics.some((item) => ranks[item.requiredVehicle] > ranks[vehicle.type!])) {
    return 'Le type de véhicule ne convient pas à tous les BL sélectionnés.';
  }
  const weight = logistics.reduce((sum, item) => sum + item.totalWeight, 0);
  return weight > vehicle.maxLoadKg!
    ? `Charge totale ${weight} kg : la charge utile du véhicule est de ${vehicle.maxLoadKg} kg.` : null;
};

export const getTourZoneLabel = (warehouse: WarehouseInfo) =>
  `${warehouse.name} (${warehouse.zones.join(', ')})`;

export const TOUR_ZONE_OPTIONS = WAREHOUSES.map(getTourZoneLabel);

export const getDistrictsFromTourZone = (zoneLabel: string) => {
  const warehouse = WAREHOUSES.find(
    (item) => getTourZoneLabel(item) === zoneLabel || item.name === zoneLabel
  );
  return warehouse?.zones.map((district) => district.toLocaleLowerCase('fr')) || [];
};

export const getTourZoneForDistrict = (district: string) => {
  const warehouse = getWarehouseForDistrict(district);
  return warehouse ? getTourZoneLabel(warehouse) : TOUR_ZONE_OPTIONS[0];
};

const parseWeight = (weight: string) => {
  const normalized = weight.replace(',', '.').replace(/[^\d.]/g, '');
  return Number.parseFloat(normalized) || 0;
};

export const getDeliveryLogistics = (delivery: Delivery): DeliveryLogistics => {
  const packageCount =
    delivery.packageCount ?? delivery.items.reduce((total, item) => total + item.quantity, 0);
  const totalWeight =
    delivery.totalWeightKg ??
    delivery.items.reduce((total, item) => total + parseWeight(item.weight) * item.quantity, 0);
  const hasBulkyItem = delivery.items.some((item) => item.category === 'Lourd');
  const requiredVehicle =
    delivery.requiredVehicle ??
    (totalWeight >= 80 ? 'Camion' : totalWeight >= 35 || hasBulkyItem ? '3.5T' : 'Fourgon');
  const goodsValue =
    delivery.goodsValue ??
    delivery.items.reduce((total, item) => {
      const unitValue = item.category === 'Fragile' ? 3400 : item.category === 'Lourd' ? 5200 : 1800;
      return total + unitValue * item.quantity;
    }, 0);

  return { packageCount, totalWeight, requiredVehicle, goodsValue };
};
