import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_DELIVERIES, INITIAL_TOURS, INITIAL_VEHICLES } from '../src/data/tmsMockData';
import { buildOperationalIncidents } from '../src/utils/operationalIncidents';
import { formatDeliveryDate, prepareFailedDeliveryTreatment, synchronizeDeliveryStatus } from '../src/utils/deliveryRecovery';
import { getCloseTourError, getVisibleDriverTourStops } from '../src/utils/workflow';
import { getDeliveryWarehouse, getTourLoadError, getTourZoneLabel, WAREHOUSES } from '../src/data/logisticsReference';
import type { FailedDeliveryTreatment } from '../src/types';

const delivery = INITIAL_DELIVERIES.find((item) => item.id === 'CMD-45792')!;
const incident = buildOperationalIncidents([], [delivery])[0];
const timestamp = '2026-09-28T12:00:00Z';
const payload: FailedDeliveryTreatment = {
  action: 'retry', note: 'Adresse vérifiée avec le client.', confirmed: true,
  date: '2026-09-29', startTime: '10:00', endTime: '11:00',
  address: '12, rue Al Qods', phone: delivery.phone, district: delivery.district, city: delivery.city,
  warehouseId: 'CAS-CENTRE', coordinates: { lat: 33.56, lng: -7.61 },
};

test('reprise : conserve la tournée et la preuve d’échec, crée un seul BL à planifier avec une date', () => {
  const original = { ...delivery, failurePhotoUrl: 'photo-echec', arrivalTime: '10:05', deliveryTime: '10:10',
    items: delivery.items.map((item) => ({ ...item, checked: true })) };
  const before = structuredClone(original);
  const result = prepareFailedDeliveryTreatment([original], { ...incident, resolved: true }, delivery.id, payload, timestamp);
  assert.ok(result.success);
  const old = result.deliveries.find((item) => item.id === delivery.id)!;
  const next = result.deliveries.find((item) => !item.tourId)!;
  assert.equal(old.tourId, original.tourId);
  assert.equal(old.failurePhotoUrl, 'photo-echec');
  assert.equal(old.status, 'Échec');
  assert.equal(next.orderId, old.orderId);
  assert.notEqual(next.id, old.id);
  assert.equal(next.previousAttemptId, old.id);
  assert.equal(old.nextAttemptId, next.id);
  assert.equal(next.deliveryDate, '29 Septembre 2026');
  assert.equal(next.status, 'À planifier');
  assert.equal(next.driverId, '');
  assert.equal(next.arrivalTime, undefined);
  assert.equal(next.deliveryTime, undefined);
  assert.equal(next.failurePhotoUrl, undefined);
  assert.ok(next.items.every((item) => !item.checked));
  assert.deepEqual(original, before);
  assert.equal(result.incident.treatment?.nextAttemptId, next.id);
  assert.equal(prepareFailedDeliveryTreatment(result.deliveries, result.incident, delivery.id, payload, timestamp).success, false);
});

test('l’ancienne tournée à un seul arrêt reste clôturable après la reprise', () => {
  const single = INITIAL_DELIVERIES.find((item) => item.id === 'CMD-45791')!;
  const failure = buildOperationalIncidents([], [single])[0];
  const result = prepareFailedDeliveryTreatment([single], failure, single.id,
    { ...payload, address: single.address, district: single.district, city: single.city, warehouseId: 'CAS-SUD', phone: single.phone }, timestamp);
  assert.ok(result.success);
  assert.equal(getCloseTourError(INITIAL_TOURS.find((tour) => tour.id === single.tourId), result.deliveries), null);
});

test('la tentative reprise quitte la liste mobile de l’ancienne tournée sans perdre son historique', () => {
  const result = prepareFailedDeliveryTreatment([delivery], incident, delivery.id, payload, timestamp);
  assert.ok(result.success);
  const old = result.deliveries[0];
  const next = result.deliveries[1];
  assert.equal(old.status, 'Échec');
  assert.equal(old.tourId, delivery.tourId);
  assert.equal(getVisibleDriverTourStops(result.deliveries, delivery.tourId).length, 0);
  assert.deepEqual(getVisibleDriverTourStops([{ ...next, tourId: 'TR-NOUVELLE' }], 'TR-NOUVELLE').map((item) => item.id), [next.id]);
  assert.equal(result.deliveries.filter((item) => item.id === old.id).length, 1);
});

test('client absent : reprise autorisée sans changer l’adresse ni le téléphone', () => {
  const absent = { ...delivery, failureReason: 'Client absent', failureComment: 'Téléphone vérifié et correct.' };
  assert.equal(prepareFailedDeliveryTreatment([absent], incident, absent.id,
    { ...payload, address: absent.address, coordinates: undefined }, timestamp).success, true);
});

