import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomBytes} from 'node:crypto';
import type {AddressInfo} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import nodemailer from 'nodemailer';
import {createSalesApi} from '../server/sales/api';
import {CompanyDirectory} from '../server/sales/companies';
import {demoDatabase} from '../server/sales/demoDatabase';
import {DemoMailbox} from '../server/sales/demoMailbox';
import {configureMail} from '../server/sales/mail';
import {openSmtpInbox} from './support/smtpInbox';

async function eventually(check:()=>boolean|Promise<boolean>) {
  const end=performance.now()+4000;
  while(performance.now()<end){if(await check())return;await delay(10);}
  assert.fail('La notification attendue n’a pas été traitée.');
}

async function fixture(t:TestContext) {
  const parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-unblock-')),previous=process.env.NODE_ENV;
  process.env.NODE_ENV='development';
  const smtp=t.mock.method(nodemailer,'createTransport',()=>{throw new Error('SMTP interdit dans cette démo');});
  let api=createSalesApi(root,undefined,'demo');const file=demoDatabase(root),db=new DatabaseSync(file),directory=new CompanyDirectory(file,true,true);
  let http=api.app.listen(0,'127.0.0.1');await once(http,'listening');
  let base='http://127.0.0.1:'+(http.address() as AddressInfo).port;
  t.after(async()=>{
    await new Promise<void>(done=>http.close(()=>done()));api.close();directory.close();db.close();
    assert.equal(smtp.mock.callCount(),0);
    assert.equal(existsSync(join(root,'.data','sales-live.sqlite')),false);
    assert.equal(existsSync(join(root,'.data','tenant-test.sqlite')),false);
    if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;
    if(dirname(resolve(root))===parent&&basename(root).startsWith('tms-unblock-'))rmSync(root,{recursive:true,force:true});
  });
  async function call(method:string,path:string,body?:object,token='',status=200) {
    const response=await fetch(base+path,{method,headers:{'content-type':'application/json',authorization:'Bearer '+token},body:body&&JSON.stringify(body)});
    const data=await response.json();assert.equal(response.status,status,method+' '+path+' '+JSON.stringify(data));return data;
  }
  const login=(email='company@demo.test',password='company-unblock-password',status=200)=>call('POST','/login',{login:email,password},'',status);
  const messages=()=>call('GET','/demo/messages');
  const link=async(email:string,purpose:string)=>{
    const item=(await messages()).find(item=>item.recipient===email&&item.purpose===purpose);
    assert.ok(item?.link);return item.link.split('/').pop() as string;
  };
  await call('POST','/setup',{email:'admin@demo.test',password:'admin-unblock-password'},'',201);
  await call('POST','/company-email/verify',{token:await link('admin@demo.test','verify')});
  let admin=(await login('admin@demo.test','admin-unblock-password')).token;
  for(const [name,email]of [['Electroplanet','company@demo.test'],['Témoin','witness@demo.test']]) {
    await call('POST','/companies',{name,email},admin,201);
    await call('POST','/company-email/activate',{token:await link(email,'activate'),password:'company-unblock-password'});
  }
  directory.saveTransport('electroplanet',0,{marker:'business-preserved'});
  directory.saveTransport('temoin',0,{marker:'witness-preserved'});
  const company=(await login()).token,witness=(await login('witness@demo.test')).token;
  const details=(id='electroplanet')=>call('GET','/admin/accounts/'+id,undefined,admin);
  const access=async(status:string,id='electroplanet')=>call('PUT','/admin/accounts/'+id+'/status',{status,revision:(await details(id)).account.revision},admin);
  const request=(email='company@demo.test',password='company-unblock-password',status=202)=>call('POST','/account-unblock/request',{login:email,password},'',status);
  const list=()=>call('GET','/admin/unblock-requests',undefined,admin);
  async function confirmed(email='company@demo.test',password='company-unblock-password'){
    assert.deepEqual(await request(email,password),{state:'verification_required'});
    const token=await link(email,'unblock');
    assert.deepEqual(await call('POST','/account-unblock/verify',{token}),{state:'pending'});
    return {token,row:(await list()).find(item=>item.email===email&&item.status==='pending')};
  }
  const decide=(row,decision:string,status=200)=>call('PUT','/admin/unblock-requests/'+row.id,{decision,revision:row.accountRevision},admin,status);
  async function restart(){
    await new Promise<void>(done=>http.close(()=>done()));api.close();
    api=createSalesApi(root,undefined,'demo');http=api.app.listen(0,'127.0.0.1');await once(http,'listening');
    base='http://127.0.0.1:'+(http.address() as AddressInfo).port;
    admin=(await login('admin@demo.test','admin-unblock-password')).token;
  }
  return {call,login,messages,link,admin,company,witness,details,access,request,list,confirmed,decide,db,directory,restart};
}

