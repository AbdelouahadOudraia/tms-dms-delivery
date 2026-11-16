import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync,rmSync,existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash,scryptSync} from 'node:crypto';
import type {AddressInfo} from 'node:net';
import nodemailer from 'nodemailer';
import {createSalesApi} from '../server/sales/api';
import {CompanyDirectory,AccountSuspendedError} from '../server/sales/companies';
import {demoDatabase} from '../server/sales/demoDatabase';
import {requireAuthMigrationApproval} from '../server/sales/authMigration';
import {accountHistoryLimit} from '../src/types/administration';

async function fixture(t:TestContext) {
  const parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-account-security-')),previous=process.env.NODE_ENV;
  process.env.NODE_ENV='development';
  const smtp=t.mock.method(nodemailer,'createTransport',()=>{throw new Error('SMTP interdit dans cette démo');});
  const api=createSalesApi(root,undefined,'demo'),file=demoDatabase(root),independent=new CompanyDirectory(file,true,true);
  const db=new DatabaseSync(file),http=api.app.listen(0,'127.0.0.1');await once(http,'listening');
  t.after(async()=>{
    await new Promise<void>(done=>http.close(()=>done()));api.close();independent.close();db.close();
    assert.equal(existsSync(join(root,'.data','sales-live.sqlite')),false);assert.equal(existsSync(join(root,'.data','tenant-test.sqlite')),false);
    assert.equal(smtp.mock.callCount(),0);
    if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;
    if(dirname(resolve(root))===parent && basename(root).startsWith('tms-account-security-'))rmSync(root,{recursive:true,force:true});
  });
  const base='http://127.0.0.1:'+(http.address() as AddressInfo).port;
  async function call(method:string,path:string,body?:object,token='',status=200) {
    const response=await fetch(base+path,{method,headers:{'content-type':'application/json',authorization:'Bearer '+token},body:body&&JSON.stringify(body)});
    const data=await response.json();assert.equal(response.status,status,method+' '+path+' '+JSON.stringify(data));return data;
  }
  const login=(email:string,password='company-security-password',status=200)=>call('POST','/login',{login:email,password},'',status);
  const link=async(email:string,purpose:string)=>{
    const messages=await call('GET','/demo/messages');const message=messages.find(item=>item.recipient===email&&item.purpose===purpose);
    assert.ok(message?.link);return message.link.split('/').pop();
  };
  await call('POST','/setup',{email:'admin@demo.test',password:'admin-security-password'},'',201);
  await call('POST','/company-email/verify',{token:await link('admin@demo.test','verify')});
  const admin=(await login('admin@demo.test','admin-security-password')).token;
  for(const [name,email]of [['Electroplanet','company@demo.test'],['Témoin','witness@demo.test']]) {
    await call('POST','/companies',{name,email},admin,201);
    await call('POST','/company-email/activate',{token:await link(email,'activate'),password:'company-security-password'});
  }
  independent.saveTransport('electroplanet',0,{marker:'business-preserved'});
  independent.saveTransport('temoin',0,{marker:'witness-preserved'});
  const company=(await login('company@demo.test')).token,witness=(await login('witness@demo.test')).token;
  const details=(id='electroplanet')=>call('GET','/admin/accounts/'+id,undefined,admin);
  return {root,file,db,base,independent,call,login,link,admin,company,witness,details};
}

