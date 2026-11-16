import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {request as httpRequest} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync, rmSync, mkdirSync, linkSync, copyFileSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, dirname} from 'node:path';
import type {AddressInfo} from 'node:net';
import {createSalesApi} from '../server/sales/api';
import {legacyAdmin,legacyCompany} from './support/legacyAccounts';
import {SalesStore} from '../server/sales/store';
import {DEMO_SALES_DOSSIERS} from '../src/data/salesMockData';
import {prepareSalesBlRequest} from '../src/utils/salesWorkflow';

const fixtureCompanyId = 'atelier-fictif-qa';

function temporaryRoot() {
  const parent = resolve(tmpdir());
  const root = mkdtempSync(join(parent,'tms-test-delete-'));
  const env = {...process.env};
  process.env.NODE_ENV = 'development';
  // A real installation may define a legacy tenant. It must never be adopted by this mode.
  process.env.TMS_COMPANY_ID = fixtureCompanyId;
  process.env.TMS_COMPANY_API_CREDENTIALS = 'deliberately invalid for the sandbox';
  return {
    root,
    cleanup() {
      for (const key of ['NODE_ENV','TMS_COMPANY_ID','TMS_COMPANY_API_CREDENTIALS']) {
        if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key];
      }
      if (dirname(resolve(root)) === parent) rmSync(root,{recursive:true,force:true});
    },
  };
}

test('le mode destructif refuse la production, une copie et un lien vers la base ordinaire', t => {
  const temp = temporaryRoot();
  t.after(temp.cleanup);
  const dir = join(temp.root,'.data'); mkdirSync(dir);
  const live = join(dir,'sales-live.sqlite'), sandbox = join(dir,'tenant-test.sqlite');
  const db = new DatabaseSync(live); db.exec('CREATE TABLE untouched(id INTEGER)'); db.close();
  const original = readFileSync(live);
  process.env.NODE_ENV='production';
  assert.throws(()=>createSalesApi(temp.root,undefined,'local-test'), /développement/);
  process.env.NODE_ENV='development';
  linkSync(live,sandbox);
  assert.throws(()=>createSalesApi(temp.root,undefined,'local-test'), /partagé/);
  rmSync(sandbox); copyFileSync(live,sandbox);
  assert.throws(()=>createSalesApi(temp.root,undefined,'local-test'), /existante/);
  assert.ok(readFileSync(live).equals(original));
  assert.ok(readFileSync(sandbox).equals(original));
});

