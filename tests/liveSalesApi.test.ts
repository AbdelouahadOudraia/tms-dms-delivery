import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSalesApi } from '../server/sales/api';
import { DEFAULT_SALES_API } from '../src/utils/salesSynchronization';
import { SALES_CONNECTORS } from '../server/sales/connectors';

test('API Seller : test en lecture seule, pagination, vente mixte, doublons et refus d’accès', async (t) => {
  let deny = false;
  const pages: number[] = [], fetched: string[] = [];
  const upstream = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (deny || req.headers.authorization !== 'Bearer test-local') { res.writeHead(401).end('{}'); return; }
    if (req.method === 'POST' && req.url === '/seller/searchDossierVente') {
      let raw = ''; for await (const part of req) raw += part;
      const { Page } = JSON.parse(raw); pages.push(Page);
      res.end(JSON.stringify({ totalCount: 2, liste: [{ id: Page, statutCd: Page === 1 ? 'REGLER' : 'DRAFT' }] }));
    } else if (req.method === 'GET' && req.url === '/seller/vente?search=1') {
      fetched.push(req.url);
      res.end(JSON.stringify({ id: 1, dvRef: 'DV-TEST', statutCd: 'REGLER', clientFullName: 'Client test',
        dossierVenteDetail: [{ id: 5, artCode: 'A', artLibelle: 'Article', prixTtc: 95, qte: 2, modelivraisonId: 3 },
          { id: 6, modelivraisonId: 1 }] }));
    } else res.writeHead(404).end('{}');
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  t.after(() => upstream.close());
  const root = mkdtempSync(join(tmpdir(), 'sales-live-test-'));
  const base = 'http://127.0.0.1:' + (upstream.address() as AddressInfo).port;
  const env = { TMS_SALES_API_URL: base + '/seller/searchDossierVente', TMS_SALES_CONNECTOR: 'seller', TMS_SALES_API_TOKEN: 'test-local' };
  for (const [key, value] of Object.entries(env)) {
    const previous = process.env[key]; process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const api = createSalesApi(root, 'test');
  const app = api.app.listen(0, '127.0.0.1'); await once(app, 'listening');
  t.after(() => { app.close(); api.close(); rmSync(root, { recursive: true, force: true }); });
  const origin = 'http://127.0.0.1:' + (app.address() as AddressInfo).port;
  const setup = await fetch(origin + '/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'local-test-admin' }) });
  assert.equal(setup.status, 201);
  const { token } = await setup.json();
  const endpoint = origin + '/companies/test';
  const password = 'company-live-test';
  assert.equal((await fetch(endpoint + '/password', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify({ password }) })).status, 200);
  const login = await fetch(origin + '/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: 'test', password }) });
  assert.equal(login.status, 200);
  const company = (await login.json()).token;
  const call = async (path: string, method = 'POST', body?: unknown) => {
    const response = await fetch(origin + '/companies/test' + path,
      { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + company }, body: body && JSON.stringify(body) });
    assert.equal(response.status, 200);
    return response.json();
  };
  const initial = await call('/state', 'GET');
  assert.equal(initial.dossiers.length, 0);
  const saved = await call('/settings', 'PUT', { ...initial.settings, companyName: 'autre espace' });
  assert.equal(saved.settings.url, env.TMS_SALES_API_URL);
  assert.equal(saved.settings.companyName, initial.settings.companyName);
  const checked = await call('/test');
  assert.equal(checked.connectionTest, true);
  assert.equal(checked.dossiers.length, 0);
  const first = await call('/sync');
  assert.deepEqual(pages, [1, 1, 2]);
  assert.equal(fetched.length, 1);
  assert.equal(first.dossiers.length, 1);
  assert.equal(first.dossiers[0].reference, 'DV-TEST');
  assert.deepEqual(first.dossiers[0].items.map((line: { ref: string }) => line.ref), ['A']);
  assert.equal(first.dossiers[0].items[0].unitWeightKg, null);
  const replacement = {connectorId:'standard',url:'https://nouvelle.example/dossiers'};
  assert.equal((await fetch(endpoint + '/sources', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(replacement)})).status,200);
  assert.equal((await fetch(endpoint + '/settings', {method:'PUT',headers:{'content-type':'application/json',authorization:'Bearer '+company},body:JSON.stringify({...saved.settings,...replacement})})).status,409);
  assert.equal(JSON.stringify(first).includes('test-local'),false);
  assert.equal((await call('/sync')).dossiers.length, 1);
  deny = true;
  assert.equal((await call('/test')).connectionTest, false);
  const failed = await call('/sync');
  assert.equal(failed.dossiers.length, 1);
  assert.match(failed.message, /401/);
  assert.equal(failed.operations[0].status, 'Erreur');
});

test('connecteurs : une source absente ou incompatible ne produit aucun dossier', async t => {
  await assert.rejects(SALES_CONNECTORS.seller.test(DEFAULT_SALES_API), /adresse/);
  const upstream = createServer((_req, res) => res.end('{"erreur":"accès refusé"}'));
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  t.after(() => upstream.close());
  const settings = { ...DEFAULT_SALES_API, url: 'http://127.0.0.1:' + (upstream.address() as AddressInfo).port };
  for (const connector of Object.values(SALES_CONNECTORS)) await assert.rejects(connector.test(settings), /format/);
});
