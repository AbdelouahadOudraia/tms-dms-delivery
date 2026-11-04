import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_DELIVERIES, INITIAL_TOURS, INITIAL_DRIVERS, INITIAL_VEHICLES } from '../src/data/tmsMockData';
import { canFailDelivery, canWorkDelivery, getAssignmentError, getCloseTourError, getDriverTour, getNextStop, reorderRemainingStops, sortDeliveriesByTimeSlot } from '../src/utils/workflow';
import { buildOperationalIncidents, countOpenOperationalIncidents } from '../src/utils/operationalIncidents';
import { getWarehouseForDistrict } from '../src/data/logisticsReference';
import type { Delivery, Driver, Incident, Tour, Vehicle } from '../src/types';

const driver: Driver = { ...INITIAL_DRIVERS[0], id: 'driver', status: 'Disponible', currentTourId: undefined };
const vehicle: Vehicle = { ...INITIAL_VEHICLES[0], id: 'vehicle', status: 'Disponible', assignedDriverId: undefined };
const tour: Tour = { ...INITIAL_TOURS[0], id: 'tour', driverId: driver.id, vehicleId: vehicle.id, status: 'En cours' };
const stop = (id: string, sequence: number, status: Delivery['status'] = 'Affectée', district = 'Maarif'): Delivery =>
  ({ ...INITIAL_DELIVERIES[0], id, sequence, status, district, driverId: driver.id, tourId: tour.id });

test('un chauffeur sans tournée ne reçoit jamais celle d’un autre chauffeur', () => {
  assert.equal(getDriverTour([tour], { ...driver, id: 'other' }), undefined);
  assert.equal(getDriverTour([tour], { ...driver, id: 'other', currentTourId: tour.id }), undefined);
  assert.equal(getDriverTour([{ ...tour, status: 'Terminée' }], driver), undefined);
  assert.equal(getDriverTour([{ ...tour, status: 'Annulée' }], driver), undefined);
  assert.equal(getDriverTour([tour], driver)?.id, tour.id);
});

test('les actions terrain sont limitées au chauffeur affecté et aux tournées actives', () => {
  const delivery = stop('a', 1);
  assert.equal(canWorkDelivery(delivery, 'other', [tour]), false);
  assert.equal(canWorkDelivery({ ...delivery, tourId: '' }, driver.id, [tour]), false);
  assert.equal(canWorkDelivery(delivery, driver.id, [{ ...tour, status: 'Terminée' }]), false);
  assert.equal(canWorkDelivery(delivery, driver.id, [tour]), true);
});

test('une ressource déjà occupée est refusée même si son indicateur Disponible est incohérent', () => {
  assert.match(getAssignmentError([tour], driver, vehicle)!, /chauffeur/);
  assert.match(getAssignmentError([tour], { ...driver, id: 'free' }, vehicle)!, /véhicule/);
  assert.equal(getAssignmentError([], driver, vehicle), null);
});

test('réaffectation : ressources actuelles permises, ressources en repos ou maintenance refusées', () => {
  assert.equal(getAssignmentError([tour], { ...driver, status: 'En tournée' }, { ...vehicle, status: 'En service' }, tour.id), null);
  assert.match(getAssignmentError([tour], { ...driver, status: 'Repos' }, vehicle, tour.id)!, /chauffeur/);
  assert.match(getAssignmentError([tour], driver, { ...vehicle, status: 'Maintenance' }, tour.id)!, /véhicule/);
});

test('une tournée clôturée, annulée ou à clôturer ne peut pas être réexpédiée', () => {
  for (const status of ['Terminée', 'Annulée', 'À clôturer'] as const) {
    assert.ok(getAssignmentError([{ ...tour, status }], driver, vehicle, tour.id));
  }
  assert.ok(getAssignmentError([], driver, vehicle, 'missing'));
});

test('clôture bloquée tant qu’une preuve attend validation ou correction', () => {
  for (const status of ['À valider', 'Rejetée', 'Affectée', 'Livraison en cours'] as const) {
    assert.ok(getCloseTourError(tour, [stop('a', 1, status)]));
  }
  assert.ok(getCloseTourError(tour, []));
  assert.equal(getCloseTourError(tour, [stop('a', 1, 'Validée'), stop('b', 2, 'Échec'), stop('c', 3, 'Retournée')]), null);
  assert.ok(getCloseTourError({ ...tour, status: 'Terminée' }, [stop('a', 1, 'Validée')]));
});

test('les BL non affectés et les livraisons déjà traitées ne peuvent pas être mis en échec', () => {
  for (const status of ['À confirmer', 'À planifier', 'Planifiée', 'À valider', 'Validée', 'Rejetée', 'Échec', 'Retournée'] as const) {
    assert.equal(canFailDelivery(stop('a', 1, status)), false);
  }
  assert.equal(canFailDelivery(stop('a', 1, 'Arrivé')), true);
});