test('demande vérifiée : acceptation, révocation, notification et isolation sans réactivation entreprise',async t=>{
  const f=await fixture(t),foreign=f.directory.login('company@demo.test','company-unblock-password');
  await f.access('suspended');
  assert.equal((await f.login(undefined,undefined,403)).code,'ACCOUNT_SUSPENDED');
  const {row,token}=await f.confirmed();assert.equal(row.status,'pending');assert.equal(row.identityCurrent,true);
  assert.equal((await f.details()).account.status,'suspended');
  assert.equal(f.directory.account(foreign),null);
  await f.call('GET','/companies/electroplanet/transport',undefined,f.company,401);
  await f.call('POST','/account-unblock/verify',{token},'',400);
  const count=(await f.messages()).length;
  assert.deepEqual(await f.request(),{state:'pending'});assert.equal((await f.messages()).length,count);
  const unrelated=await f.call('GET','/companies/temoin/transport',undefined,f.witness);
  await f.call('PUT','/companies/electroplanet/status',{status:'disabled'},f.admin);
  const accepted=await f.decide(row,'accepted');assert.equal(accepted.status,'accepted');assert.equal(accepted.decidedBy,'admin');
  const current=await f.details();assert.equal(current.account.status,'active');assert.equal(current.account.companyStatus,'disabled');
  assert.equal((await f.login(undefined,undefined,403)).code,'COMPANY_DISABLED');
  assert.deepEqual(await f.call('GET','/companies/temoin/transport',undefined,f.witness),unrelated);
  await eventually(async()=> (await f.list())[0].notificationStatus==='sent');
  const notice=(await f.messages()).find(item=>item.purpose==='notice'&&item.recipient==='company@demo.test');
  assert.equal(notice.link,null);assert.equal(notice.state,'information');assert.match(notice.body,/acceptée/);
  assert.ok((await f.messages()).some(item=>item.purpose==='notice'&&item.recipient==='admin@demo.test'));
  await f.decide(row,'accepted',409);
  await f.call('PUT','/companies/electroplanet/status',{status:'active'},f.admin);
  const fresh=(await f.login()).token;
  assert.deepEqual((await f.call('GET','/companies/electroplanet/transport',undefined,fresh)).data,{marker:'business-preserved'});
  await f.call('GET','/companies/electroplanet/transport',undefined,f.company,401);
  const history=(await f.details()).history;
  for(const action of ['unblock_requested','unblock_accepted'])assert.equal(history.filter(item=>item.action===action).length,1);
  const projection=JSON.stringify(await f.list())+JSON.stringify(history);
  for(const secret of [token,f.admin,f.company,'company-unblock-password'])assert.equal(projection.includes(secret),false);
  assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('preuves : identité, durée, usage unique, association au compte et autorisations serveur',async t=>{
  const f=await fixture(t);let now=Date.now();t.mock.method(Date,'now',()=>now);now+=61000;
  await f.access('suspended');
  const before=(await f.messages()).length;
  for(const [email,password]of [['company@demo.test','wrong-password'],['unknown@demo.test','company-unblock-password'],['admin@demo.test','admin-unblock-password'],['witness@demo.test','company-unblock-password']])
    assert.deepEqual(await f.request(email,password,401),{error:'Adresse e-mail ou mot de passe incorrect.'});
  assert.equal((await f.messages()).length,before);now+=61000;
  await f.request();const token=await f.link('company@demo.test','unblock');
  const stored=f.db.prepare("SELECT * FROM account_unblock_links WHERE login='electroplanet'").get();
  assert.equal(stored.digest,createHash('sha256').update(token).digest('hex'));
  assert.equal(Number(stored.expires_at)-Number(stored.issued_at),900000);assert.equal(JSON.stringify(stored).includes(token),false);
  await f.request();assert.equal((await f.messages()).length,before+1);
  await f.call('POST','/company-email/reset',{token,password:'forbidden-password'},'',400);
  await f.call('POST','/company-email/request',{email:'company@demo.test'},'',202);
  await f.call('POST','/account-unblock/verify',{token:await f.link('company@demo.test','reset')},'',400);
  await f.call('POST','/account-unblock/verify',{token:'not-a-token'},'',400);
  await f.call('POST','/account-unblock/verify',{token:randomBytes(32).toString('base64url')},'',400);
  now+=900000;await f.call('POST','/account-unblock/verify',{token},'',400);
  await f.request();const fresh=await f.link('company@demo.test','unblock');assert.notEqual(fresh,token);
  await f.call('POST','/account-unblock/verify',{token:fresh,login:'admin',companyId:'temoin'});
  const [row]=await f.list();assert.equal(row.login,'electroplanet');assert.equal(row.companyId,'electroplanet');
  for(const [credential,status]of [['',401],[f.witness,403],[f.company,401]] as const){
    await f.call('GET','/admin/unblock-requests',undefined,credential,status);
    await f.call('PUT','/admin/unblock-requests/'+row.id,{decision:'accepted',revision:row.accountRevision},credential,status);
  }
  await f.call('PUT','/admin/unblock-requests/'+row.id,{decision:'accepted'},f.admin,400);
  await f.call('PUT','/admin/unblock-requests/'+row.id,{decision:'unknown',revision:row.accountRevision},f.admin,400);
  assert.equal((await f.details()).account.status,'suspended');
});

test('refus : historique, temporisation et maintien du blocage après réinitialisation du mot de passe',async t=>{
  const f=await fixture(t);let now=Date.now();t.mock.method(Date,'now',()=>now);now+=61000;
  await f.access('suspended');const {row}=await f.confirmed();
  await f.call('POST','/company-email/request',{email:'company@demo.test'},'',202);
  const reset=await f.link('company@demo.test','reset');
  await f.call('POST','/company-email/reset',{token:reset,password:'replacement-unblock-password'});
  assert.equal((await f.details()).account.status,'suspended');assert.equal((await f.list())[0].identityCurrent,false);
  await f.decide(row,'accepted',409);
  const refused=await f.decide(row,'rejected');assert.equal(refused.status,'rejected');
  await eventually(async()=> (await f.list())[0].notificationStatus==='sent');
  assert.ok((await f.messages()).some(item=>item.purpose==='notice'&&item.recipient==='company@demo.test'&&item.body.includes('refusée')));
  assert.equal((await f.login('company@demo.test','replacement-unblock-password',403)).code,'ACCOUNT_SUSPENDED');
  await f.request('company@demo.test','replacement-unblock-password',429);
  now+=600001;await f.request('company@demo.test','replacement-unblock-password');
  const newToken=await f.link('company@demo.test','unblock');
  await f.call('POST','/account-unblock/verify',{token:newToken});
  const pending=(await f.list()).find(item=>item.status==='pending');
  assert.equal(pending.identityCurrent,true);await f.decide(pending,'accepted');
  await f.login('company@demo.test','replacement-unblock-password');
  assert.ok((await f.details()).history.some(item=>item.action==='unblock_rejected'));
});

test('concurrence et audit : une seule décision, rollback intégral et déblocage manuel cohérent',async t=>{
  const f=await fixture(t);await f.access('suspended');const {row}=await f.confirmed();
  const account=f.db.prepare("SELECT * FROM accounts WHERE login='electroplanet'").get();
  const events=f.db.prepare('SELECT count(*) AS n FROM account_security_events').get().n;
  f.db.exec("CREATE TRIGGER reject_unblock_audit BEFORE INSERT ON account_security_events WHEN NEW.action='unblock_accepted' BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");
  await f.decide(row,'accepted',400);
  assert.deepEqual(f.db.prepare("SELECT * FROM accounts WHERE login='electroplanet'").get(),account);
  assert.equal((await f.details()).account.status,'suspended');assert.equal((await f.list())[0].status,'pending');
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM account_security_events').get().n,events);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM account_unblock_notices WHERE kind='decision'").get().n,0);
  f.db.exec('DROP TRIGGER reject_unblock_audit');
  const outcomes=await Promise.all(['accepted','rejected'].map(async decision=>{
    try {return {ok:true,value:await f.decide(row,decision)};}
    catch(error){assert.match(String(error),/409/);return {ok:false};}
  }));
  assert.equal(outcomes.filter(item=>item.ok).length,1);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM account_unblock_notices WHERE kind='decision'").get().n,1);
  assert.equal((await f.list()).filter(item=>item.status==='pending').length,0);
  await f.access('suspended','temoin');const second=await f.confirmed('witness@demo.test');
  await f.access('active','temoin');const manual=(await f.list()).find(item=>item.id===second.row.id);
  assert.equal(manual.status,'accepted');assert.equal(manual.decidedBy,'admin');
  await f.decide(second.row,'accepted',409);assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('liens : changement de mot de passe ou d’adresse invalide la preuve sans débloquer',async t=>{
  const f=await fixture(t);let now=Date.now();t.mock.method(Date,'now',()=>now);now+=61000;
  await f.access('suspended');await f.request();const old=await f.link('company@demo.test','unblock');
  await f.call('POST','/company-email/request',{email:'company@demo.test'},'',202);
  await f.call('POST','/company-email/reset',{token:await f.link('company@demo.test','reset'),password:'new-proof-password'});
  await f.call('POST','/account-unblock/verify',{token:old},'',400);
  now+=61000;await f.request('company@demo.test','new-proof-password');const addressProof=await f.link('company@demo.test','unblock');
  f.directory.emailRecovery.setAccountAddress('electroplanet','new-address@demo.test');
  await f.call('POST','/account-unblock/verify',{token:addressProof},'',400);
  await f.request('new-address@demo.test','new-proof-password',401);
  assert.equal((await f.details()).account.status,'suspended');assert.equal((await f.list()).length,0);
});

test('limitation partagée : un succès ailleurs ne permet pas de contourner la demande de déblocage',async t=>{
  const f=await fixture(t);let now=Date.now();t.mock.method(Date,'now',()=>now);now+=61000;
  await f.access('suspended');
  for(let i=0;i<10;i++)await f.login('company@demo.test','wrong-password',401);
  await f.login('witness@demo.test');await f.request(undefined,undefined,429);
  now+=61000;
  for(let i=0;i<6;i++)await f.request();
  await f.request(undefined,undefined,429);
  assert.equal((await f.messages()).filter(item=>item.purpose==='unblock').length,1);
  assert.equal((await f.list()).length,0);
});

test('notifications : panne persistée, reprise après redémarrage et propriété des baux',async t=>{
  const f=await fixture(t);let now=Date.now();t.mock.method(Date,'now',()=>now);now+=61000;
  const failure=t.mock.method(DemoMailbox.prototype,'sendNotice',async()=>{throw new Error('private SMTP details must not be persisted');});
  await f.access('suspended');const {row}=await f.confirmed();await f.decide(row,'rejected');
  await eventually(()=>Number(f.db.prepare("SELECT count(*) AS n FROM account_unblock_notices WHERE status='error'").get().n)===2);
  assert.equal((await f.list())[0].status,'rejected');assert.equal((await f.details()).account.status,'suspended');
  const persisted=JSON.stringify(f.db.prepare('SELECT * FROM account_unblock_notices').all());
  assert.equal(persisted.includes('private SMTP'),false);
  failure.mock.restore();now+=61000;await f.restart();
  await eventually(()=>Number(f.db.prepare("SELECT count(*) AS n FROM account_unblock_notices WHERE status='sent'").get().n)===2);
  assert.equal((await f.messages()).filter(item=>item.purpose==='notice').length,2);
  // An expired worker cannot acknowledge or overwrite a newer worker's result.
  f.db.exec("UPDATE account_unblock_notices SET status='pending',available_at=0,lease_until=0,lease_token=NULL WHERE kind='decision'");
  const first=f.directory.unblockRequests.claimNotice();assert.ok(first);now+=60001;
  const second=f.directory.unblockRequests.claimNotice();assert.ok(second);assert.equal(first.id,second.id);assert.notEqual(first.lease,second.lease);
  assert.ok(f.directory.unblockRequests.resolveNoticeRecipient(second.id,second.lease));
  assert.equal(f.directory.unblockRequests.noticeIsCurrent(first.id,first.lease),false);
  assert.equal(f.directory.unblockRequests.noticeIsCurrent(second.id,second.lease),true);
  f.directory.unblockRequests.noticeDelivered(second.id,second.lease,true);
  f.directory.unblockRequests.noticeDelivered(first.id,first.lease,false);
  assert.equal(f.db.prepare('SELECT status FROM account_unblock_notices WHERE id=?').get(first.id).status,'sent');
  assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('SMTP réel local : confirmation privée et notification, sans envoi externe ni journaux secrets',async t=>{
  const inbox=await openSmtpInbox();const previous={...process.env};
  t.after(async()=>{await inbox.close();for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);});
  for(const key of Object.keys(process.env))if(key.startsWith('TMS_TEST_SMTP_'))delete process.env[key];
  Object.assign(process.env,{NODE_ENV:'development',TMS_TEST_SMTP_HOST:'127.0.0.1',TMS_TEST_SMTP_PORT:String(inbox.port),TMS_TEST_SMTP_SECURE:'false',TMS_TEST_SMTP_FROM:'platform@demo.test',TMS_TEST_PUBLIC_URL:'http://127.0.0.1:3010'});
  const mail=configureMail(true);assert.ok(mail);await mail.check();
  const token=randomBytes(32).toString('base64url');await mail.sendUnblockVerification('company@demo.test',token);
  const decode=(raw:string)=>{
    const [headers,...parts]=raw.split('\r\n\r\n'),body=parts.join('\r\n\r\n');
    if(/Content-Transfer-Encoding: base64/i.test(headers))return Buffer.from(body,'base64').toString('utf8');
    if(/Content-Transfer-Encoding: quoted-printable/i.test(headers))return Buffer.from(body.replace(/=\r\n/g,'').replace(/=([0-9A-F]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16))),'binary').toString('utf8');
    return body;
  };
  assert.match(inbox.messages[0].to,/company@demo.test/);
  const body=decode(inbox.messages[0].content);assert.ok(body.includes('http://127.0.0.1:3010/#company-email/unblock/'+token));assert.match(body,/15 minutes/);
  await mail.sendNotice('company@demo.test','Demande de déblocage acceptée','Votre demande a été acceptée.');
  assert.match(decode(inbox.messages[1].content),/acceptée/);assert.equal(decode(inbox.messages[1].content).includes(token),false);
  inbox.refuseMail();await assert.rejects(mail.sendUnblockVerification('company@demo.test',token));
});
