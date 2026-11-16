import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';
import { createSalesApi } from '../server/sales/api';
import {legacyAdmin,legacyCompany,legacyAccess} from './support/legacyAccounts';
import { CompanyDirectory } from '../server/sales/companies';
import { DEMO_SALES_DOSSIERS } from '../src/data/salesMockData';
import { prepareSalesBlRequest } from '../src/utils/salesWorkflow';
import type { SalesWorkspace } from '../src/types/sales';

test('cycle entreprise : accès serveur, reprise après redémarrage, import en vol, conservation et audit', {timeout: 45000}, async t => {
  const companyId = 'cycle-fictif-qa';
  let holdImport = false;
  let calls = 0;
  const waitingResponses: ServerResponse[] = [];
  const respond = (res: ServerResponse) => res.end(JSON.stringify({ dossiers: [DEMO_SALES_DOSSIERS[0]], cursor: 'page-1' }));
  const source = createServer((_req, res) => {
    calls++;
    if (holdImport) waitingResponses.push(res); else respond(res);
  }).listen(0, '127.0.0.1');
  await once(source, 'listening');
  const address = (s: typeof source) => 'http://127.0.0.1:' + (s.address() as AddressInfo).port;
  const env = { TMS_SALES_API_URL: address(source) + '/ventes', TMS_SALES_CONNECTOR: 'standard',
    TMS_COMPANY_NAME: 'Cycle Fictif QA', TMS_COMPANY_API_CREDENTIALS: '{}', TMS_SALES_API_TOKEN: '' };
  for (const [key,value] of Object.entries(env)) {
    const original = process.env[key];
    process.env[key] = value;
    t.after(() => { if (original === undefined) delete process.env[key]; else process.env[key] = original; });
  }

  const root = mkdtempSync(join(tmpdir(), 'tms-lifecycle-'));
  const file = join(root, '.data', 'sales-live.sqlite');
  let api = createSalesApi(root, companyId);
  let server = api.app.listen(0,'127.0.0.1');
  await once(server, 'listening');
  const secondProcess = new CompanyDirectory(file);
  const db = new DatabaseSync(file, {readOnly:true});
  const stored = (): SalesWorkspace => JSON.parse(String(db.prepare(
    "SELECT state_json FROM sales_workspaces WHERE company_id=?").get(companyId).state_json));
  t.after(async () => {
    api.close(); server.closeAllConnections(); source.closeAllConnections();
    await Promise.all([server,source].map(s => new Promise<void>(done=>s.close(()=>done()))));
    db.close(); secondProcess.close();
    if (dirname(resolve(root)) === resolve(tmpdir()) && basename(root).startsWith('tms-lifecycle-')) rmSync(root,{recursive:true,force:true});
  });
  async function call(method: string, route: string, token: string, body?: object, expected = 200) {
    const response = await fetch(address(server)+route, {method,headers:{'content-type':'application/json',authorization:'Bearer '+token},
      body: body && JSON.stringify(body)});
    assert.equal(response.status,expected,method+' '+route);
    return response.json();
  }
  const company = '/companies/' + companyId;
  const adminPassword = 'admin-lifecycle-test', password = 'company-lifecycle-test';
  legacyAdmin(root,adminPassword);
  let admin = (await call('POST','/login','',{login:'admin@fixture.test',password:adminPassword})).token;
  const change = (status: string) => call('PUT',company+'/status',admin,{status});
  legacyCompany(root,'Autre entreprise','beta',password);await call('GET','/companies/beta/state',admin);
  legacyAccess(root,companyId,password);
  const companyName = secondProcess.companies().find(c=>c.id===companyId)!.name;
  await t.test('suppression indisponible sur une entreprise active, même avec le nom exact', async () => {
    await call('DELETE',company,admin,{confirmationName:companyName},404);
    await call('DELETE',company,'',{confirmationName:companyName},401);
  });
  let tenant = (await call('POST','/login','',{login:companyId+'@fixture.test',password})).token;
  const beta = (await call('POST','/login','',{login:'beta@fixture.test',password})).token;
  let independentToken = secondProcess.login(companyId+'@fixture.test',password)!;
  await call('PUT',company+'/status','',{status:'disabled'},401);
  for (const token of [tenant,beta]) {
    for (const status of ['disabled','active']) await call('PUT',company+'/status',token,{status},403);
    await call('DELETE',company,token,undefined,403);
  }
  await call('PUT',company+'/status',admin,{status:'deleted'},400);
  const imported = await call('POST',company+'/sync',tenant);
  const request = prepareSalesBlRequest(imported.dossiers[0], []);
  const { generated } = await call('POST',company+'/generate',tenant,{requests:[request]});
  const transport = {deliveries:generated,tours:[{id:'TR-1'}],drivers:[],vehicles:[],addresses:[],zones:[],
    incidents:[{id:'INC-1'}],workflowSettings:{}};
  await call('PUT',company+'/transport',tenant,{revision:0,data:transport});
  const settings = {...imported.settings,automatic:true,intervalSeconds:5};
  await t.test('blocage du compte : sessions et API refusées, traitements automatiques indépendants maintenus', async () => {
    const detailsPath = '/admin/accounts/' + companyId;
    const details = await call('GET',detailsPath,admin);
    const companyRevision = secondProcess.companies().find(c=>c.id===companyId)!.statusRevision;
    const witnessBefore = await call('GET','/companies/beta/transport',beta);
    holdImport = true;
    const running = once(source,'request',{signal:AbortSignal.timeout(12000)});
    await call('PUT',company+'/settings',tenant,settings);
    await running; // This import was scheduled by the server, without a user session.
    const blocked = await call('PUT',detailsPath+'/status',admin,{status:'suspended',revision:details.account.revision});
    assert.deepEqual(blocked.account.access.reasons,['account_suspended']);
    assert.equal(blocked.account.companyStatus,'active');
    assert.equal(secondProcess.isActive(companyId,companyRevision),true);
    assert.equal(secondProcess.account(independentToken),null);
    await call('GET',company+'/state',tenant,undefined,401);
    await call('POST',company+'/sync',tenant,undefined,401);
    const refused = await call('POST','/login','',{login:companyId+'@fixture.test',password},403);
    assert.equal(refused.code,'ACCOUNT_SUSPENDED');assert.equal('token' in refused,false);
    await call('POST','/login','',{login:companyId+'@fixture.test',password:'incorrect-password'},401);

    async function finished() {
      for (let retry=0;retry<200;retry++) {
        const state=stored();
        if (!state.importing && state.operations[0]?.status==='Réussi') return state;
        await delay(25);
      }
      assert.fail('Le traitement automatique doit aboutir malgré le blocage du compte.');
    }
    // Complete the in-flight job, then observe another automatic run while access stays blocked.
    const next = once(source,'request',{signal:AbortSignal.timeout(12000)});
    holdImport = false;
    waitingResponses.splice(0).forEach(res=>respond(res));
    const completed = await finished();
    assert.equal(completed.operations[0].trigger,'Automatique');assert.ok(completed.nextSyncAt);
    const completedId = completed.operations[0].id;
    await next;
    const following = await finished();
    assert.notEqual(following.operations[0].id,completedId);
    assert.equal(following.operations[0].trigger,'Automatique');
    assert.equal((await call('GET',detailsPath,admin)).account.status,'suspended');
    assert.deepEqual((await call('GET',company+'/transport',admin)).data,transport);
    assert.deepEqual(await call('GET','/companies/beta/transport',beta),witnessBefore);

    await call('PUT',detailsPath+'/status',admin,{status:'active',revision:blocked.account.revision});
    await call('GET',company+'/state',tenant,undefined,401);
    tenant = (await call('POST','/login','',{login:companyId+'@fixture.test',password})).token;
    independentToken = secondProcess.login(companyId+'@fixture.test',password)!;
    assert.deepEqual((await call('GET',company+'/transport',tenant)).data,transport);
  });
  const before = stored();
  const oldRevision = secondProcess.companies().find(c=>c.id===companyId)!.statusRevision;

  // Hold the next upstream response while disabling the tenant through a separate request.
  holdImport = true;
  const started = once(source,'request',{signal:AbortSignal.timeout(8000)});
  const pending = call('POST',company+'/sync',tenant,undefined,403);
  await started;
  await change('disabled');
  await pending;
  await change('disabled'); // A retried request produces a single audit event.
  holdImport = false;
  const disabled = stored();
  assert.equal(disabled.nextSyncAt,null);
  assert.equal(disabled.importing,false);
  assert.equal(disabled.operations[0].status,'Erreur');
  assert.deepEqual(disabled.operations.slice(1), before.operations);
  for (const key of ['dossiers','generatedBls','cursor','settings','approvedSources'] as const) assert.deepEqual(disabled[key],before[key]);
  assert.equal((await call('GET','/admin/overview',admin)).companies.find(c=>c.id===companyId).status,'disabled');
  for (const path of ['/state','/transport']) await call('GET',company+path,tenant,undefined,401);
  await call('POST',company+'/sync',admin,undefined,403);
  await call('POST','/login','',{login:companyId+'@fixture.test',password},403);
  await call('GET','/companies/beta/state',beta);
  await t.test('entreprise désactivée : refus des demandes de suppression et absence d’écriture, même en concurrence', async () => {
    // This read-only connection observes commits made by any API connection to the temporary database.
    const dataVersion = () => db.prepare('PRAGMA data_version').get().data_version;
    const beforeRequests = dataVersion();
    await call('DELETE',company,admin,undefined,403);
    await call('DELETE',company,admin,{confirmationName:companyName+'-incorrect'},403);
    await call('DELETE',company,beta,{confirmationName:companyName},403);
    await Promise.all([
      call('DELETE',company,admin,{confirmationName:companyName},403),
      call('DELETE',company,admin,{confirmationName:companyName},403),
    ]);
    assert.equal(dataVersion(),beforeRequests,'Les refus doivent préserver les données de toutes les entreprises.');
    assert.deepEqual(stored(),disabled);
  });

  const atSuspension = calls;
  await new Promise<void>(done=>server.close(()=>done())); api.close();
  api = createSalesApi(root,companyId);
  server = api.app.listen(0,'127.0.0.1'); await once(server,'listening');
  admin = (await call('POST','/login','',{login:'admin@fixture.test',password:adminPassword})).token;
  await delay(5300); // Longer than the configured interval, including a restart.
  assert.equal(calls,atSuspension);
  assert.deepEqual(stored(),disabled);
  await call('POST','/login','',{login:companyId+'@fixture.test',password},403);
  const resumed = once(source,'request',{signal:AbortSignal.timeout(12000)});
  await change('active');
  assert.ok(Date.parse(stored().nextSyncAt!) > Date.now());
  assert.equal(secondProcess.account(independentToken),null,'Une session émise par un autre processus reste révoquée.');
  assert.equal(secondProcess.saveTransport(companyId,1,{deliveries:[]},oldRevision),false,
    'Une écriture commencée avant la suspension ne doit pas remplacer les données après la réactivation.');
  const fresh = (await call('POST','/login','',{login:companyId+'@fixture.test',password})).token;
  assert.deepEqual((await call('GET',company+'/transport',fresh)).data,transport);
  const restored = await call('GET',company+'/state',fresh);
  assert.deepEqual(restored.generatedBls, generated);
  assert.deepEqual(restored.dossiers, before.dossiers);
  assert.deepEqual(restored.settings,before.settings);
  await resumed;
  assert.equal(stored().operations[0].trigger,'Automatique');
  const events = db.prepare('SELECT company_id,status,actor,changed_at FROM company_status_events ORDER BY id').all();
  assert.deepEqual(events.map(e=>[e.company_id,e.status,e.actor]),[
    [companyId,'disabled','admin'],[companyId,'active','admin']]);
  assert.ok(events.every(e=>Number.isFinite(Date.parse(String(e.changed_at)))));
  const betaAfter = (await call('POST','/login','',{login:'beta@fixture.test',password})).token;
  assert.equal((await call('GET','/companies/beta/transport',betaAfter)).data,null);
  await call('GET',company+'/transport',betaAfter,undefined,403);
});
