import type { SalesDossier } from '../types/sales';

// Fictional contract for this prototype. It does not describe Seller's real API.
const paidDelivery: SalesDossier = {
  id: 'seller-demo-001', systemId: 'seller-demo', systemName: 'Seller', reference: 'DV-DEMO-001',
  commercialStatus: 'Payé', collectionMode: 'À livrer', customerName: 'Amal Benjelloun',
  phone: '06 62 14 28 90', address: '24 Rue Socrate, résidence Al Amal, appartement 8',
  district: 'Maarif', city: 'Casablanca', date: '2026-09-22', startTime: '09:00', endTime: '10:00',
  warehouseId: 'CAS-OUEST', latitude: '33.5732', longitude: '-7.6379',
  instructions: 'Appeler avant l’arrivée. Ascenseur disponible.',
  items: [
    { id: 'line-001-a', ref: 'LL-8KG-01', name: 'Lave-linge 8 kg', quantity: 2, unitWeightKg: 65, unitValue: 5999, category: 'Lourd' },
    { id: 'line-001-b', ref: 'KIT-LL-01', name: 'Kit de raccordement', quantity: 2, unitWeightKg: 2, unitValue: 299, category: 'Standard' },
  ],
};

export const DEMO_SALES_DOSSIERS: SalesDossier[] = [
  paidDelivery,
  { ...paidDelivery, id: 'seller-demo-002', reference: 'DV-DEMO-002', customerName: 'Rachid El Idrissi',
    address: '18 Rue de la Corniche, résidence Les Pins', district: 'Ain Diab', startTime: '10:00', endTime: '11:00',
    latitude: '33.5914', longitude: '-7.6702',
    items: [{ id: 'line-002-a', ref: 'TV-55-01', name: 'Téléviseur LED 55 pouces', quantity: 1, unitWeightKg: 18, unitValue: 4999, category: 'Fragile' }] },
  { ...paidDelivery, id: 'seller-demo-003', reference: 'DV-DEMO-003', customerName: 'Meryem Chraibi', commercialStatus: 'Brouillon' },
  { ...paidDelivery, id: 'seller-demo-004', reference: 'DV-DEMO-004', customerName: 'Adil El Fassi', commercialStatus: 'En caisse' },
  { ...paidDelivery, id: 'seller-demo-005', reference: 'DV-DEMO-005', customerName: 'Salma Amrani', collectionMode: 'À emporter' },
  { ...paidDelivery, id: 'seller-demo-006', reference: 'DV-DEMO-006', customerName: 'Nadia Berrada',
    address: '', phone: '', district: 'Ghandi', warehouseId: 'CAS-CENTRE', latitude: '33.5745', longitude: '-7.6501',
    startTime: '14:00', endTime: '15:00',
    items: [{ id: 'line-006-a', ref: 'REF-300-01', name: 'Réfrigérateur combiné', quantity: 1, unitWeightKg: 72, unitValue: 7299, category: 'Lourd' }] },
  { ...paidDelivery, id: 'seller-demo-007', reference: 'DV-DEMO-007', customerName: 'Omar Tazi', commercialStatus: 'Annulé' },
  { ...paidDelivery, id: 'seller-demo-008', reference: 'DV-DEMO-008', customerName: 'Sara Alaoui', collectionMode: 'À récupérer' },
];
