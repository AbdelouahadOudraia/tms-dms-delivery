import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync,rmSync,existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import type {AddressInfo} from 'node:net';
import {createSalesApi} from '../server/sales/api';
import {CompanyDirectory} from '../server/sales/companies';
import {openSmtpInbox} from './support/smtpInbox';
import {rebindEmail} from '../server/emailMaintenance';
import {localTestDatabase} from '../server/sales/testDatabase';
import {verifiedFixture} from './support/legacyAccounts';
import {spawnSync} from 'node:child_process';
import {createAuthSandbox} from '../server/authSandbox';
import {requireAuthMigrationApproval} from '../server/sales/authMigration';

test('authentification uniforme : migration contrôlée, e-mail obligatoire, anciens parcours supprimés',async t=>{
  const env={...process.env},parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-uniform-email-'));
  const clear=()=>{for(const key of Object.keys(process.env))if(key.startsWith('TMS_'))delete process.env[key];};
  clear();process.env.NODE_ENV='development';
  const inbox=await openSmtpInbox();
  Object.assign(process.env,{TMS_TEST_SMTP_HOST:'127.0.0.1',TMS_TEST_SMTP_PORT:String(inbox.port),TMS_TEST_SMTP_FROM:'sender@example.test'});
  const service=createSalesApi(root,undefined,'local-test'),file=join(root,'.data','tenant-test.sqlite');
  const operator=new CompanyDirectory(file,true);
  operator.setup('preserved-admin-password');operator.create('Entreprise Historique','legacy','preserved-company-password');
  operator.saveTransport('legacy',0,{marker:'preserved-business-record'});
  const http=service.app.listen(0,'127.0.0.1');await once(http,'listening');
  const db=new DatabaseSync(file,{readOnly:true});
  t.after(async()=>{
    await new Promise<void>(done=>http.close(()=>done()));service.close();operator.close();db.close();await inbox.close();
    assert.equal(existsSync(join(root,'.data','sales-live.sqlite')),false);
    clear();for(const [key,value]of Object.entries(env))if(key.startsWith('TMS_'))process.env[key]=value;
    if(env.NODE_ENV===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=env.NODE_ENV;
    if(dirname(resolve(root))===parent && basename(root).startsWith('tms-uniform-email-'))rmSync(root,{recursive:true,force:true});
  });
  const base='http://127.0.0.1:'+(http.address() as AddressInfo).port;
  let now=Date.now();t.mock.method(Date,'now',()=>now);
  async function call(method:string,path:string,body?:object,token='',status=200){
    const res=await fetch(base+path,{method,headers:{'content-type':'application/json',authorization:'Bearer '+token},body:body&&JSON.stringify(body)});
    const data=await res.json();assert.equal(res.status,status,method+' '+path+' '+JSON.stringify(data));return data;
  }
  const login=async(login:string,password:string,status=200)=>call('POST','/login',{login,password},'',status);
  let index=0;
  const take=async()=>{const url=await inbox.link(index++);return url.hash.split('/').pop()!;};
  const before=String(db.prepare("SELECT password FROM accounts WHERE login='admin'").get().password);
  await login('admin','preserved-admin-password',401);
  await login('legacy','preserved-company-password',401);
  await call('GET','/admin/overview',undefined,'',401);
  await call('PUT','/own-email',{email:'admin@entreprise.fr',currentPassword:'preserved-admin-password'},'',401);
  // Trusted server maintenance binds the historical administrator after ownership checks.
  const migration=operator.rebindEmail('admin','admin@entreprise.fr','authorized-operator','TEST_MIGRATION');
  assert.equal(String(db.prepare("SELECT password FROM accounts WHERE login='admin'").get().password),before);
  await login('admin@entreprise.fr','preserved-admin-password',401);
  await call('POST','/company-email/verify',{token:migration.token});
  let admin=(await login('admin@entreprise.fr','preserved-admin-password')).token;
  await call('GET','/admin/overview',undefined,admin);
  await login('admin','preserved-admin-password',401);
  await call('PUT','/companies/legacy/email',{email:'logistique@entreprise.fr',currentPassword:'preserved-admin-password'},admin);
  await login('logistique@entreprise.fr','preserved-company-password',401);
  await call('POST','/companies/legacy/email/verification',{},admin);
  await call('POST','/company-email/verify',{token:await take()});
  await login('legacy','preserved-company-password',401);
  const company=(await login('logistique@entreprise.fr','preserved-company-password')).token;
  assert.deepEqual((await call('GET','/companies/legacy/transport',undefined,company)).data,{marker:'preserved-business-record'});
  await call('GET','/admin/overview',undefined,company,403);
  await call('PUT','/companies/legacy/password',{password:'forbidden-manual-reset'},admin,404);
  await call('POST','/password-recovery',{login:'admin',code:'x'.repeat(43),password:'forbidden-code-reset'},admin,404);
  await call('POST','/password-recovery',{login:'admin',code:'x'.repeat(43),password:'forbidden-code-reset'},'',401);
  await call('POST','/companies',{name:'Nouvelle Entreprise',email:'responsable@nouvelle.fr'},admin,201);
  const invitation=await take();
  await call('POST','/company-email/activate',{token:invitation,password:'nouvelle-entreprise-password'});
  await login('nouvelle-entreprise','nouvelle-entreprise-password',401);
  const invited=(await login('responsable@nouvelle.fr','nouvelle-entreprise-password')).token;
  await call('GET','/companies/legacy/transport',undefined,invited,403);
  const neutral=await call('POST','/company-email/request',{email:'absent@entreprise.fr'},'',202);
  assert.deepEqual(await call('POST','/company-email/request',{email:'admin@entreprise.fr'},'',202),neutral);
  await call('POST','/company-email/reset',{token:await take(),password:'changed-admin-password'});
  await call('GET','/admin/overview',undefined,admin,401);
  admin=(await login('admin@entreprise.fr','changed-admin-password')).token;
  await call('GET','/companies/legacy/transport',undefined,company);
  await call('POST','/company-email/request',{email:'responsable@nouvelle.fr'},'',202);
  await call('POST','/company-email/reset',{token:await take(),password:'changed-company-password'});
  await call('GET','/companies/nouvelle-entreprise/transport',undefined,invited,401);
  await login('responsable@nouvelle.fr','changed-company-password');
  await call('GET','/admin/overview',undefined,admin);
  await call('PUT','/companies/legacy/status',{status:'disabled'},admin);
  assert.deepEqual(await call('POST','/company-email/request',{email:'logistique@entreprise.fr'},'',202),neutral);
  assert.equal(inbox.messages.length,index);
  operator.registerExisting({id:'without-access',name:'Espace historique sans compte'});
  operator.saveTransport('without-access',0,{marker:'historical-record-kept'});
  await call('POST','/companies/without-access/invitation',{email:'access@historique.fr',currentPassword:'incorrect'},admin,400);
  assert.equal(db.prepare("SELECT 1 FROM accounts WHERE company='without-access'").get(),undefined);
  await call('POST','/companies/without-access/invitation',{email:'access@historique.fr',currentPassword:'changed-admin-password'},admin);
  await call('POST','/company-email/activate',{token:await take(),password:'historical-access-password'});
  const historical=(await login('access@historique.fr','historical-access-password')).token;
  assert.deepEqual((await call('GET','/companies/without-access/transport',undefined,historical)).data,{marker:'historical-record-kept'});
  assert.equal(db.prepare("SELECT count(*) AS n FROM accounts WHERE company IS NULL").get().n,1);
  assert.equal(db.prepare('PRAGMA application_id').get().application_id,0x544d5354);
});

test('création depuis zéro : espaces distincts et conservation des bases existantes',()=>{
  const parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-auth-sandbox-'));
  const original=process.env.NODE_ENV;
  try {
    process.env.NODE_ENV='production';assert.throws(()=>createAuthSandbox(root),/développement/);
    process.env.NODE_ENV='development';
    const first=createAuthSandbox(root),second=createAuthSandbox(root);
    assert.notEqual(first,second);assert.equal(dirname(first),join(root,'.data','auth-sandboxes'));
    const file=localTestDatabase(first),directory=new CompanyDirectory(file,true);
    try {directory.setup('kept-sandbox-password');} finally {directory.close();}
    assert.equal(existsSync(join(root,'.data','tenant-test.sqlite')),false);
    assert.equal(existsSync(join(root,'.data','sales-live.sqlite')),false);
    const check=new CompanyDirectory(file,true);
    try {
      assert.equal(check.login('admin','kept-sandbox-password'),null);
      verifiedFixture(check,'admin');
      assert.ok(check.login('admin@fixture.test','kept-sandbox-password'));
    } finally {check.close();}
  } finally {
    if(original===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=original;
    if(dirname(resolve(root))===parent && basename(root).startsWith('tms-auth-sandbox-'))rmSync(root,{recursive:true,force:true});
  }
});

test('migration standard : un rechargement ne peut modifier une ancienne base sans autorisation',()=>{
  const parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-migration-guard-')),file=join(root,'legacy.sqlite');
  const previous=process.env.TMS_ALLOW_AUTH_MIGRATION;
  try {
    delete process.env.TMS_ALLOW_AUTH_MIGRATION;
    const db=new DatabaseSync(file);db.exec('CREATE TABLE accounts(login TEXT PRIMARY KEY,password TEXT NOT NULL,company TEXT)');db.close();
    const before=readFileSync(file);
    assert.throws(()=>requireAuthMigrationApproval(file),/autorisation explicite/);
    assert.ok(readFileSync(file).equals(before));
    process.env.TMS_ALLOW_AUTH_MIGRATION='true';requireAuthMigrationApproval(file);
    assert.ok(readFileSync(file).equals(before));
  } finally {
    if(previous===undefined)delete process.env.TMS_ALLOW_AUTH_MIGRATION;else process.env.TMS_ALLOW_AUTH_MIGRATION=previous;
    if(dirname(resolve(root))===parent && basename(root).startsWith('tms-migration-guard-'))rmSync(root,{recursive:true,force:true});
  }
});

test('secours hors interface : autorisation serveur, audit, vérification obligatoire et aucun changement de mot de passe',async t=>{
  const previous={...process.env},parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-email-maintenance-'));
  const clear=()=>{for(const key of Object.keys(process.env))if(key.startsWith('TMS_'))delete process.env[key];};
  clear();process.env.NODE_ENV='development';
  const inbox=await openSmtpInbox();
  Object.assign(process.env,{TMS_TEST_SMTP_HOST:'127.0.0.1',TMS_TEST_SMTP_PORT:String(inbox.port),TMS_TEST_SMTP_FROM:'sender@example.test'});
  const file=localTestDatabase(root),directory=new CompanyDirectory(file,true);
  directory.setup('unchanged-admin-password');verifiedFixture(directory,'admin');
  directory.create('Témoin','witness','unchanged-witness-password');verifiedFixture(directory,'witness');
  const db=new DatabaseSync(file,{readOnly:true});
  t.after(async()=>{
    directory.close();db.close();await inbox.close();clear();
    for(const [key,value]of Object.entries(previous))if(key.startsWith('TMS_'))process.env[key]=value;
    if(previous.NODE_ENV===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous.NODE_ENV;
    assert.equal(existsSync(join(root,'.data','sales-live.sqlite')),false);
    if(dirname(resolve(root))===parent && basename(root).startsWith('tms-email-maintenance-'))rmSync(root,{recursive:true,force:true});
  });
  const hash=db.prepare("SELECT password FROM accounts WHERE login='admin'").get().password;
  const oldSession=directory.login('admin@fixture.test','unchanged-admin-password'),other=directory.login('witness@fixture.test','unchanged-witness-password');
  await assert.rejects(rebindEmail(root,true,'admin','secured@example.test','INC_20261111','operator'),/non autorisée/);
  assert.equal(directory.emailRecovery.profile('admin').email,'admin@fixture.test');
  process.env.TMS_TEST_ALLOW_EMAIL_REBIND='true';
  await assert.rejects(rebindEmail(root,true,'missing','secured@example.test','INC_20261111','operator'),/indisponible/);
  await rebindEmail(root,true,'admin','secured@example.test','INC_20261111','operator');
  assert.equal(db.prepare("SELECT password FROM accounts WHERE login='admin'").get().password,hash);
  assert.equal(directory.account(oldSession),null);assert.ok(directory.account(other));
  assert.equal(directory.emailRecovery.profile('admin').emailVerified,false);
  assert.equal(directory.emailRecovery.issue('secured@example.test','reset'),null);
  const link=await inbox.link(0),token=link.hash.split('/').pop();
  assert.equal(directory.emailRecovery.consume(token,'verify'),true);
  assert.ok(directory.emailRecovery.issue('secured@example.test','reset'));
  const audit=db.prepare('SELECT actor,ticket FROM email_security_events').all();
  assert.deepEqual(audit.map(row=>({...row})),[{actor:'operator',ticket:'INC_20261111'}]);
  assert.ok(!JSON.stringify(audit).includes(token));
  const redirected=spawnSync(process.execPath,['--import','tsx','server/emailMaintenance.ts','--tenant-test'],{cwd:process.cwd(),encoding:'utf8',windowsHide:true});
  assert.equal(redirected.status,1);assert.equal(redirected.stdout,'');assert.match(redirected.stderr,/terminal privé et interactif/);
});
