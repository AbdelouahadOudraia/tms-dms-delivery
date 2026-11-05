import type { Delivery } from '../types';
import type { SalesBlRequest, SalesDossier } from '../types/sales';
import { WAREHOUSES } from '../data/logisticsReference';
import { formatDeliveryDate } from './deliveryRecovery';

export const getSaleKey = (sale: Pick<SalesDossier, 'systemId' | 'id'>) => `${sale.systemId}:${sale.id}`;

export const mergeSalesDossiers = (existing: SalesDossier[], incoming: SalesDossier[]) => {
  const keys = new Set(existing.map((sale) => `${sale.systemId}:${sale.id}`));
  const references = new Set(existing.map((sale) => `${sale.systemId}:${sale.reference}`));
  const additions: SalesDossier[] = [];
  let duplicates = 0;
  incoming.forEach((sale) => {
    const key = `${sale.systemId}:${sale.id}`, reference = `${sale.systemId}:${sale.reference}`;
    if (keys.has(key) || references.has(reference)) { duplicates++; return; }
    keys.add(key); references.add(reference); additions.push(structuredClone(sale));
  });
  return { dossiers: [...existing, ...additions], imported: additions.length, duplicates };
};

export const getSaleRemaining = (sale: SalesDossier, deliveries: Delivery[]) => {
  const covered: Record<string, number> = {};
  const countedBls = new Set<string>();
  for (const delivery of deliveries) {
    const source = delivery.sourceSale;
    if (!source || source.systemId !== sale.systemId || source.dossierId !== sale.id || countedBls.has(delivery.orderId)) continue;
    countedBls.add(delivery.orderId);
    source.lines.forEach((line) => { covered[line.saleLineId] = (covered[line.saleLineId] || 0) + line.quantity; });
  }
  return Object.fromEntries(sale.items.map((line) => [line.id, Math.max(0, line.quantity - (covered[line.id] || 0))]));
};

export const getSaleEligibilityError = (sale: SalesDossier, deliveries: Delivery[], eligibleStatuses: string[] = ['Payé']): string | null => {
  if (!eligibleStatuses.includes(sale.commercialStatus)) return 'Le statut commercial ne permet pas de générer un BL selon les règles de l’entreprise.';
  if (sale.collectionMode !== 'À livrer') return 'Ce dossier ne prévoit pas de livraison à domicile.';
  if (sale.reviewRequired) return sale.reviewRequired;
  if (!sale.customerName.trim()) return 'Le dossier source doit préciser le nom du client.';
  if (!sale.items.length || new Set(sale.items.map((line) => line.id)).size !== sale.items.length || sale.items.some((line) => !Number.isSafeInteger(line.quantity) || line.quantity < 1)) return 'Les lignes du dossier sont invalides.';
  if (Object.values(getSaleRemaining(sale, deliveries)).every((quantity) => quantity === 0)) return 'Toutes les quantités sont déjà couvertes par un BL.';
  return null;
};

export const getSalesDossiersToConvert = (dossiers: SalesDossier[], deliveries: Delivery[], eligibleStatuses: string[] = ['Payé']) =>
  dossiers.filter((sale) => getSaleEligibilityError(sale, deliveries, eligibleStatuses) === null);

// Filter at the import boundary as well as in the screen. Historical source
// records stay available for traceability after their BLs have been generated.
export const importSalesDossiersToConvert = (existing: SalesDossier[], incoming: SalesDossier[], deliveries: Delivery[]) => {
  const eligible = getSalesDossiersToConvert(incoming, deliveries);
  return { ...mergeSalesDossiers(existing, eligible), references: eligible.map((sale) => sale.reference) };
};

export const getSaleGenerationState = (sale: SalesDossier, deliveries: Delivery[]) => {
  const remaining = getSaleRemaining(sale, deliveries);
  const total = sale.items.reduce((sum, line) => sum + line.quantity, 0);
  const pending = Object.values(remaining).reduce((sum, quantity) => sum + quantity, 0);
  return pending === 0 && total > 0 ? 'BL générés' : pending < total ? 'Partiellement généré' : 'À générer';
};

export const prepareSalesBlRequest = (sale: SalesDossier, deliveries: Delivery[]): SalesBlRequest => {
  const quantities = getSaleRemaining(sale, deliveries);
  const weight = sale.items.reduce((sum, line) => sum + line.unitWeightKg * quantities[line.id], 0);
  return {
    dossierId: sale.id, systemId: sale.systemId, quantities, phone: sale.phone, address: sale.address, district: sale.district, city: sale.city,
    date: sale.date, startTime: sale.startTime, endTime: sale.endTime, warehouseId: sale.warehouseId,
    latitude: sale.latitude, longitude: sale.longitude, instructions: sale.instructions,
    packageCount: Math.max(1, Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0)),
    requiredVehicle: weight >= 80 ? 'Camion' : weight >= 35 || sale.items.some((line) => line.category === 'Lourd') ? '3.5T' : 'Fourgon',
  };
};

