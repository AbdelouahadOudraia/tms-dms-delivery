import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Delivery } from '../src/types';
import { DEMO_SALES_DOSSIERS } from '../src/data/salesMockData';
import { generateSalesBls, getSaleEligibilityError, getSaleGenerationState, getSaleKey, getSaleRemaining, getSalesDossiersToConvert, importSalesDossiersToConvert, mergeSalesDossiers, prepareSalesBlRequest } from '../src/utils/salesWorkflow';

const sale = DEMO_SALES_DOSSIERS[0];
const timestamp = '2026-11-04T12:00:00Z';

test('fusion technique : dédoublonne dans le même lot puis lors des récupérations suivantes', () => {
  const input = structuredClone(DEMO_SALES_DOSSIERS);
  const first = mergeSalesDossiers([], [...input, input[0]]);
  assert.equal(first.imported, 8);
  assert.equal(first.duplicates, 1);
  const second = mergeSalesDossiers(first.dossiers, [...input, input[0]]);
  assert.equal(second.imported, 0);
  assert.equal(second.duplicates, 9);
  assert.equal(second.dossiers.length, 8);
  first.dossiers[0].items[0].quantity = 100;
  assert.equal(input[0].items[0].quantity, 2, 'les données source ne sont pas modifiées');
});

test('éligibilité : seuls les dossiers payés à livrer sont proposés dans la démonstration', () => {
  assert.equal(getSaleEligibilityError(sale, []), null);
  for (const index of [2, 3, 4, 6, 7]) {
    const dossier = DEMO_SALES_DOSSIERS[index];
    assert.ok(getSaleEligibilityError(dossier, []));
    assert.throws(() => generateSalesBls([dossier], [], [prepareSalesBlRequest(dossier, [])], timestamp));
  }
  assert.equal(getSaleEligibilityError(DEMO_SALES_DOSSIERS[5], []), null, 'la destination manquante peut être complétée dans le formulaire');
});

test('récupération : importe uniquement les dossiers payés à livrer et journalise leurs références', () => {
  const first = importSalesDossiersToConvert([], DEMO_SALES_DOSSIERS, []);
  assert.equal(first.imported, 3);
  assert.deepEqual(first.references, ['DV-DEMO-001', 'DV-DEMO-002', 'DV-DEMO-006']);
  assert.ok(first.dossiers.every((dossier) => dossier.commercialStatus === 'Payé' && dossier.collectionMode === 'À livrer'));
  const second = importSalesDossiersToConvert(first.dossiers, DEMO_SALES_DOSSIERS, []);
  assert.equal(second.imported, 0);
  assert.equal(second.duplicates, 3);
  assert.equal(second.dossiers.length, 3);
});

test('récupération : garde les dossiers partiels, exclut ceux intégralement couverts par des BL', () => {
  const request = prepareSalesBlRequest(sale, []);
  request.quantities = { 'line-001-a': 1, 'line-001-b': 0 };
  const partial = generateSalesBls([sale], [], [request], timestamp);
  assert.equal(importSalesDossiersToConvert([], DEMO_SALES_DOSSIERS, partial).imported, 3);
  const complete = generateSalesBls([sale], partial, [prepareSalesBlRequest(sale, partial)], timestamp);
  const result = importSalesDossiersToConvert([], DEMO_SALES_DOSSIERS, [...partial, ...complete]);
  assert.equal(result.imported, 2);
  assert.deepEqual(result.references, ['DV-DEMO-002', 'DV-DEMO-006']);
});

test('les dossiers entièrement transformés quittent la liste active sans perdre leur traçabilité', () => {
  const imported = importSalesDossiersToConvert([], DEMO_SALES_DOSSIERS, []);
  const requests = imported.dossiers.map((dossier) => ({ ...prepareSalesBlRequest(dossier, []),
    address: dossier.address || '88 Boulevard Ghandi', phone: dossier.phone || '06 62 89 01 23' }));
  const bls = generateSalesBls(imported.dossiers, [], requests, timestamp);
  assert.deepEqual(getSalesDossiersToConvert(imported.dossiers, bls), []);
  const next = importSalesDossiersToConvert(imported.dossiers, DEMO_SALES_DOSSIERS, bls);
  assert.equal(next.imported, 0);
  assert.equal(next.duplicates, 0);
  assert.deepEqual(next.references, []);
  assert.equal(next.dossiers.length, 3, 'les dossiers source historiques sont conservés');
  assert.equal(bls.length, 3);
  assert.ok(bls.every((bl) => bl.sourceSale?.dossierReference));
});

test('génération : conserve le dossier source et produit un BL à confirmer sans ressources', () => {
  const before = structuredClone(sale);
  const [bl] = generateSalesBls([sale], [], [prepareSalesBlRequest(sale, [])], timestamp);
  assert.equal(bl.orderId, 'BL-2026-00001');
  assert.equal(bl.status, 'À confirmer');
  assert.equal(bl.deliveryDate, '22 Septembre 2026');
  assert.equal(bl.totalWeightKg, 134);
  assert.equal(bl.goodsValue, 12596);
  assert.equal(bl.tourId, '');
  assert.equal(bl.driverId, '');
  assert.equal(bl.vehicleId, '');
  assert.equal(bl.sourceSale?.dossierReference, sale.reference);
  assert.equal(bl.sourceSale?.generatedAt, timestamp);
  assert.deepEqual(sale, before);
});