test('adresse modifiée : refuse une localisation manquante ou invalide', () => {
  for (const coordinates of [undefined, { lat: NaN, lng: 0 }, { lat: 95, lng: 0 }]) {
    assert.equal(prepareFailedDeliveryTreatment([delivery], incident, delivery.id, { ...payload, coordinates }, timestamp).success, false);
  }
  assert.equal(prepareFailedDeliveryTreatment([delivery], incident, delivery.id, { ...payload, address: delivery.address }, timestamp).success, false);
});

test('refuse une date impossible, un créneau inversé et une décision non confirmée', () => {
  for (const changes of [{ date: '' }, { date: '2026-02-30' }, { endTime: '09:00' }, { confirmed: false }, { note: ' ' }]) {
    assert.equal(prepareFailedDeliveryTreatment([delivery], incident, delivery.id, { ...payload, ...changes }, timestamp).success, false);
  }
  assert.equal(formatDeliveryDate('2028-02-29'), '29 Février 2028');
});

test('produit endommagé : exige un remplacement confirmé ou un retour reçu', () => {
  const damaged = { ...delivery, failureReason: 'Produit endommagé' };
  assert.equal(prepareFailedDeliveryTreatment([damaged], incident, damaged.id, payload, timestamp).success, false);
  assert.equal(prepareFailedDeliveryTreatment([damaged], incident, damaged.id, { ...payload, action: 'replace' }, timestamp).success, true);
  const result = prepareFailedDeliveryTreatment([damaged], incident, damaged.id, { ...payload, action: 'return', date: '' }, timestamp);
  assert.ok(result.success);
  assert.equal(result.deliveries.length, 1);
  assert.equal(result.deliveries[0].status, 'Retournée');
  assert.equal(result.deliveries[0].tourId, damaged.tourId);
  assert.equal(result.incident.treatment?.action, 'return');
});

test('une seconde tentative échouée peut être reprise sans écraser la première', () => {
  const first = prepareFailedDeliveryTreatment([delivery], incident, delivery.id, payload, timestamp);
  assert.ok(first.success);
  const second = { ...first.deliveries[1], status: 'Échec' as const, tourId: 'nouvelle-tournee', failureReason: 'Client absent' };
  const secondIncident = { ...incident, id: 'second', deliveryId: second.id };
  const result = prepareFailedDeliveryTreatment([first.deliveries[0], second], secondIncident, second.id, payload, timestamp);
  assert.ok(result.success);
  assert.equal(result.deliveries.length, 3);
  assert.equal(new Set(result.deliveries.map((item) => item.id)).size, 3);
  assert.equal(new Set(result.deliveries.map((item) => item.orderId)).size, 1);
});

test('statuts de livraison et e-POD cohérents jusqu’à validation et après rejet', () => {
  for (const status of ['À confirmer', 'À planifier', 'Affectée', 'En route', 'Arrivé', 'Livraison en cours', 'À valider', 'Rejetée', 'Validée', 'Échec', 'Retournée'] as const) {
    const item = synchronizeDeliveryStatus({ ...delivery, status });
    assert.equal(item.podStatus, ['À valider', 'Rejetée', 'Validée'].includes(status) ? status : 'À collecter');
    if (['À valider', 'Rejetée', 'Validée'].includes(status)) assert.equal(item.deliveryStatus, 'Livrée');
  }
});

test('l’entrepôt explicite et le véhicule sont contrôlés avant affectation', () => {
  const item = { ...delivery, warehouseId: 'CAS-CENTRE', requiredVehicle: '3.5T' as const, totalWeightKg: 100 };
  const vehicle = { ...INITIAL_VEHICLES[0], type: '3.5T' as const, maxLoadKg: 150 };
  assert.equal(getDeliveryWarehouse(item)?.id, 'CAS-CENTRE');
  assert.equal(getTourLoadError([item], vehicle, getTourZoneLabel(WAREHOUSES[1])), null);
  assert.ok(getTourLoadError([item], vehicle, getTourZoneLabel(WAREHOUSES[0])));
  assert.ok(getTourLoadError([item], { ...vehicle, type: 'Fourgon' }));
  assert.ok(getTourLoadError([item, { ...item, id: 'other' }], vehicle));
  assert.ok(getTourLoadError([item], { ...vehicle, maxLoadKg: undefined }));
});

test('la catégorie historique d’un rejet ne dépend plus du statut actuel du BL', () => {
  const old = { ...incident, sourceStatus: undefined, type: 'Preuve rejetée par le backoffice', resolved: true };
  const current = { ...delivery, status: 'À valider' as const };
  assert.equal(buildOperationalIncidents([old], [current])[0].sourceStatus, 'Rejetée');
});
