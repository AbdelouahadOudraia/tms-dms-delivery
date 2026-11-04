import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_DELIVERIES } from '../src/data/tmsMockData';
import { getDriverHistoryEntries, getIncidentTreatmentSummary } from '../src/utils/driverHistory';
import type { Delivery, Incident } from '../src/types';

const base = INITIAL_DELIVERIES[0];
const stop = (id: string, status: Delivery['status'], driverId = 'chauffeur-1'): Delivery => ({
  ...base, id, orderId: `BL-${id}`, tourId: 'tour-1', driverId, status,
});
const incident = (deliveryId: string, resolved: boolean, id = `INC-${deliveryId}`): Incident => ({
  id, deliveryId, tourId: 'tour-1', customerName: 'Client', driverName: 'Chauffeur',
  type: 'Adresse incorrecte', description: 'Adresse introuvable', timestamp: '10:45', resolved,
});

test('l’historique sépare les tentatives terminées des preuves qui demandent un suivi', () => {
  const deliveries = [
    stop('ok', 'Validée'), stop('failed', 'Échec'), stop('returned', 'Retournée'),
    stop('pending', 'À valider'), stop('rejected', 'Rejetée'), stop('active', 'En route'),
    stop('other', 'Échec', 'autre-chauffeur'),
  ];
  const entries = getDriverHistoryEntries(deliveries, [], 'chauffeur-1');
  assert.deepEqual(entries.map((entry) => [entry.delivery.id, entry.group]), [
    ['ok', 'completed'], ['failed', 'completed'], ['returned', 'completed'],
    ['pending', 'follow-up'], ['rejected', 'follow-up'],
  ]);
  assert.equal(entries.find((entry) => entry.delivery.id === 'failed')?.incidents[0]?.resolved, false);
});

test('un incident résolu accompagne l’ancienne tentative en échec sans modifier son résultat', () => {
  const old = { ...stop('old', 'Échec'), nextAttemptId: 'new' };
  const next = { ...stop('new', 'À planifier', 'chauffeur-2'), previousAttemptId: 'old',
    tourId: '', deliveryDate: '29 Septembre 2026' };
  const treatment: Incident = { ...incident('old', true), treatment: {
    action: 'retry', note: 'Adresse vérifiée avec le client.', timestamp: '2026-09-28', nextAttemptId: 'new',
  } };
  const entries = getDriverHistoryEntries([old, next], [treatment], 'chauffeur-1');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].delivery.status, 'Échec');
  assert.equal(entries[0].incidents[0].resolved, true);
  assert.match(getIncidentTreatmentSummary(treatment, [old, next]), /29 Septembre 2026.*À planifier/);
});

test('le retour et la résolution manuelle restent visibles, même avec un autre incident ouvert', () => {
  const returned = stop('returned', 'Retournée');
  const resolved = { ...incident('returned', true, 'INC-OLD'),
    description: 'Retour demandé · Résolution : colis reçu au dépôt' };
  const open = { ...incident('returned', false, 'INC-NEW'), timestamp: '11:00' };
  const entries = getDriverHistoryEntries([returned], [resolved, open], 'chauffeur-1');
  assert.equal(entries[0].incidents.length, 2);
  assert.deepEqual(entries[0].incidents.map((item) => item.resolved), [false, true]);
  assert.equal(getIncidentTreatmentSummary(resolved, [returned]), 'Résolution : colis reçu au dépôt');
});