test('livraison partielle : déduit uniquement les quantités choisies et conserve le reste', () => {
  const request = prepareSalesBlRequest(sale, []);
  request.quantities = { 'line-001-a': 1, 'line-001-b': 0 };
  request.packageCount = 3;
  const [first] = generateSalesBls([sale], [], [request], timestamp);
  assert.equal(first.packageCount, 3, 'colis et unités sont indépendants');
  assert.equal(first.totalWeightKg, 65);
  assert.equal(first.items.length, 1);
  assert.deepEqual(getSaleRemaining(sale, [first]), { 'line-001-a': 1, 'line-001-b': 2 });
  assert.equal(getSaleGenerationState(sale, [first]), 'Partiellement généré');
  const [second] = generateSalesBls([sale], [first], [prepareSalesBlRequest(sale, [first])], timestamp);
  assert.notEqual(first.orderId, second.orderId);
  assert.equal(second.totalWeightKg, 69);
  assert.equal(getSaleGenerationState(sale, [first, second]), 'BL générés');
  assert.ok(getSaleEligibilityError(sale, [first, second]));
  assert.throws(() => generateSalesBls([sale], [first, second], [request], timestamp));
});

test('les doublons de tentatives et réservations ne consomment pas deux fois les quantités du même BL', () => {
  const request = prepareSalesBlRequest(sale, []);
  request.quantities = { 'line-001-a': 1, 'line-001-b': 0 };
  const [bl] = generateSalesBls([sale], [], [request], timestamp);
  const retry: Delivery = { ...bl, id: `${bl.id}-T2`, status: 'Échec' };
  assert.deepEqual(getSaleRemaining(sale, [bl, retry, bl]), { 'line-001-a': 1, 'line-001-b': 2 });
  assert.deepEqual(getSaleRemaining(sale, [{ ...bl, status: 'Retournée' }]), { 'line-001-a': 1, 'line-001-b': 2 });
});

test('refuse les quantités en trop, négatives, décimales, inconnues et les générations vides', () => {
  const valid = prepareSalesBlRequest(sale, []);
  for (const quantities of [
    { 'line-001-a': 3 }, { 'line-001-a': -1, 'line-001-b': 1 },
    { 'line-001-a': 0.5 }, { 'line-001-a': 1, inconnu: 1 }, {},
  ]) assert.throws(() => generateSalesBls([sale], [], [{ ...valid, quantities }], timestamp));
  assert.throws(() => generateSalesBls([sale], [], [], timestamp));
  assert.throws(() => generateSalesBls([sale], [], [valid, valid], timestamp));
});

test('les références des BL sont uniques et les dossiers de deux sources restent distincts', () => {
  const other = { ...sale, systemId: 'other-source', systemName: 'Autre logiciel' };
  assert.notEqual(getSaleKey(sale), getSaleKey(other));
  assert.equal(mergeSalesDossiers([sale], [other]).imported, 1);
  const results = generateSalesBls([sale, other], [], [prepareSalesBlRequest(sale, []), prepareSalesBlRequest(other, [])], timestamp);
  assert.equal(new Set(results.map((bl) => bl.orderId)).size, 2);
  assert.equal(results[1].sourceSale?.systemId, 'other-source');
  const occupied = { ...results[0], id: 'CMD-2026-00001', orderId: 'CMD-2026-00001', sourceSale: undefined };
  const [next] = generateSalesBls([sale], [occupied], [prepareSalesBlRequest(sale, [])], timestamp);
  assert.equal(next.orderId, 'BL-2026-00002');
});

test('vérifie la destination, le créneau, la date, les colis et les coordonnées avant génération', () => {
  const request = prepareSalesBlRequest(sale, []);
  for (const patch of [
    { date: '2026-02-30' }, { endTime: '08:00' }, { startTime: '25:00' },
    { address: '' }, { phone: '123' }, { city: '' }, { district: 'Bouskoura' },
    { packageCount: 0 }, { latitude: '' }, { longitude: '181' },
  ]) assert.throws(() => generateSalesBls([sale], [], [{ ...request, ...patch }], timestamp));
});

test('un lot invalide ne génère aucun BL et ne modifie pas les dossiers existants', () => {
  const incomplete = DEMO_SALES_DOSSIERS[5];
  const dossiers = [sale, incomplete], deliveries: Delivery[] = [];
  const before = structuredClone(dossiers);
  assert.throws(() => generateSalesBls(dossiers, deliveries,
    [prepareSalesBlRequest(sale, []), prepareSalesBlRequest(incomplete, [])], timestamp));
  assert.deepEqual(dossiers, before);
  assert.equal(deliveries.length, 0);
  const corrected = { ...prepareSalesBlRequest(incomplete, []), address: '88 Boulevard Ghandi, appartement 5', phone: '06 62 89 01 23' };
  assert.equal(generateSalesBls(dossiers, deliveries, [corrected], timestamp).length, 1);
});
