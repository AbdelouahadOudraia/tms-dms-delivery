import type { Delivery } from '../types';

const DATES = ['19 Septembre 2026', '20 Septembre 2026', '21 Septembre 2026'];

const WAREHOUSE_CASES = [
  {
    id: 'CAS-OUEST',
    districts: ['Anfa', 'Derb Ghallef'],
    addresses: ['8 Rue Ibn Khaldoun', '30 Rue Tarik Ibn Ziad'],
    coordinates: [{ lat: 33.5924, lng: -7.6521 }, { lat: 33.5781, lng: -7.6254 }],
  },
  {
    id: 'CAS-CENTRE',
    districts: ['Centre Ville', 'Roches Noires'],
    addresses: ['12 Avenue Hassan II', '44 Boulevard Moulay Ismail'],
    coordinates: [{ lat: 33.5898, lng: -7.6192 }, { lat: 33.6008, lng: -7.5891 }],
  },
  {
    id: 'CAS-EST',
    districts: ['Ain Sebaa', 'Hay Mohammadi'],
    addresses: ['Zone Industrielle, Allée 8', '16 Rue des Fleurs'],
    coordinates: [{ lat: 33.6113, lng: -7.5372 }, { lat: 33.5962, lng: -7.5664 }],
  },
  {
    id: 'CAS-SUD',
    districts: ['Bouskoura', 'Sidi Maarouf'],
    addresses: ['Parc industriel, Lot 14', 'Technopark, Bureau 410'],
    coordinates: [{ lat: 33.4491, lng: -7.6483 }, { lat: 33.5304, lng: -7.6412 }],
  },
] as const;

const CUSTOMER_NAMES = [
  'Salma Amrani', 'Ilyas Berrada', 'Meryem Chraibi', 'Adil El Fassi',
  'Sofia Kabbaj', 'Othmane Lahlou', 'Kenza Mansouri', 'Zakaria Naciri',
  'Lamia Rami', 'Noureddine Sekkat', 'Houda Tazi', 'Yassine Alaoui',
  'Imane Benjelloun', 'Karim Filali', 'Sara Idrissi', 'Mehdi Lazrak',
  'Nadia Mernissi', 'Anas Tahiri', 'Ghita Bennani', 'Reda El Ghali',
  'Samir Chakor', 'Hajar Daoudi', 'Rania Senhaji', 'Ayoub Ziani',
];

const VEHICLE_CASES = [
  { requiredVehicle: 'Fourgon' as const, totalWeightKg: 18, packageCount: 1, itemName: 'Téléviseur LED 43 pouces', category: 'Fragile' as const },
  { requiredVehicle: '3.5T' as const, totalWeightKg: 68, packageCount: 3, itemName: 'Lave-linge avec kit d’installation', category: 'Lourd' as const },
  { requiredVehicle: 'Camion' as const, totalWeightKg: 185, packageCount: 6, itemName: 'Ensemble électroménager complet', category: 'Lourd' as const },
];

export const ADDITIONAL_UNASSIGNED_DELIVERIES: Delivery[] = DATES.flatMap(
  (deliveryDate, dateIndex) =>
    WAREHOUSE_CASES.flatMap((warehouse, warehouseIndex) =>
      warehouse.districts.map((district, stopIndex) => {
        const rowIndex = dateIndex * WAREHOUSE_CASES.length * 2 + warehouseIndex * 2 + stopIndex;
        const vehicleCase = VEHICLE_CASES[(dateIndex + warehouseIndex + stopIndex) % VEHICLE_CASES.length];
        const orderNumber = 46000 + rowIndex;
        const status = (rowIndex % 3 === 0 ? 'À planifier' : 'À confirmer') as Delivery['status'];

        return {
          id: `CMD-${orderNumber}`,
          orderId: `CMD-${orderNumber}`,
          deliveryDate,
          customerName: CUSTOMER_NAMES[rowIndex],
          phone: `06 ${String(30 + rowIndex).padStart(2, '0')} ${String(40 + rowIndex).padStart(2, '0')} ${String(50 + rowIndex).padStart(2, '0')} ${String(60 + rowIndex).padStart(2, '0')}`,
          address: warehouse.addresses[stopIndex],
          district,
          city: 'Casablanca',
          timeSlot: stopIndex === 0 ? '09:00 – 10:00' : '11:00 – 12:00',
          status,
          tourId: '',
          sequence: 0,
          driverId: '',
          driverName: 'Non affecté',
          vehicleId: '',
          warehouseId: warehouse.id,
          packageCount: vehicleCase.packageCount,
          totalWeightKg: vehicleCase.totalWeightKg,
          requiredVehicle: vehicleCase.requiredVehicle,
          goodsValue: 4500 + rowIndex * 725,
          instructions:
            stopIndex === 0
              ? 'Appeler le client 15 minutes avant la livraison.'
              : 'Accès avec gardien, présenter le bon de livraison.',
          coordinates: warehouse.coordinates[stopIndex],
          items: [
            {
              id: `it-extra-${orderNumber}`,
              name: vehicleCase.itemName,
              ref: `EP-${orderNumber}`,
              quantity: vehicleCase.packageCount,
              weight: `${vehicleCase.totalWeightKg} kg`,
              category: vehicleCase.category,
            },
          ],
        };
      })
    )
);