test('suppression locale de bout en bout, isolation, concurrence et redémarrage', async t => {
  const temp = temporaryRoot();
  const file = join(temp.root,'.data','tenant-test.sqlite');
  const servers = new Set<() => Promise<void>>();
  async function start() {
    const api = createSalesApi(temp.root,undefined,'local-test');
    const http = api.app.listen(0,'127.0.0.1');
    await once(http,'listening');
    const url = 'http://127.0.0.1:'+(http.address() as AddressInfo).port;
    const stop = async () => {
      await new Promise<void>(done=>http.close(()=>done()));
      api.close(); servers.delete(stop);
    };
    servers.add(stop);
    async function call(method: string, route: string, token = '', body?: object, expected = 200) {
      const res = await fetch(url+route,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},
        body: body && JSON.stringify(body)});
      assert.equal(res.status,expected,method+' '+route);
      return res.json();
    }
    return {url,call,stop};
  }
  const first = await start();
  const db = new DatabaseSync(file);
  t.after(async()=>{await Promise.all([...servers].map(stop=>stop())); db.close(); temp.cleanup();});
  const call = first.call;
  const name = 'Atelier Fictif QA', id = fixtureCompanyId, route = '/companies/'+id;
  const pw = 'test-tenant-password', adminPw = 'test-admin-password';
  legacyAdmin(temp.root,adminPw,true);
  const admin = (await call('POST','/login','',{login:'admin@fixture.test',password:adminPw})).token;
  const overview = () => call('GET','/admin/overview',admin);
  assert.deepEqual((await overview()).companies,[]);
  const create = async () => {legacyCompany(temp.root,name,id,pw,true);await call('GET',route+'/state',admin);};
  await create();
  legacyCompany(temp.root,'Entreprise témoin','beta',pw,true);await call('GET','/companies/beta/state',admin);
  const login = async (id: string) => (await call('POST','/login','',{login:id+'@fixture.test',password:pw})).token;
  const tenant = await login(id), beta = await login('beta');
  const tenantSecondSession = await login(id);
  const source = {connectorId:'standard',url:'https://example.test/orders'};
  await call('POST',route+'/sources',admin,source);
  const initial = await call('GET',route+'/state',tenant);
  await call('PUT',route+'/settings',tenant,{...initial.settings,...source,automatic:false});
  const store = new SalesStore(file);
  try {
    for (const tenantId of [id,'beta']) store.transaction(tenantId,state=>({...state,dossiers:[DEMO_SALES_DOSSIERS[0]]}));
  } finally {store.close();}
  const request = prepareSalesBlRequest(DEMO_SALES_DOSSIERS[0],[]);
  const {generated} = await call('POST',route+'/generate',tenant,{requests:[request]});
  const data = {deliveries:[{...generated[0],proof:{signatureData:'test',photoUrl:'test'}}],tours:[{id:'tour'}],
    drivers:[],vehicles:[],incidents:[{id:'incident'}],zones:[],addresses:[],workflowSettings:{}};
  await call('PUT',route+'/transport',tenant,{revision:0,data});
  await call('PUT','/companies/beta/transport',beta,{revision:0,data:{...data,tours:[{id:'témoin'}]}});
  await call('POST','/logout',tenant);
  const setStatus = (status:string) => call('PUT',route+'/status',admin,{status});
  const confirmation = async () => ({confirmationName:name,
    revision:(await overview()).companies.find(c=>c.id===id).deletionRevision});
  const active = await confirmation();
  assert.equal(active.revision,null);
  await call('DELETE',route,admin,active,400);
  await setStatus('disabled');
  const input = await confirmation();
  assert.ok(Number.isInteger(input.revision));
  await call('DELETE',route,'',input,401);
  await call('DELETE',route,beta,input,403);
  await call('DELETE',route,tenantSecondSession,input,401);
  await call('DELETE',route,admin,{...input,confirmationName:name+' '},400);
  await call('DELETE',route,admin,{confirmationName:name},400);
  await call('DELETE','/companies/admin',admin,input,403);
  // fetch normalizes Host to the URL, so send the untrusted header over a real HTTP socket.
  const body = JSON.stringify(input);
  const remoteStatus = await new Promise<number>((done, reject) => {
    const req = httpRequest(first.url+route,{method:'DELETE',headers:{Host:'untrusted.example',
      Authorization:'Bearer '+admin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{
      res.resume(); done(res.statusCode!);
    });
    req.on('error',reject); req.end(body);
  });
  assert.equal(remoteStatus,403);

  const second = await start();
  const otherAdmin = (await second.call('POST','/login','',{login:'admin@fixture.test',password:adminPw})).token;
  const tables = [
    ['companies','id'],['accounts','company'],['sales_workspaces','company_id'],['transport','company'],
    ['password_recovery','login'],['company_status_events','company_id'],
  ];
  // Include an old recovery row in the fixture to exercise its cleanup independently of suspension.
  db.prepare('INSERT INTO password_recovery VALUES(?,?,?)').run(id,'test-digest',0);
  const rows = (company:string) => tables.map(([table,column]) =>
    db.prepare('SELECT * FROM '+table+' WHERE '+column+'=? ORDER BY rowid').all(company));
  const before = rows(id), witness = rows('beta');
  assert.ok(before.every(records=>records.length>0));
  db.exec("CREATE TRIGGER fail_cleanup BEFORE DELETE ON companies BEGIN SELECT RAISE(ABORT,'test rollback'); END");
  await call('DELETE',route,admin,input,400);
  db.exec('DROP TRIGGER fail_cleanup');
  assert.ok(JSON.stringify(rows(id))===JSON.stringify(before),'La transaction doit restaurer toutes les lignes.');
  assert.equal(db.prepare('SELECT count(*) AS n FROM test_company_deletions').get().n,0);
  const remove = (url:string, token:string) => fetch(url+route,{method:'DELETE',headers:{
    authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(input)});
  const responses = await Promise.all([remove(first.url,admin),remove(second.url,otherAdmin)]);
  assert.equal(responses.filter(r=>r.status===200).length,1);
  assert.ok(responses.every(r=>[200,400,403].includes(r.status)));
  assert.ok(rows(id).every(records=>records.length===0));
  assert.ok(JSON.stringify(rows('beta'))===JSON.stringify(witness),'Les données du témoin doivent être identiques.');
  assert.equal(db.prepare('SELECT count(*) AS n FROM test_company_deletions WHERE company_id=? AND actor=?').get(id,'admin').n,1);
  assert.deepEqual((await overview()).companies.map(c=>c.id),['beta']);
  await call('POST','/login','',{login:id+'@fixture.test',password:pw},401);
  await call('GET','/companies/beta/transport',beta);
  await first.stop(); await second.stop();
  const restarted = await start();
  const newAdmin = (await restarted.call('POST','/login','',{login:'admin@fixture.test',password:adminPw})).token;
  assert.deepEqual((await restarted.call('GET','/admin/overview',newAdmin)).companies.map(c=>c.id),['beta']);
  legacyCompany(temp.root,name,id,pw,true);await restarted.call('GET',route+'/state',newAdmin);
  await restarted.call('PUT',route+'/status',newAdmin,{status:'disabled'});
  await restarted.call('DELETE',route,newAdmin,input,400); // Confirmation from the previous incarnation.
});