test('comptes : blocage indépendant, déblocage, révocation globale et journal sans secrets',async t=>{
  const {file,db,independent,call,login,link,admin,company,witness,details}=await fixture(t);
  const first=await details();assert.equal(first.account.status,'active');assert.equal(first.account.access.allowed,true);
  assert.ok(first.account.lastLoginAt);assert.ok(first.history.some(event=>event.action==='login_succeeded'));
  const otherProcess=independent.login('company@demo.test','company-security-password');
  await call('POST','/company-email/request',{email:'company@demo.test'},'',202);
  const resetBeforeSuspension=await link('company@demo.test','reset');
  const beforeSuspension=await details();
  let changed=await call('PUT','/admin/accounts/electroplanet/status',{status:'suspended',revision:first.account.revision,companyId:'temoin'},admin);
  assert.equal(changed.account.status,'suspended');assert.deepEqual(changed.account.access.reasons,['account_suspended']);
  assert.equal(independent.companies().find(item=>item.id==='electroplanet').status,'active');
  assert.equal(changed.account.lastLoginAt,beforeSuspension.account.lastLoginAt);
  await call('GET','/companies/electroplanet/transport',undefined,company,401);
  assert.equal(independent.account(otherProcess),null);
  assert.throws(()=>independent.login('company@demo.test','company-security-password'),AccountSuspendedError);
  const reopened=new CompanyDirectory(file,true,true);
  try {
    const operator=reopened.login('admin@demo.test','admin-security-password');
    assert.equal(reopened.accountDetails(operator,'electroplanet').account.status,'suspended');
    assert.throws(()=>reopened.login('company@demo.test','company-security-password'),AccountSuspendedError);
  } finally {reopened.close();}
  const blocked=await login('company@demo.test','company-security-password',403);assert.equal(blocked.code,'ACCOUNT_SUSPENDED');assert.equal('token' in blocked,false);
  assert.equal(blocked.error,"Votre compte est temporairement bloqué. Veuillez contacter l'administrateur de la plateforme.");
  assert.deepEqual(await login('company@demo.test','incorrect-password',401),{error:'Adresse e-mail ou mot de passe incorrect.'});
  const messageCount=(await call('GET','/demo/messages')).length;
  await call('POST','/company-email/request',{email:'company@demo.test'},'',202);
  assert.equal((await call('GET','/demo/messages')).length,messageCount+1);
  await call('POST','/company-email/reset',{token:resetBeforeSuspension,password:'forbidden-reset-password'},'',400);
  await call('PUT','/companies/electroplanet/status',{status:'disabled'},admin);
  changed=await details();assert.deepEqual(changed.account.access.reasons,['company_disabled','account_suspended']);
  const unblockedWhileDisabled=await call('PUT','/admin/accounts/electroplanet/status',{status:'active',revision:changed.account.revision},admin);
  assert.equal(unblockedWhileDisabled.account.companyStatus,'disabled');
  assert.deepEqual(unblockedWhileDisabled.account.access.reasons,['company_disabled']);
  assert.equal((await login('company@demo.test','company-security-password',403)).code,'COMPANY_DISABLED');
  changed=await call('PUT','/admin/accounts/electroplanet/status',{status:'suspended',revision:unblockedWhileDisabled.account.revision},admin);
  await call('PUT','/companies/electroplanet/status',{status:'active'},admin);
  assert.equal((await details()).account.status,'suspended');
  await login('company@demo.test','company-security-password',403);
  await call('PUT','/admin/accounts/electroplanet/status',{status:'active',revision:changed.account.revision},admin);
  const restored=(await login('company@demo.test')).token;
  assert.equal(independent.account(otherProcess),null);
  await call('GET','/companies/electroplanet/transport',undefined,company,401);
  assert.deepEqual((await call('GET','/companies/electroplanet/transport',undefined,restored)).data,{marker:'business-preserved'});
  const secondProcess=independent.login('company@demo.test','company-security-password');
  const beforeRevoke=await details();
  await call('POST','/admin/accounts/electroplanet/revoke-sessions',{revision:beforeRevoke.account.revision},admin);
  await call('GET','/companies/electroplanet/transport',undefined,restored,401);assert.equal(independent.account(secondProcess),null);
  assert.equal((await details()).account.status,'active');
  await login('company@demo.test');
  await call('PUT','/companies/electroplanet/status',{status:'disabled'},admin);
  const inactive=await details();assert.equal(inactive.account.status,'active');assert.deepEqual(inactive.account.access.reasons,['company_disabled']);
  await login('company@demo.test','company-security-password',403);
  await call('GET','/admin/overview',undefined,admin);
  assert.deepEqual((await call('GET','/companies/temoin/transport',undefined,witness)).data,{marker:'witness-preserved'});
  const history=(await details()).history;
  for(const action of ['suspended','reactivated','sessions_revoked','login_refused'])assert.ok(history.some(event=>event.action===action),action);
  assert.ok(history.every(event=>!event.action.startsWith('company_')));
  assert.ok(Number(db.prepare("SELECT count(*) AS n FROM company_status_events WHERE company_id='electroplanet'").get().n)>=3);
  assert.ok(history.filter(event=>['suspended','reactivated','sessions_revoked'].includes(event.action)).every(event=>event.actor==='admin' && Date.parse(event.at)));
  const json=JSON.stringify(history);
  for(const secret of [admin,company,witness,resetBeforeSuspension,'company-security-password','incorrect-password'])assert.ok(!json.includes(secret));
  assert.equal(db.prepare('SELECT count(*) AS n FROM companies').get().n,2);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('compte bloqué : récupération vérifiée sans déblocage, expiration, usage unique et entreprise désactivée',async t=>{
  const {db,independent,call,login,link,admin,company,witness,details}=await fixture(t);
  let now=Date.now();t.mock.method(Date,'now',()=>now);now+=61000;
  const original=await details(),otherSession=independent.login('company@demo.test','company-security-password');
  const blocked=await call('PUT','/admin/accounts/electroplanet/status',{status:'suspended',revision:original.account.revision},admin);
  const version=Number(db.prepare("SELECT session_version FROM accounts WHERE login='electroplanet'").get().session_version);
  await login('company@demo.test','company-security-password',403);
  await call('GET','/companies/electroplanet/transport',undefined,company,401);
  await call('PUT','/admin/accounts/electroplanet/status',{status:'active',revision:blocked.account.revision},witness,403);
  await call('PUT','/admin/accounts/electroplanet/status',{status:'active',revision:blocked.account.revision},company,401);

  // Recovery uses the current verified mailbox; blocking still forbids activation
  // and verification of a staged replacement address.
  await call('PUT','/companies/electroplanet/email',{email:'pending@demo.test',currentPassword:'admin-security-password'},admin);
  await call('POST','/companies/electroplanet/email/verification',{},admin,409);
  const messages=(await call('GET','/demo/messages')).length;
  const neutral=await call('POST','/company-email/request',{email:'pending@demo.test'},'',202);
  assert.equal((await call('GET','/demo/messages')).length,messages);
  assert.deepEqual(await call('POST','/company-email/request',{email:'unknown@demo.test'},'',202),neutral);
  assert.deepEqual(await call('POST','/company-email/request',{email:'company@demo.test'},'',202),neutral);
  const token=await link('company@demo.test','reset');
  const stored=db.prepare("SELECT digest,issued_at,expires_at FROM company_email_links WHERE login='electroplanet' AND purpose='reset'").get();
  assert.equal(stored.digest,createHash('sha256').update(token).digest('hex'));
  assert.equal(Number(stored.expires_at)-Number(stored.issued_at),900000);
  await call('POST','/company-email/verify',{token},'',400);
  await call('POST','/company-email/activate',{token,password:'forbidden-activation-password'},'',400);
  const replacement='replacement-blocked-password';
  await call('POST','/company-email/reset',{token,password:replacement,login:'admin'});
  await call('POST','/company-email/reset',{token,password:'reused-token-password'},'',400);
  const after=await details();
  assert.equal(after.account.status,'suspended');assert.equal(after.account.revision,blocked.account.revision);
  assert.equal(after.account.companyStatus,'active');assert.deepEqual(after.account.access.reasons,['account_suspended']);
  assert.equal(after.account.pendingEmail,null);assert.equal(after.account.email,'company@demo.test');
  assert.equal(Number(db.prepare("SELECT session_version FROM accounts WHERE login='electroplanet'").get().session_version),version+1);
  assert.ok(after.history.some(event=>event.action==='password_reset'));
  assert.equal((await login('company@demo.test',replacement,403)).code,'ACCOUNT_SUSPENDED');
  await login('company@demo.test','company-security-password',401);
  assert.equal(independent.account(otherSession),null);
  await call('GET','/companies/electroplanet/transport',undefined,company,401);

  now+=61000;
  await call('POST','/company-email/request',{email:'company@demo.test'},'',202);
  const expired=await link('company@demo.test','reset');now+=900000;
  await call('POST','/company-email/reset',{token:expired,password:'expired-token-password'},'',400);
  await call('POST','/company-email/request',{email:'company@demo.test'},'',202);
  const beforeDeactivation=await link('company@demo.test','reset');
  await call('PUT','/companies/electroplanet/status',{status:'disabled'},admin);
  const count=(await call('GET','/demo/messages')).length;
  assert.deepEqual(await call('POST','/company-email/request',{email:'company@demo.test'},'',202),neutral);
  assert.equal((await call('GET','/demo/messages')).length,count);
  await call('POST','/company-email/reset',{token:beforeDeactivation,password:'disabled-company-password'},'',400);
  assert.equal((await login('company@demo.test',replacement,403)).code,'COMPANY_DISABLED');
  await call('PUT','/companies/electroplanet/status',{status:'active'},admin);
  await call('POST','/company-email/reset',{token:beforeDeactivation,password:'disabled-company-password'},'',400);
  assert.equal((await details()).account.status,'suspended');
  await call('PUT','/admin/accounts/electroplanet/status',{status:'active',revision:after.account.revision},admin);
  const restored=(await login('company@demo.test',replacement)).token;
  await login('company@demo.test','company-security-password',401);
  await call('GET','/companies/electroplanet/transport',undefined,company,401);
  assert.deepEqual((await call('GET','/companies/electroplanet/transport',undefined,restored)).data,{marker:'business-preserved'});
  assert.deepEqual((await call('GET','/companies/temoin/transport',undefined,witness)).data,{marker:'witness-preserved'});
  await login('admin@demo.test','admin-security-password');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('connexion API : succès sur un autre compte sans effacer les échecs ni le plafond global IP',async t=>{
  const {call,login,admin}=await fixture(t);
  let now=Date.now();t.mock.method(Date,'now',()=>now);now+=61000;
  for(let i=0;i<9;i++)await login('company@demo.test','incorrect-password',401);
  await login('witness@demo.test');
  await login('COMPANY@DEMO.TEST','incorrect-password',401);
  await login('company@demo.test','company-security-password',429);
  await call('GET','/admin/overview',undefined,admin);
  now+=61000;
  for(let i=0;i<20;i++)await login(i%2?'company@demo.test':'witness@demo.test');
  await login('admin@demo.test','admin-security-password',429);
  await login('unknown@demo.test','incorrect-password',429);
  now+=61000;
  await login('admin@demo.test','admin-security-password');await login('company@demo.test');
});

test('historique simplifié : limite côté serveur sans mélange ni suppression des événements',async t=>{
  const {db,call,admin,details}=await fixture(t);
  await call('PUT','/companies/electroplanet/status',{status:'disabled'},admin);
  await call('PUT','/companies/electroplanet/status',{status:'active'},admin);
  const timestamp=String(db.prepare('SELECT max(created_at) AS at FROM account_security_events').get().at);
  let last=0;
  for(let i=0;i<accountHistoryLimit+5;i++)last=Number(db.prepare("INSERT INTO account_security_events(login,action,actor,created_at) VALUES('electroplanet','sessions_revoked','admin',?)").run(timestamp).lastInsertRowid);
  const eventCount=db.prepare('SELECT count(*) AS n FROM account_security_events').get().n;
  const companyEventCount=db.prepare('SELECT count(*) AS n FROM company_status_events').get().n;
  const result=await details();
  assert.equal(result.history.length,accountHistoryLimit);
  assert.equal(result.history[0].id,'account-'+last);
  assert.ok(result.history.every(event=>event.action==='sessions_revoked'));
  assert.equal(db.prepare('SELECT count(*) AS n FROM account_security_events').get().n,eventCount);
  assert.equal(db.prepare('SELECT count(*) AS n FROM company_status_events').get().n,companyEventCount);
});

test('autorisations : administrateur protégé, isolation, révision obligatoire et concurrence',async t=>{
  const {call,admin,company,witness,details,db,base}=await fixture(t);
  for(const token of ['',company,witness]) {
    const status=token?403:401;
    await call('GET','/admin/accounts/electroplanet',undefined,token,status);
    await call('PUT','/admin/accounts/electroplanet/status',{status:'suspended',revision:0},token,status);
    await call('POST','/admin/accounts/electroplanet/revoke-sessions',{revision:0},token,status);
  }
  await call('GET','/companies/temoin/transport',undefined,company,403);
  const own=await details('admin');
  await call('PUT','/admin/accounts/admin/status',{status:'suspended',revision:own.account.revision},admin,400);
  await call('POST','/admin/accounts/admin/revoke-sessions',{revision:own.account.revision},admin,400);
  await call('GET','/admin/accounts/not-found',undefined,admin,404);
  await call('PUT','/admin/accounts/electroplanet/status',{status:'suspended'},admin,400);
  await call('PUT','/admin/accounts/electroplanet/status',{status:'invalid',revision:0},admin,400);
  const current=await details();
  const version=db.prepare("SELECT session_version FROM accounts WHERE login='electroplanet'").get().session_version;
  db.exec("CREATE TRIGGER refuse_security_audit BEFORE INSERT ON account_security_events WHEN NEW.action='suspended' BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");
  await call('PUT','/admin/accounts/electroplanet/status',{status:'suspended',revision:current.account.revision},admin,400);
  assert.equal((await details()).account.status,'active');
  assert.equal(db.prepare("SELECT session_version FROM accounts WHERE login='electroplanet'").get().session_version,version);
  await call('GET','/companies/electroplanet/transport',undefined,company);
  db.exec('DROP TRIGGER refuse_security_audit');
  const outcomes=await Promise.all([0,1].map(async()=>{
    const response=await fetch(base+'/admin/accounts/electroplanet/status',{method:'PUT',headers:{'content-type':'application/json',authorization:'Bearer '+admin},body:JSON.stringify({status:'suspended',revision:current.account.revision})});
    await response.json();return response.status;
  }));
  // Both requests use the same revision: only one administrative transition is committed.
  assert.deepEqual(outcomes.sort(),[200,409]);
  const after=await details();assert.equal(after.account.revision,current.account.revision+1);
  assert.equal(after.history.filter(event=>event.action==='suspended').length,1);
  assert.equal((await details('temoin')).account.status,'active');
  assert.equal(db.prepare("SELECT status FROM account_access WHERE login='admin'").get().status,'active');
  const rows=await call('GET','/admin/overview',undefined,admin);
  assert.equal(rows.accounts.find(account=>account.login==='electroplanet').access.allowed,false);
});

test('adresse vérifiée : maintien de l’ancien accès, réservation, confirmation et révocation',async t=>{
  const {call,login,link,admin,company,witness,details}=await fixture(t);
  await call('PUT','/companies/electroplanet/email',{email:'new@demo.test',currentPassword:'admin-security-password'},admin);
  const staged=await details();assert.equal(staged.account.email,'company@demo.test');assert.equal(staged.account.pendingEmail,'new@demo.test');
  assert.equal(staged.account.emailVerified,true);assert.equal(staged.account.access.allowed,true);
  await call('GET','/companies/electroplanet/transport',undefined,company);
  const oldAddress=(await login('company@demo.test')).token;
  await login('new@demo.test','company-security-password',401);
  await call('PUT','/companies/temoin/email',{email:'new@demo.test',currentPassword:'admin-security-password'},admin,400);
  await call('POST','/companies/electroplanet/email/verification',{},admin);
  const token=await link('new@demo.test','verify');
  await call('POST','/company-email/verify',{token});
  await call('POST','/company-email/verify',{token},'',400);
  const verified=await details();assert.equal(verified.account.email,'new@demo.test');assert.equal(verified.account.pendingEmail,null);
  await login('company@demo.test','company-security-password',401);await login('new@demo.test');
  await call('GET','/companies/electroplanet/transport',undefined,oldAddress,401);
  await call('GET','/companies/electroplanet/transport',undefined,company,401);
  await call('GET','/companies/temoin/transport',undefined,witness);
  assert.ok(verified.history.some(event=>event.action==='email_change_requested'&&event.actor==='admin'));
  assert.ok(verified.history.some(event=>event.action==='email_verified'&&event.actor==='electroplanet'));
});

test('migration additive : données historiques préservées et aucun faux historique de connexion',()=>{
  const parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-access-migration-')),previous=process.env.NODE_ENV;
  process.env.NODE_ENV='development';const file=demoDatabase(root),old=new DatabaseSync(file);
  const salt='12'.repeat(16),password=salt+':'+scryptSync('historical-password',salt,32).toString('hex');
  old.exec(`CREATE TABLE companies(id TEXT PRIMARY KEY,name TEXT NOT NULL COLLATE NOCASE,demo INTEGER DEFAULT 0,created_at TEXT);
    INSERT INTO companies VALUES('archive','Archive',0,NULL);
    CREATE TABLE accounts(login TEXT PRIMARY KEY,password TEXT NOT NULL,company TEXT UNIQUE);
    CREATE TABLE company_emails(login TEXT PRIMARY KEY REFERENCES accounts(login),address TEXT NOT NULL,verified_at TEXT);
    CREATE TABLE transport(company TEXT PRIMARY KEY,revision INTEGER NOT NULL,data TEXT NOT NULL);
    INSERT INTO transport VALUES('archive',4,'{"marker":"kept"}');`);
  old.prepare('INSERT INTO accounts VALUES(?,?,?)').run('archive',password,'archive');
  old.prepare('INSERT INTO company_emails VALUES(?,?,?)').run('archive','archive@demo.test','2026-01-01T00:00:00.000Z');old.close();
  const flag=process.env.TMS_ALLOW_AUTH_MIGRATION;
  try {
    delete process.env.TMS_ALLOW_AUTH_MIGRATION;const snapshot=readFileSync(file);
    assert.throws(()=>requireAuthMigrationApproval(file),/autorisation explicite/);
    assert.ok(readFileSync(file).equals(snapshot));
  } finally {if(flag===undefined)delete process.env.TMS_ALLOW_AUTH_MIGRATION;else process.env.TMS_ALLOW_AUTH_MIGRATION=flag;}
  const directory=new CompanyDirectory(file,true,true),db=new DatabaseSync(file);
  try {
    assert.equal(db.prepare('SELECT password FROM accounts').get().password,password);
    assert.deepEqual(directory.transport('archive'),{revision:4,data:{marker:'kept'}});
    assert.deepEqual(db.prepare('SELECT * FROM account_security_events').all(),[]);
    assert.equal(db.prepare('SELECT last_login_at FROM account_access').get().last_login_at,null);
    assert.equal(db.prepare('SELECT status FROM account_access').get().status,'active');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  } finally {directory.close();db.close();if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;if(dirname(resolve(root))===parent&&basename(root).startsWith('tms-access-migration-'))rmSync(root,{recursive:true,force:true});}
});
