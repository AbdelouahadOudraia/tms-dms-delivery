import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import type {AddressInfo} from 'node:net';
import {DatabaseSync} from 'node:sqlite';
import {createSalesApi} from '../server/sales/api';
import {CompanyDirectory} from '../server/sales/companies';
import {localTestDatabase} from '../server/sales/testDatabase';
import {openSmtpInbox} from './support/smtpInbox';
import {legacyAdmin} from './support/legacyAccounts';

test('Gmail : migration admin, invitation entreprise, récupération des deux rôles et isolation',async t=>{
  const oldEnv={...process.env};
  const clear=()=>{for(const key of Object.keys(process.env)) if(key.startsWith('TMS_')) delete process.env[key];};
  clear();process.env.NODE_ENV='development';
  const inbox=await openSmtpInbox();
  Object.assign(process.env,{TMS_TEST_SMTP_HOST:'127.0.0.1',TMS_TEST_SMTP_PORT:String(inbox.port),
    TMS_TEST_SMTP_FROM:'tms@example.test',TMS_TEST_PUBLIC_URL:'http://127.0.0.1:3010'});
  const parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-gmail-auth-'));
  const file=localTestDatabase(root);
  legacyAdmin(root,'historical-admin-password',true);
  let api=createSalesApi(root,undefined,'local-test');
  let http=api.app.listen(0,'127.0.0.1');await once(http,'listening');
  const db=new DatabaseSync(file);
  let now=Date.now();t.mock.method(Date,'now',()=>now);
  t.after(async()=>{
    await new Promise<void>(done=>http.close(()=>done()));api.close();db.close();await inbox.close();
    assert.equal(existsSync(join(root,'.data','sales-live.sqlite')),false);
    if(dirname(resolve(root))===parent && basename(root).startsWith('tms-gmail-auth-')) rmSync(root,{recursive:true,force:true});
    clear();for(const [k,v] of Object.entries(oldEnv)) if(k.startsWith('TMS_')) process.env[k]=v;
    if(oldEnv.NODE_ENV===undefined) delete process.env.NODE_ENV;else process.env.NODE_ENV=oldEnv.NODE_ENV;
  });
  async function call(method:string,path:string,body?:object,token='',status=200) {
    const base='http://127.0.0.1:'+(http.address() as AddressInfo).port;
    const res=await fetch(base+path,{method,headers:{'content-type':'application/json',authorization:'Bearer '+token},body:body&&JSON.stringify(body)});
    const data=await res.json();assert.equal(res.status,status,method+' '+path+' '+JSON.stringify(data));return data;
  }
  let adminAddress='admin@fixture.test';
  const login=async(id:string,password:string,status=200)=>call('POST','/login',{login:id==='entreprise-invitee'?'invitee@gmail.com':id==='admin'?adminAddress:id,password},'',status);
  const mailToken=async(index:number,purpose:string)=>{
    const link=await inbox.link(index);assert.equal(link.origin,'http://127.0.0.1:3010');
    assert.ok(link.hash.startsWith('#company-email/'+purpose+'/'));return link.hash.split('/').pop()!;
  };
  let admin=(await login('admin','historical-admin-password')).token;
  const original=String(db.prepare("SELECT password FROM accounts WHERE login='admin'").get().password);
  await call('PUT','/own-email',{email:'owner@gmail.com',currentPassword:'wrong'},admin,400);
  await call('PUT','/own-email',{email:'invalid@@example.test',currentPassword:'historical-admin-password'},admin,400);
  await call('PUT','/own-email',{email:'owner@gmail.com',currentPassword:'historical-admin-password'},admin);
  assert.equal(db.prepare("SELECT password FROM accounts WHERE login='admin'").get().password,original);
  const adminVerify=await mailToken(0,'verify');
  await call('POST','/company-email/reset',{token:adminVerify,password:'unauthorized-password'},'',400);
  await call('POST','/company-email/verify',{token:adminVerify});
  adminAddress='owner@gmail.com';
  admin=(await login('admin','historical-admin-password')).token;
  assert.equal((await call('GET','/admin/overview',undefined,admin)).session.emailVerified,true);
  await call('POST','/companies',{name:'Entreprise Invitée',email:'o.w.n.e.r+other@gmail.com'},admin,400);
  assert.equal(db.prepare("SELECT 1 FROM companies WHERE id='entreprise-invitee'").get(),undefined);
  await call('POST','/companies',{name:'Entreprise Invitée',email:'invitee@gmail.com'},admin,201);
  const activation=await mailToken(1,'activate');
  assert.ok(db.prepare("SELECT 1 FROM account_activation WHERE login='entreprise-invitee'").get());
  await login('entreprise-invitee','historical-admin-password',401);
  await call('POST','/company-email/verify',{token:activation},'',400);
  await call('POST','/company-email/reset',{token:activation,password:'new-company-password'},'',400);
  await call('POST','/company-email/activate',{token:activation,password:'new-company-password'});
  await call('POST','/company-email/activate',{token:activation,password:'second-password'},'',400);
  const company=(await login('entreprise-invitee','new-company-password')).token;
  await call('GET','/admin/overview',undefined,company,403);
  await call('PUT','/companies/entreprise-invitee/email',{email:'attacker@gmail.com',currentPassword:'new-company-password'},company,403);
  await call('POST','/companies',{name:'Forbidden',login:'forbidden',email:'forbidden@gmail.com'},company,403);
  const payload={deliveries:[{id:'private-order'}],tours:[],drivers:[],vehicles:[],incidents:[],addresses:[],zones:[],workflowSettings:{}};
  await call('PUT','/companies/entreprise-invitee/transport',{revision:0,data:payload},company);
  const neutral=await call('POST','/company-email/request',{email:'unknown@gmail.com'},'',202);
  assert.deepEqual(await call('POST','/company-email/request',{email:'owner@gmail.com'},'',202),neutral);
  const adminReset=await mailToken(2,'reset');
  const validity=db.prepare("SELECT issued_at,expires_at FROM company_email_links WHERE login='admin'").get();
  assert.equal(Number(validity.expires_at)-Number(validity.issued_at),900000);
  // Tokens are independent of process memory and survive an API restart.
  await new Promise<void>(done=>http.close(()=>done()));api.close();
  api=createSalesApi(root,undefined,'local-test');http=api.app.listen(0,'127.0.0.1');await once(http,'listening');
  await call('POST','/company-email/reset',{token:adminReset,password:'new-global-password'});
  await call('POST','/company-email/reset',{token:adminReset,password:'second-global-password'},'',400);
  await login('admin','historical-admin-password',401);
  admin=(await login('admin','new-global-password')).token;
  const beforeReset=(await login('entreprise-invitee','new-company-password')).token;
  now+=61000;
  await call('POST','/company-email/request',{email:'invitee@gmail.com'},'',202);
  const companyReset=await mailToken(3,'reset');
  await call('POST','/company-email/reset',{token:companyReset,password:'changed-company-password',login:'admin'});
  await call('GET','/companies/entreprise-invitee/transport',undefined,beforeReset,401);
  const refreshed=(await login('entreprise-invitee','changed-company-password')).token;
  assert.deepEqual((await call('GET','/companies/entreprise-invitee/transport',undefined,refreshed)).data,payload);
  await call('GET','/admin/overview',undefined,admin);
  now+=61000;
  await call('POST','/company-email/request',{email:'invitee@gmail.com'},'',202);
  const blocked=await mailToken(4,'reset');
  await call('PUT','/companies/entreprise-invitee/status',{status:'disabled'},admin);
  assert.deepEqual(await call('POST','/company-email/request',{email:'invitee@gmail.com'},'',202),neutral);
  await call('POST','/company-email/reset',{token:blocked,password:'disabled-password'},'',400);
  await call('PUT','/companies/entreprise-invitee/status',{status:'active'},admin);
  await call('POST','/company-email/reset',{token:blocked,password:'disabled-password'},'',400);
  now+=61000;
  inbox.refuseMail();
  await call('POST','/companies',{name:'Envoi Refusé',email:'refused@gmail.com'},admin,400);
  assert.ok(db.prepare("SELECT 1 FROM account_activation WHERE login='envoi-refuse'").get());
  assert.equal(db.prepare("SELECT expires_at FROM company_email_links WHERE login='envoi-refuse'").get().expires_at,0);
  assert.equal(db.prepare("SELECT count(*) AS total FROM accounts WHERE company IS NULL").get().total,1);
});