// A dossier can produce several partial BLs. A retry of delivery keeps the same BL
// and must never consume the sales quantities a second time.
export const generateSalesBls = (
  dossiers: SalesDossier[], deliveries: Delivery[], requests: SalesBlRequest[], timestamp: string, eligibleStatuses: string[] = ['Payé']
): Delivery[] => {
  if (!requests.length) throw new Error('Sélectionnez au moins un dossier de vente.');
  if (new Set(requests.map((request) => `${request.systemId}:${request.dossierId}`)).size !== requests.length) throw new Error('Un dossier ne peut être sélectionné qu’une fois dans cette génération.');
  const occupied = new Set(deliveries.map((delivery) => delivery.orderId.replace(/^CMD-/, 'BL-')));
  const generated: Delivery[] = [];
  let sequence = 1;
  for (const request of requests) {
    const sale = dossiers.find((dossier) => dossier.id === request.dossierId && dossier.systemId === request.systemId);
    if (!sale) throw new Error('Un dossier sélectionné est introuvable.');
    const fail = (message: string): never => { throw new Error(`${sale.reference} : ${message}`); };
    const eligibility = getSaleEligibilityError(sale, [...deliveries, ...generated], eligibleStatuses);
    if (eligibility) fail(eligibility);
    const remaining = getSaleRemaining(sale, [...deliveries, ...generated]);
    if (Object.keys(request.quantities).some((id) => !sale.items.some((line) => line.id === id))) fail('Une ligne sélectionnée n’appartient pas à ce dossier.');
    const selected = sale.items.filter((line) => (request.quantities[line.id] ?? 0) > 0)
      .map(line => ({ ...line, unitWeightKg: line.unitWeightKg ?? request.unitWeights?.[line.id] }));
    if (!selected.length) fail('Sélectionnez au moins une quantité à livrer.');
    if (sale.items.some((line) => { const quantity = request.quantities[line.id] ?? 0; return !Number.isSafeInteger(quantity) || quantity < 0 || quantity > remaining[line.id]; })) fail('Les quantités doivent être entières et ne pas dépasser le reste à livrer.');
    if (selected.some((line) => !line.name.trim() || !line.ref.trim() || !Number.isFinite(line.unitWeightKg) || line.unitWeightKg <= 0 || !Number.isFinite(line.unitValue) || line.unitValue < 0)) fail('Vérifiez les références, les poids et les valeurs des articles.');
    const date = formatDeliveryDate(request.date);
    if (!date) fail('Renseignez une date de livraison valide.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(request.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(request.endTime) || request.endTime <= request.startTime) fail('Le créneau doit se terminer après son heure de début.');
    if (!request.address.trim() || !request.city.trim()) fail('Complétez l’adresse et la ville.');
    if (!/^\+?\d{9,15}$/.test(request.phone.replace(/[\s().-]/g, ''))) fail('Complétez un numéro de téléphone valide.');
    const warehouse = WAREHOUSES.find((item) => item.id === request.warehouseId);
    if (!warehouse?.zones.includes(request.district)) fail('Choisissez un entrepôt desservant le quartier.');
    if (!Number.isSafeInteger(request.packageCount) || request.packageCount < 1) fail('Le nombre de colis doit être un entier supérieur à zéro.');
    if (!['Fourgon', '3.5T', 'Camion'].includes(request.requiredVehicle)) fail('Choisissez un type de véhicule valide.');
    const lat = Number(request.latitude), lng = Number(request.longitude);
    if (!request.latitude.trim() || !request.longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) fail('Renseignez les coordonnées GPS vérifiées de la destination.');
    let reference: string;
    do { reference = `BL-${request.date.slice(0, 4)}-${String(sequence++).padStart(5, '0')}`; } while (occupied.has(reference));
    occupied.add(reference);
    const totalWeightKg = selected.reduce((sum, line) => sum + line.unitWeightKg * request.quantities[line.id], 0);
    const goodsValue = selected.reduce((sum, line) => sum + line.unitValue * request.quantities[line.id], 0);
    if (!Number.isFinite(totalWeightKg) || !Number.isFinite(goodsValue)) fail('Le poids ou la valeur de la marchandise est invalide.');
    generated.push({
      id: reference, orderId: reference, deliveryDate: date!, customerName: sale.customerName,
      phone: request.phone.trim(), address: request.address.trim(), district: request.district, city: request.city.trim(),
      timeSlot: `${request.startTime} – ${request.endTime}`, status: 'À confirmer',
      tourId: '', sequence: 0, driverId: '', driverName: 'Non affecté', vehicleId: '', warehouseId: warehouse!.id,
      packageCount: request.packageCount, totalWeightKg, requiredVehicle: request.requiredVehicle, goodsValue,
      coordinates: { lat, lng }, instructions: request.instructions.trim(),
      items: selected.map((line, index) => ({ id: `${reference}-ART-${index + 1}`, ref: line.ref, name: line.name,
        quantity: request.quantities[line.id], weight: `${line.unitWeightKg} kg`, category: line.category, checked: false })),
      sourceSale: { systemId: sale.systemId, systemName: sale.systemName, dossierId: sale.id,
        dossierReference: sale.reference, generatedAt: timestamp,
        lines: selected.map((line) => ({ saleLineId: line.id, quantity: request.quantities[line.id] })) },
    });
  }
  return generated;
};
