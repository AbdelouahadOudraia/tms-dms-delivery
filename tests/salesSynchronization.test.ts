import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import { SalesStore } from '../server/sales/store';
import { SalesSyncService } from '../server/sales/service';
import { SALES_CONNECTORS } from '../server/sales/connectors';
import { DEMO_SALES_DOSSIERS } from '../src/data/salesMockData';
import { getSalesDossiersToConvert, prepareSalesBlRequest } from '../src/utils/salesWorkflow';
import { DEFAULT_SALES_API as initialSettings, getNextSalesSyncAt, validateSalesApiSettings } from '../src/utils/salesSynchronization';

const DEFAULT_SALES_API = { ...initialSettings, url: 'https://source.test/dossiers', automatic: true };
function fixtureService(store: SalesStore, company: string, options: ConstructorParameters<typeof SalesSyncService>[2] = {}, records = DEMO_SALES_DOSSIERS) {
  store.transaction(company, state => ({ ...state, settings: DEFAULT_SALES_API }));
  const fixture = (standard = false): typeof SALES_CONNECTORS.seller => ({
    async test() {},
    async fetchDossiers(_settings, cursor) {
      const next = JSON.stringify(records);
      const dossiers = cursor === next ? [] : records.map(s => standard && s.commercialStatus === 'Payé' ? { ...s, commercialStatus: 'Confirmé' } : s);
      return { dossiers, cursor: next };
    },
  });
  return new SalesSyncService(store, company, { scheduling: false, connectors: { seller: fixture(), standard: fixture(true) }, ...options });
}

test('service : synchronisation incrémentale sans doublons et historique manuel', async (t) => {
  const store = new SalesStore(':memory:');
  const service = fixtureService(store, 'a', { scheduling: false });
  t.after(() => { service.close(); store.close(); });
  const first = await service.synchronize();
  assert.equal(first.dossiers.length, 3);
  assert.equal(first.operations[0].trigger, 'Manuel');
  assert.ok(first.lastSuccessAt);
  assert.ok(first.cursor);
  const second = await service.synchronize();
  assert.equal(second.dossiers.length, 3);
  assert.match(second.message, /Aucun nouveau dossier/);
  assert.equal(second.operations.length, 2);
});

test('service : configurations, dossiers et BL sont séparés par entreprise', async (t) => {
  const store = new SalesStore(':memory:');
  const a = fixtureService(store, 'entreprise-a', { scheduling: false });
  const b = fixtureService(store, 'entreprise-b', { scheduling: false });
  t.after(() => { a.close(); b.close(); store.close(); });
  await a.synchronize();
  assert.equal(b.snapshot().dossiers.length, 0);
  const settingsB = { ...DEFAULT_SALES_API, companyName: 'Entreprise B', connectorId: 'standard' as const, eligibleStatuses: ['Confirmé'] };
  b.authorize(settingsB);
  b.updateSettings(settingsB);
  const importedB = await b.synchronize();
  assert.equal(importedB.dossiers.length, 3);
  assert.equal(importedB.dossiers[0].commercialStatus, 'Confirmé');
  assert.equal(a.snapshot().settings.companyName, 'Electroplanet');
  const request = prepareSalesBlRequest(importedB.dossiers[0], []);
  b.generate([request]);
  assert.equal(a.snapshot().generatedBls.length, 0);
  assert.equal(b.snapshot().generatedBls.length, 1);
});

test('service : une génération répétée ne réserve pas deux fois les quantités', async (t) => {
  const store = new SalesStore(':memory:');
  const service = fixtureService(store, 'a', { scheduling: false });
  t.after(() => { service.close(); store.close(); });
  const state = await service.synchronize();
  const request = prepareSalesBlRequest(state.dossiers[0], []);
  const result = service.generate([request]);
  assert.equal(result.generated.length, 1);
  assert.throws(() => service.generate([request]), /déjà couvertes/);
  assert.equal(service.snapshot().generatedBls.length, 1);
  assert.equal(service.snapshot().operations[0].status, 'Erreur');
});

test('service : une annulation reçue retire le dossier actif sans effacer son historique', async (t) => {
  const store = new SalesStore(':memory:');
  const records = structuredClone(DEMO_SALES_DOSSIERS);
  const service = fixtureService(store, 'a', {}, records);
  t.after(() => { service.close(); store.close(); });
  await service.synchronize();
  records[0].commercialStatus = 'Annulé'; records[0].sourceVersion = 3;
  const cancelled = await service.synchronize();
  assert.equal(cancelled.dossiers.length, 3);
  assert.equal(cancelled.dossiers.find((sale) => sale.reference === 'DV-DEMO-001')?.commercialStatus, 'Annulé');
  assert.equal(getSalesDossiersToConvert(cancelled.dossiers, []).length, 2);
  records[0] = { ...DEMO_SALES_DOSSIERS[0], sourceVersion: 1 };
  const older = await service.synchronize();
  assert.equal(older.dossiers[0].commercialStatus, 'Annulé', 'une ancienne version ne réactive pas la vente');
});

