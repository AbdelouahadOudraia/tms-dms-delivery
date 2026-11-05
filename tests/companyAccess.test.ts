import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createSalesApi } from '../server/sales/api';

test('espaces : création, accès limité, configuration et tournées persistantes par entreprise', async t => {
  const root = mkdtempSync(join(tmpdir(), 'tms-spaces-'));
  let service = createSalesApi(root);
  let server = service.app.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(() => { server.close(); service.close(); rmSync(root,{recursive:true,force:true}); });
  async function call(route: string, method = 'GET', token = '', body?: unknown, expected = 200) {
    const res = await fetch('http://127.0.0.1:' + (server.address() as AddressInfo).port + route, { method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json(); assert.equal(res.status, expected, route + ' ' + JSON.stringify(data.error)); return data;
  }
  await call('/companies/alfa/state','GET','',undefined,401);
  const setup = await call('/setup','POST','',{password:'test-admin-password'},201);
  const admin = setup.token;
  for (const login of ['alfa','beta']) await call('/companies','POST', admin, { login, name: login.toUpperCase(), password: 'test-company-' + login },201);
  const { token } = await call('/login','POST','',{login:'alfa',password:'test-company-alfa'});
  const access = await call('/access','GET',token);
  assert.deepEqual(access.companies.map(c => c.id),['alfa']);
  for (const route of ['state','transport','test','sync','generate','settings','password']) {
    await call('/companies/beta/' + route,['test','sync','generate'].includes(route) ? 'POST' : ['settings','password'].includes(route) ? 'PUT' : 'GET',token,undefined,403);
  }
  await call('/companies','POST',token,{},403);
  const a = await call('/companies/alfa/state','GET',token);
  assert.deepEqual(a.dossiers,[]); assert.deepEqual(a.generatedBls,[]);
  const seller = { connectorId:'seller', url:'https://alfa.example/seller/searchDossierVente' };
  const selected = { ...a.settings, ...seller };
  await call('/companies/alfa/settings','PUT',token,{ ...selected, approvedSources:[seller] },403);
  await call('/companies/alfa/sources','POST',token,seller,403);
  await call('/companies/alfa/sources','DELETE',token,seller,403);
  await call('/companies/alfa/sources','POST',admin,{...seller, legacyNetwork:true});
  const approved = await call('/companies/alfa/state','GET',token);
  assert.deepEqual(approved.approvedSources,[seller]);
  assert.equal(approved.settings.url,'', 'Autoriser ne doit pas activer la source.');
  await call('/companies/alfa/settings','PUT',token,{...selected,connectorId:'standard'},403);
  await call('/companies/alfa/settings','PUT',token,{...selected,url:'https://other.example/seller/searchDossierVente'},403);
  await call('/companies/alfa/settings','PUT',token,{...selected,url:'https://127.0.0.1/seller/searchDossierVente'},403);
  await call('/companies/alfa/sources','POST',admin,{connectorId:'standard',url:'https://169.254.169.254/metadata'},400);
  const configured = await call('/companies/alfa/settings','PUT',token,{...selected,companyName:'BETA',companyId:'beta'});
  assert.equal(configured.settings.companyName,'ALFA');
  const b = await call('/companies/beta/state','GET',admin);
  assert.equal(b.settings.connectorId,'standard'); assert.equal(b.settings.url,'');
  assert.deepEqual(b.approvedSources,[]);
  const beta = (await call('/login','POST','',{login:'beta',password:'test-company-beta'})).token;
  await call('/companies/beta/settings','PUT',beta,selected,403);
  const data = { deliveries:[{id:'BL-1',customerName:'Alfa'}], tours:[{id:'TR-1'}], drivers:[{id:'DR-1',name:'Alfa'}], vehicles:[], addresses:[], zones:[], incidents:[], workflowSettings:{} };
  await call('/companies/alfa/transport','PUT',token,{revision:0,data});
  await call('/companies/alfa/transport','PUT',token,{revision:0,data},409);
  assert.equal((await call('/companies/beta/transport','GET',admin)).data,null);
  const dataB = {...data,deliveries:[{id:'BL-1',customerName:'Beta'}],drivers:[{id:'DR-1',name:'Beta'}]};
  await call('/companies/beta/transport','PUT',beta,{revision:0,data:dataB});
  await call('/companies/beta/transport','PUT',token,{revision:1,data},403);
  await call('/companies/alfa/transport','PUT',beta,{revision:1,data:dataB},403);
  await call('/companies/alfa/transport?companyId=beta','PUT',token,{revision:1,companyId:'beta',data});
  assert.deepEqual((await call('/companies/beta/transport','GET',beta)).data,dataB);
  await call('/logout','POST',token); await call('/companies/alfa/state','GET',token,undefined,401);
  await new Promise<void>(resolve=>server.close(()=>resolve())); service.close();
  service=createSalesApi(root); server=service.app.listen(0,'127.0.0.1'); await once(server,'listening');
  const fresh=await call('/login','POST','',{login:'alfa',password:'test-company-alfa'});
  assert.deepEqual((await call('/companies/alfa/transport','GET',fresh.token)).data,data);
  const restored = await call('/companies/alfa/state','GET',fresh.token);
  assert.equal(restored.settings.connectorId,'seller');
  assert.deepEqual(restored.approvedSources,[seller]);
  await call('/companies/beta/state','GET',fresh.token,undefined,403);
  const newAdmin = (await call('/login','POST','',{login:'admin',password:'test-admin-password'})).token;
  await call('/companies/alfa/settings','PUT',fresh.token,{...selected, automatic:true, intervalSeconds:3600});
  const revoked = await call('/companies/alfa/sources','DELETE',newAdmin,seller);
  assert.equal(revoked.settings.automatic,false);
  assert.equal(revoked.nextSyncAt,null);
  for (const route of ['test','sync']) await call('/companies/alfa/'+route,'POST',fresh.token,{},403);
  await call('/companies/alfa/settings','PUT',fresh.token,selected,403);
});
