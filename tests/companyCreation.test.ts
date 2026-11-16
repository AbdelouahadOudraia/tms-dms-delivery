import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {scryptSync} from 'node:crypto';
import {mkdtempSync,rmSync,existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import type {AddressInfo} from 'node:net';
import nodemailer from 'nodemailer';
import {createSalesApi} from '../server/sales/api';
import {CompanyDirectory} from '../server/sales/companies';
import {demoDatabase} from '../server/sales/demoDatabase';
import {requireCompanyNameMigrationApproval,allowRepeatedCompanyNames} from '../server/sales/companySchema';
import {verifiedFixture} from './support/legacyAccounts';

function temporary(t:import('node:test').TestContext) {
  const parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-company-creation-')),previous=process.env.NODE_ENV;
  const closers:(()=>void|Promise<void>)[]=[];
  process.env.NODE_ENV='development';
  t.after(async()=>{
    for(const close of closers)await close();
    if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;
    assert.equal(existsSync(join(root,'.data','sales-live.sqlite')),false);
    assert.equal(existsSync(join(root,'.data','tenant-test.sqlite')),false);
    if(dirname(resolve(root))===parent && basename(root).startsWith('tms-company-creation-'))rmSync(root,{recursive:true,force:true});
  });
  return {root,close:(callback:()=>void|Promise<void>)=>{closers.unshift(callback);}};
}

test('création démo : IDs automatiques, homonymes, invitation, renommage stable et isolation',async t=>{
  const {root,close}=temporary(t),api=createSalesApi(root,undefined,'demo');
  const smtp=t.mock.method(nodemailer,'createTransport',()=>{throw new Error('Aucun SMTP en démo');});
  const directory=new CompanyDirectory(demoDatabase(root),true,true);
  directory.setup('company-creation-admin');verifiedFixture(directory,'admin','owner@demo.test');
  const http=api.app.listen(0,'127.0.0.1');await once(http,'listening');
  const db=new DatabaseSync(demoDatabase(root),{readOnly:true});
  close(async()=>{await new Promise<void>(done=>http.close(()=>done()));api.close();directory.close();db.close();});
  const base='http://127.0.0.1:'+(http.address() as AddressInfo).port;
  async function call(method:string,path:string,body?:object,token='',status=200) {
    const response=await fetch(base+path,{method,headers:{'content-type':'application/json',authorization:'Bearer '+token},body:body&&JSON.stringify(body)});
    const data=await response.json();assert.equal(response.status,status,method+' '+path+' '+JSON.stringify(data));return data;
  }
  const login=(email:string,password:string,status=200)=>call('POST','/login',{login:email,password},'',status);
  const admin=(await login('owner@demo.test','company-creation-admin')).token;
  const first=await call('POST','/companies',{name:'Electroplanet',email:'first@demo.test'},admin,201);
  const second=await call('POST','/companies',{name:'Electroplanet',email:'second@demo.test',login:'admin'},admin,201);
  assert.equal(first.id,'electroplanet');assert.equal(second.id,'electroplanet-2');
  assert.equal(first.name,second.name);
  const messages=await call('GET','/demo/messages');assert.equal(messages.length,2);
  for(const [company,email]of [[first,'first@demo.test'],[second,'second@demo.test']]) {
    const invitation=messages.find(message=>message.recipient===email);assert.equal(invitation.purpose,'activate');
    await login(email,'company-invited-password',401);
    await call('POST','/company-email/activate',{token:invitation.link.split('/').pop(),password:'company-invited-password'});
    await login(company.id,'company-invited-password',401);
  }
  const one=(await login('first@demo.test','company-invited-password')).token;
  const two=(await login('second@demo.test','company-invited-password')).token;
  const data=(client:string)=>({deliveries:[{id:'BL-1',customerName:client}],tours:[],drivers:[],vehicles:[],incidents:[],addresses:[],zones:[],workflowSettings:{}});
  await call('PUT','/companies/'+first.id+'/transport',{revision:0,data:data('Client A')},one);
  await call('PUT','/companies/'+second.id+'/transport',{revision:0,data:data('Client B')},two);
  await call('GET','/companies/'+second.id+'/transport',undefined,one,403);
  await call('GET','/companies/'+first.id+'/transport',undefined,two,403);
  const renamed=await call('PATCH','/companies/'+first.id,{name:'Electroplanet Transport'},admin);
  assert.equal(renamed.id,first.id);
  assert.equal((await call('GET','/access',undefined,one)).companies[0].id,first.id);
  assert.equal((await call('GET','/companies/'+first.id+'/state',undefined,one)).settings.companyName,'Electroplanet Transport');
  assert.deepEqual((await call('GET','/companies/'+first.id+'/transport',undefined,one)).data,data('Client A'));
  assert.deepEqual((await call('GET','/companies/'+second.id+'/transport',undefined,two)).data,data('Client B'));
  await call('POST','/companies',{name:'Interdit',email:'forbidden@demo.test'},one,403);
  await call('POST','/companies',{name:'Autre',email:'first@demo.test'},admin,400);
  assert.equal(db.prepare('SELECT count(*) AS n FROM companies').get().n,2);
  assert.equal((await call('GET','/demo/messages')).length,2);
  assert.equal(db.prepare("SELECT company FROM accounts WHERE login='electroplanet'").get().company,first.id);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  assert.equal(smtp.mock.callCount(),0);
});

test('identifiants : accents, espaces, ponctuation, nom réservé, collisions et longueur',t=>{
  const {root,close}=temporary(t),api=createSalesApi(root,undefined,'demo'),directory=new CompanyDirectory(demoDatabase(root),true,true);
  close(()=>{directory.close();api.close();});
  const create=(name:string,email:string)=>directory.create(name,undefined,'unused-invitation-password',email);
  assert.equal(create('  Électroplanet & Dépôt, S.A.  ','one@demo.test').id,'electroplanet-depot-s-a');
  assert.equal(create('Electroplanet Dépôt S A','two@demo.test').id,'electroplanet-depot-s-a-2');
  assert.equal(create('ADMIN','three@demo.test').id,'admin-2');
  assert.equal(create('配送','four@demo.test').id,'entreprise');
  assert.equal(create('🚚','five@demo.test').id,'entreprise-2');
  const long=create('A'.repeat(100),'six@demo.test'),duplicate=create('A'.repeat(100),'seven@demo.test');
  assert.equal(long.id.length,64);assert.equal(duplicate.id.length,64);assert.ok(duplicate.id.endsWith('-2'));
  assert.throws(()=>create(' '.repeat(3),'eight@demo.test'),/nom/);
  assert.throws(()=>create('B'.repeat(101),'eight@demo.test'),/nom/);
});

test('migration démo : conserve IDs, comptes, données, clés étrangères, vues, index et triggers',t=>{
  const {root,close}=temporary(t),file=demoDatabase(root),legacy=new DatabaseSync(file);
  const salt='ab'.repeat(16),password=salt+':'+scryptSync('preserved-company-password',salt,32).toString('hex');
  legacy.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE companies(id TEXT PRIMARY KEY,name TEXT NOT NULL COLLATE NOCASE UNIQUE,demo INTEGER NOT NULL DEFAULT 0,created_at TEXT,extra TEXT);
    INSERT INTO companies VALUES('historical-key','Electroplanet',0,'2026-01-01T00:00:00.000Z','kept');
    CREATE TABLE accounts(login TEXT PRIMARY KEY,password TEXT NOT NULL,company TEXT UNIQUE);
    CREATE TABLE transport(company TEXT PRIMARY KEY,revision INTEGER NOT NULL,data TEXT NOT NULL);
    INSERT INTO transport VALUES('historical-key',3,'{"marker":"business-kept"}');
    CREATE TABLE child(company_id TEXT REFERENCES companies(id) ON DELETE CASCADE);
    INSERT INTO child VALUES('historical-key');
    CREATE VIEW custom_company_view AS SELECT id,name FROM companies;
    CREATE INDEX company_names_search ON companies(name);
    CREATE TABLE custom_audit(company_id TEXT);
    CREATE TRIGGER company_name_audit AFTER UPDATE OF name ON companies BEGIN INSERT INTO custom_audit VALUES(NEW.id); END;`);
  legacy.prepare('INSERT INTO accounts VALUES(?,?,?)').run('historical-key',password,'historical-key');
  const original=legacy.prepare('SELECT * FROM companies').all();legacy.close();
  const api=createSalesApi(root,undefined,'demo'),directory=new CompanyDirectory(file,true,true),db=new DatabaseSync(file);
  close(()=>{directory.close();api.close();db.close();});
  assert.deepEqual(db.prepare('SELECT * FROM companies').all(),original);
  assert.equal(db.prepare('SELECT password FROM accounts').get().password,password);
  assert.deepEqual(directory.transport('historical-key'),{revision:3,data:{marker:'business-kept'}});
  assert.equal(db.prepare('SELECT company_id FROM child').get().company_id,'historical-key');
  assert.equal(db.prepare('SELECT id FROM custom_company_view').get().id,'historical-key');
  assert.ok(db.prepare("SELECT 1 FROM sqlite_schema WHERE name='company_names_search'").get());
  const added=directory.create('Electroplanet',undefined,'unused-invitation-password','new@demo.test');
  assert.equal(added.id,'electroplanet');
  directory.rename('historical-key','Electroplanet Transport');
  assert.equal(db.prepare('SELECT company_id FROM custom_audit').get().company_id,'historical-key');
  assert.equal(db.prepare("SELECT company FROM accounts WHERE login='historical-key'").get().company,'historical-key');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('migration : refus sur base habituelle sans accord et rollback sur erreur',t=>{
  const {root,close}=temporary(t),file=join(root,'migration-fixture.sqlite'),db=new DatabaseSync(file);
  close(()=>db.close());
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE companies(id TEXT PRIMARY KEY,name TEXT NOT NULL COLLATE NOCASE UNIQUE);
    INSERT INTO companies VALUES('kept','Entreprise');
    CREATE TABLE broken(company TEXT REFERENCES companies(id));
    PRAGMA foreign_keys=OFF; INSERT INTO broken VALUES('missing'); PRAGMA foreign_keys=ON;`);
  const previous=process.env.TMS_ALLOW_COMPANY_NAME_MIGRATION;
  delete process.env.TMS_ALLOW_COMPANY_NAME_MIGRATION;
  t.after(()=>{if(previous===undefined)delete process.env.TMS_ALLOW_COMPANY_NAME_MIGRATION;else process.env.TMS_ALLOW_COMPANY_NAME_MIGRATION=previous;});
  const before=readFileSync(file);
  assert.throws(()=>requireCompanyNameMigrationApproval(file),/autorisation explicite/);
  assert.ok(readFileSync(file).equals(before));
  assert.throws(()=>allowRepeatedCompanyNames(db),/relations SQLite/);
  assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys,1);
  assert.equal(db.prepare('SELECT id FROM companies').get().id,'kept');
  assert.throws(()=>db.prepare("INSERT INTO companies VALUES('other','Entreprise')").run(),/UNIQUE/);
  assert.equal(db.prepare("SELECT 1 FROM sqlite_schema WHERE name='__companies_name_migration'").get(),undefined);
});