test('service : un dossier modifié après génération signale un écart sans modifier le BL', async (t) => {
  const store = new SalesStore(':memory:');
  const records = structuredClone(DEMO_SALES_DOSSIERS);
  const service = fixtureService(store, 'a', {}, records);
  t.after(() => { service.close(); store.close(); });
  const state = await service.synchronize();
  const request = prepareSalesBlRequest(state.dossiers[0], []);
  request.quantities = { 'line-001-a': 1, 'line-001-b': 0 };
  const created = service.generate([request]).generated[0];
  records[0].address = 'Adresse corrigée'; records[0].sourceVersion = 2;
  const updated = await service.synchronize();
  assert.notEqual(updated.dossiers[0].address, created.address);
  assert.ok(updated.dossiers[0].reviewRequired);
  assert.equal(updated.generatedBls[0].address, created.address);
});

test('service : les erreurs ne font pas avancer le curseur et espacements de reprise sont bornés', async (t) => {
  const store = new SalesStore(':memory:');
  const now = Date.parse('2026-11-04T12:00:00Z');
  let fail = true;
  const connector = { ...SALES_CONNECTORS.seller, fetchDossiers: async () => {
    if (fail) throw new Error('API indisponible');
    return { dossiers: DEMO_SALES_DOSSIERS, cursor: '1' };
  } };
  const service = fixtureService(store, 'a', { scheduling: false, now: () => now, connectors: { ...SALES_CONNECTORS, seller: connector } });
  t.after(() => { service.close(); store.close(); });
  service.updateSettings({ ...DEFAULT_SALES_API, intervalSeconds: 5 });
  const failed = await service.synchronize('Automatique');
  assert.equal(failed.cursor, null);
  assert.equal(failed.consecutiveFailures, 1);
  assert.equal(failed.nextSyncAt, new Date(now + 10000).toISOString());
  assert.equal(failed.operations[0].status, 'Erreur');
  fail = false;
  const recovered = await service.synchronize();
  assert.ok(recovered.cursor);
  assert.equal(recovered.consecutiveFailures, 0);
  assert.equal(getNextSalesSyncAt({ ...DEFAULT_SALES_API, intervalSeconds: 5 }, 20, now), new Date(now + 300000).toISOString());
});

test('service : la programmation automatique rejoint une seule exécution et s’arrête en mode manuel', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const store = new SalesStore(':memory:');
  let calls = 0;
  let finish!: (result: { dossiers: typeof DEMO_SALES_DOSSIERS; cursor: string }) => void;
  const connector = { ...SALES_CONNECTORS.seller, fetchDossiers: async () => {
    calls++; return new Promise<{ dossiers: typeof DEMO_SALES_DOSSIERS; cursor: string }>((resolve) => { finish = resolve; });
  } };
  const service = fixtureService(store, 'a', { scheduling: true, connectors: { ...SALES_CONNECTORS, seller: connector } });
  t.after(() => { service.close(); store.close(); });
  t.mock.timers.tick(0);
  assert.equal(calls, 1);
  const sameRun = service.synchronize('Manuel');
  assert.equal(calls, 1);
  finish({ dossiers: DEMO_SALES_DOSSIERS, cursor: '1' });
  await sameRun;
  assert.equal(service.snapshot().operations[0].trigger, 'Automatique');
  service.updateSettings({ ...DEFAULT_SALES_API, automatic: false });
  t.mock.timers.tick(3600000);
  assert.equal(calls, 1);
  assert.equal(service.snapshot().nextSyncAt, null);
});

test('service : les données survivent à la fermeture et au redémarrage du stockage', async () => {
  const filename = join(tmpdir(), `tms-sales-${randomUUID()}.sqlite`);
  const store = new SalesStore(filename);
  const service = fixtureService(store, 'persistent', { scheduling: false });
  try {
    const state = await service.synchronize();
    service.generate([prepareSalesBlRequest(state.dossiers[1], [])]);
    service.close(); store.close();
    const reopened = new SalesStore(filename);
    try {
      assert.equal(reopened.read('persistent').dossiers.length, 3);
      assert.equal(reopened.read('persistent').generatedBls.length, 1);
      assert.equal(reopened.read('autre-entreprise').generatedBls.length, 0);
    } finally { reopened.close(); }
  } finally { unlinkSync(filename); }
});

test('configuration : refuse fréquence invalide, connecteur inconnu et règles vides', () => {
  assert.doesNotThrow(() => validateSalesApiSettings(DEFAULT_SALES_API));
  for (const patch of [{ intervalSeconds: 0 }, { intervalSeconds: 5.5 }, { intervalSeconds: 86401 },
    { sourceName: '' }, { companyName: '' }, { eligibleStatuses: [] }, { url: 'https://user:password@example.com' }]) {
    assert.throws(() => validateSalesApiSettings({ ...DEFAULT_SALES_API, ...patch }));
  }
});

test('stockage : attend un verrou temporaire au lieu d’arrêter la synchronisation', async () => {
  const filename = join(tmpdir(), `tms-lock-${randomUUID()}.sqlite`);
  const store = new SalesStore(filename);
  const worker = new Worker(`
    const { DatabaseSync } = require('node:sqlite');
    const { parentPort, workerData } = require('node:worker_threads');
    const db = new DatabaseSync(workerData);
    db.exec('BEGIN IMMEDIATE');
    parentPort.postMessage('locked');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    db.exec('COMMIT');
    db.close();
  `, { eval: true, workerData: filename });
  try {
    await once(worker, 'message');
    const saved = store.transaction('a', (state) => ({ ...state, message: 'Verrou libéré' }));
    assert.equal(saved.message, 'Verrou libéré');
  } finally {
    await worker.terminate();
    store.close();
    unlinkSync(filename);
  }
});