test('migration Gmail : conserver les adresses historiques ambiguës sans permettre leur récupération',()=>{
  const parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-mail-migration-')),file=join(root,'legacy.sqlite');
  let directory=new CompanyDirectory(file);
  directory.setup('preserved-admin-password');directory.create('Première','first','preserved-company-password');
  directory.create('Seconde','second','preserved-company-password');directory.close();
  const db=new DatabaseSync(file);
  db.exec('DROP TRIGGER reserve_current_email_insert; DROP TRIGGER reserve_current_email_update; DROP TRIGGER reserve_pending_email_insert; DROP TRIGGER reserve_pending_email_update; DROP INDEX company_email_mailbox; ALTER TABLE company_emails DROP COLUMN mailbox; DELETE FROM auth_migrations');
  for(const [login,address] of [['first','a.user@gmail.com'],['second','auser+alias@googlemail.com']])
    db.prepare('INSERT INTO company_emails(login,address,verified_at) VALUES(?,?,?)').run(login,address,new Date().toISOString());
  db.close();
  try {
    directory=new CompanyDirectory(file);
    assert.equal(directory.login('admin','preserved-admin-password'),null);
    assert.equal(directory.login('first','preserved-company-password'),null);
    assert.equal(directory.emailRecovery.issue('auser@gmail.com','reset'),null);
    assert.equal(directory.emailRecovery.profile('first').email,'a.user@gmail.com');
    assert.equal(directory.emailRecovery.profile('first').emailVerified,false);
    directory.emailRecovery.setAddress('first','distinct@gmail.com');
    assert.equal(directory.emailRecovery.profile('first').emailVerified,false);
    assert.equal(directory.login('distinct@gmail.com','preserved-company-password'),null);
    const verification=directory.emailRecovery.issue('first','verify');
    assert.equal(directory.emailRecovery.consume(verification.token,'verify'),true);
    assert.ok(directory.login('distinct@gmail.com','preserved-company-password'));
    assert.equal(directory.login('first','preserved-company-password'),null);
  } finally {
    directory.close();
    if(dirname(resolve(root))===parent && basename(root).startsWith('tms-mail-migration-')) rmSync(root,{recursive:true,force:true});
  }
});