test('le prochain arrêt saute les arrêts déjà traités et les autres tournées', () => {
  const current = stop('a', 1);
  const deliveries = [stop('done', 2, 'Validée'), stop('later', 5), stop('next', 3), { ...stop('other', 2), tourId: 'other' }];
  assert.equal(getNextStop(deliveries, current)?.id, 'next');
  assert.equal(getNextStop([current, stop('done', 2, 'Validée')], current), undefined);
});

test('le recalcul conserve les positions des arrêts traités et évite les doublons de séquence', () => {
  const current = stop('a', 1, 'En route');
  const deliveries = [current, stop('z', 2, 'Affectée', 'Z'), stop('done', 3, 'Validée'), stop('b', 4, 'En route', 'A')];
  const before = structuredClone(deliveries);
  const reordered = reorderRemainingStops(deliveries, current);
  assert.deepEqual(reordered.map((item) => [item.id, item.sequence, item.status]), [['b', 2, 'En route'], ['z', 4, 'Affectée']]);
  const merged = deliveries.map((item) => reordered.find((next) => next.id === item.id) || item);
  assert.equal(new Set(merged.map((item) => item.sequence)).size, 4);
  assert.deepEqual(deliveries, before);
});

test('l’optimisation classe les BL par heure de livraison avant le quartier', () => {
  const deliveries = [
    { ...stop('yassir', 1), district: 'Ain Diab', timeSlot: '10:00 – 11:00' },
    { ...stop('imane', 2), district: 'Hay Hassani', timeSlot: '11:00 – 12:00' },
    { ...stop('nora', 3), district: 'Maarif', timeSlot: '09:00 – 10:00' },
  ];
  const before = structuredClone(deliveries);

  assert.deepEqual(
    sortDeliveriesByTimeSlot(deliveries).map((delivery) => delivery.id),
    ['nora', 'yassir', 'imane']
  );
  assert.deepEqual(deliveries, before);
});

test('deux incidents sur le même BL restent visibles, même si le plus ancien est résolu', () => {
  const first: Incident = { id: 'old', deliveryId: 'a', tourId: tour.id, customerName: 'Client', driverName: 'Chauffeur', type: 'Incident', description: '', timestamp: '09:00', resolved: true };
  const latest = { ...first, id: 'new', timestamp: '10:00', resolved: false };
  const deliveries = [stop('a', 1, 'Échec')];
  assert.equal(buildOperationalIncidents([latest, first], deliveries).length, 2);
  assert.equal(countOpenOperationalIncidents([latest, first], deliveries), 1);
  const synthetic = buildOperationalIncidents([], deliveries)[0];
  assert.equal(countOpenOperationalIncidents([{ ...synthetic, resolved: true }], deliveries), 0);
});

test('les données de planification couvrent les dates, entrepôts, statuts et véhicules de test', () => {
  const unassigned = INITIAL_DELIVERIES.filter((delivery) => !delivery.tourId && !delivery.driverId);
  const dates = new Set(unassigned.map((delivery) => delivery.deliveryDate));
  const warehouses = new Set(unassigned.map((delivery) => getWarehouseForDistrict(delivery.district)?.id));
  const statuses = new Set(unassigned.map((delivery) => delivery.status));
  const vehicleTypes = new Set(unassigned.map((delivery) => delivery.requiredVehicle).filter(Boolean));
  assert.ok(dates.size >= 7);
  assert.deepEqual(warehouses, new Set(['CAS-OUEST', 'CAS-CENTRE', 'CAS-SUD', 'CAS-EST']));
  assert.ok(statuses.has('À confirmer') && statuses.has('À planifier'));
  assert.deepEqual(vehicleTypes, new Set(['Fourgon', '3.5T', 'Camion']));

  const groupCounts = new Map<string, number>();
  unassigned.forEach((delivery) => {
    const warehouseId = getWarehouseForDistrict(delivery.district)?.id;
    if (!delivery.deliveryDate || !warehouseId) return;
    const key = `${delivery.deliveryDate}:${warehouseId}`;
    groupCounts.set(key, (groupCounts.get(key) || 0) + 1);
  });
  ['19 Septembre 2026', '20 Septembre 2026', '21 Septembre 2026'].forEach((date) =>
    ['CAS-OUEST', 'CAS-CENTRE', 'CAS-EST', 'CAS-SUD'].forEach((warehouseId) =>
      assert.ok((groupCounts.get(`${date}:${warehouseId}`) || 0) >= 2)
    )
  );
});