test('activation : expiration à 15 minutes, renvoi, changement d’adresse et absence de contournement par code',t=>{
  const parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-activation-'));
  const directory=new CompanyDirectory(join(root,'accounts.sqlite'));
  t.after(()=>{directory.close();if(dirname(resolve(root))===parent && basename(root).startsWith('tms-activation-')) rmSync(root,{recursive:true,force:true});});
  let now=Date.now();t.mock.method(Date,'now',()=>now);
  directory.beginEmailSetup('pendingadmin@gmail.com','pending-admin-password');
  assert.equal(directory.login('pendingadmin@gmail.com','pending-admin-password'),null);

  const admin=directory.emailRecovery.issue('admin','verify');
  now+=900000;
  assert.equal(directory.emailRecovery.consume(admin.token,'verify'),false);
  assert.equal(directory.login('admin','pending-admin-password'),null);
  directory.beginEmailSetup('pendingadmin@gmail.com','pending-admin-password');
  assert.throws(()=>directory.beginEmailSetup('attacker@gmail.com','different-password'),/engagée/);
  const retry=directory.emailRecovery.issue('admin','verify');
  assert.equal(directory.emailRecovery.consume(retry.token,'verify'),true);
  assert.ok(directory.login('pendingadmin@gmail.com','pending-admin-password'));
  directory.create('Invitation en attente','pending','unusable-initial-password','pendingcompany@gmail.com');
  const invitation=directory.emailRecovery.issue('pending','activate');
  assert.equal(directory.emailRecovery.issue('pendingcompany@gmail.com','reset'),null);

  assert.equal(directory.login('pending','operator-changed-password'),null);
  now+=900000;
  assert.equal(directory.emailRecovery.consume(invitation.token,'activate','chosen-company-password'),false);
  now+=61000;
  const replacement=directory.emailRecovery.issue('pending','activate');
  directory.emailRecovery.setAddress('pending','changedcompany@gmail.com');
  assert.equal(directory.emailRecovery.consume(replacement.token,'activate','chosen-company-password'),false);
  const current=directory.emailRecovery.issue('pending','activate');
  assert.equal(directory.emailRecovery.consume(current.token,'verify'),false);
  assert.equal(directory.emailRecovery.consume(current.token,'activate','chosen-company-password'),true);
  assert.ok(directory.login('changedcompany@gmail.com','chosen-company-password'));
});
