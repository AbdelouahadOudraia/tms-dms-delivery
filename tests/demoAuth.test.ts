import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,mkdirSync,rmSync,readFileSync,existsSync,copyFileSync,linkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import type {AddressInfo} from 'node:net';
import nodemailer from 'nodemailer';
import {createSalesApi} from '../server/sales/api';
import {demoDatabase,DEMO_APPLICATION_ID} from '../server/sales/demoDatabase';
import {DemoMailbox} from '../server/sales/demoMailbox';
import {CompanyDirectory} from '../server/sales/companies';
import {legacyAdmin} from './support/legacyAccounts';

test('démo : inscription, invitation, récupération, liens temporaires et remise à zéro sans SMTP',async t=>{
  const parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-demo-auth-')),previous={...process.env};
  process.env.NODE_ENV='development';
  Object.assign(process.env,{TMS_TEST_SMTP_HOST:'smtp.gmail.com',TMS_TEST_SMTP_FROM:'never-send@example.test',TMS_TEST_SMTP_USER:'never-send@example.test',TMS_TEST_SMTP_PASS:'never-used',TMS_TEST_PUBLIC_URL:'https://never-used.example',TMS_COMPANY_API_CREDENTIALS:'invalid JSON ignored in demo'});
  const smtp=t.mock.method(nodemailer,'createTransport',()=>{throw new Error('Aucun transport SMTP ne doit être créé en démo.');});
  mkdirSync(join(root,'.data'));
  for(const name of ['sales-live.sqlite','tenant-test.sqlite']) {
    const sentinel=new DatabaseSync(join(root,'.data',name));sentinel.exec("CREATE TABLE protected_data(value TEXT); INSERT INTO protected_data VALUES('preserved')");sentinel.close();
  }
  const originals=['sales-live.sqlite','tenant-test.sqlite'].map(name=>readFileSync(join(root,'.data',name)));
  const api=createSalesApi(root,undefined,'demo'),http=api.app.listen(0,'127.0.0.1');await once(http,'listening');
  const file=join(root,'.data','demo','demo.sqlite'),db=new DatabaseSync(file,{readOnly:true});
  t.after(async()=>{
    await new Promise<void>(done=>http.close(()=>done()));api.close();db.close();
    for(const [i,name]of ['sales-live.sqlite','tenant-test.sqlite'].entries())assert.ok(readFileSync(join(root,'.data',name)).equals(originals[i]));
    for(const name of Object.keys(process.env))if(!(name in previous))delete process.env[name];Object.assign(process.env,previous);
    if(dirname(resolve(root))===parent && basename(root).startsWith('tms-demo-auth-'))rmSync(root,{recursive:true,force:true});
  });
  let now=Date.now();t.mock.method(Date,'now',()=>now);
  const base='http://127.0.0.1:'+(http.address() as AddressInfo).port;
  async function call(method:string,path:string,body?:object,token='',status=200,headers:Record<string,string>={}) {
    const res=await fetch(base+path,{method,headers:{'content-type':'application/json',authorization:'Bearer '+token,...headers},body:body&&JSON.stringify(body)});
    const data=await res.json();assert.equal(res.status,status,method+' '+path+' '+JSON.stringify(data));return data;
  }
  const login=async(email:string,password:string,status=200)=>call('POST','/login',{login:email,password},'',status);
  const messages=()=>call('GET','/demo/messages');
  const latest=async()=>{const list=await messages();assert.ok(list[0].link);return {message:list[0],token:list[0].link.split('/').pop()};};
  assert.deepEqual(await call('GET','/demo/status'),{enabled:true});
  assert.equal((await call('GET','/access')).setup,true);
  assert.equal(db.prepare('PRAGMA application_id').get().application_id,DEMO_APPLICATION_ID);
  await call('GET','/demo/messages',undefined,'',403,{'x-forwarded-for':'203.0.113.5'});
  await call('POST','/demo/reset',{confirmation:'REINITIALISER LA DEMO'},'',403,{origin:'https://other.example'});
  await call('POST','/setup',{email:'admin@demo.test',password:'demo-admin-password'},'',201);
  await login('admin@demo.test','demo-admin-password',401);
  const verification=await latest();assert.equal(verification.message.purpose,'verify');
  assert.equal(verification.message.recipient,'admin@demo.test');
  assert.ok(!JSON.stringify(verification.message).includes('never-used'));
  await call('POST','/company-email/verify',{token:verification.token});
  await call('POST','/company-email/verify',{token:verification.token},'',400);
  assert.equal((await messages())[0].state,'used');assert.equal((await messages())[0].link,null);
  const admin=(await login('admin@demo.test','demo-admin-password')).token;
  await call('POST','/companies',{name:'Entreprise Démo',email:'company@demo.test'},admin,201);
  const invitation=await latest();assert.equal(invitation.message.purpose,'activate');
  await login('company@demo.test','company-demo-password',401);
  await call('POST','/company-email/verify',{token:invitation.token},'',400);
  await call('POST','/company-email/activate',{token:invitation.token,password:'company-demo-password'});
  const company=(await login('company@demo.test','company-demo-password')).token;
  await call('GET','/admin/overview',undefined,company,403);
  const transport={deliveries:[],tours:[],drivers:[],vehicles:[],incidents:[],addresses:[],zones:[],workflowSettings:{}};
  await call('PUT','/companies/entreprise-demo/transport',{revision:0,data:transport},company);
  for(const [email,oldToken,newPassword]of [['admin@demo.test',admin,'new-admin-password'],['company@demo.test',company,'new-company-password']]) {
    const unknown=await call('POST','/company-email/request',{email:'absent@demo.test'},'',202);
    assert.deepEqual(await call('POST','/company-email/request',{email},'',202),unknown);
    const reset=await latest();assert.equal(reset.message.purpose,'reset');
    const row=db.prepare("SELECT issued_at,expires_at FROM company_email_links WHERE purpose='reset'").get();
    assert.equal(Number(row.expires_at)-Number(row.issued_at),900000);
    await call('POST','/company-email/reset',{token:reset.token,password:newPassword});
    await call('POST','/company-email/reset',{token:reset.token,password:newPassword},'',400);
    await call('GET',email.startsWith('admin')?'/admin/overview':'/companies/entreprise-demo/transport',undefined,oldToken,401);
    await login(email,newPassword);
  }
  now+=61000;
  await call('POST','/company-email/request',{email:'admin@demo.test'},'',202);const expired=await latest();
  now+=900000;
  assert.equal((await messages())[0].state,'expired');
  await call('POST','/company-email/reset',{token:expired.token,password:'expired-password'},'',400);
  await call('POST','/company-email/request',{email:'admin@demo.test'},'',202);const forced=await latest();
  await call('POST','/demo/messages/'+forced.message.id+'/expire');
  await call('POST','/company-email/reset',{token:forced.token,password:'forced-expired-password'},'',400);
  const active=(await login('admin@demo.test','new-admin-password')).token;
  await call('PUT','/companies/entreprise-demo/status',{status:'disabled'},active);
  const count=(await messages()).length;
  await call('POST','/company-email/request',{email:'company@demo.test'},'',202);assert.equal((await messages()).length,count);
  await call('POST','/demo/reset',{confirmation:'incorrect'},'',400);
  assert.equal((await call('GET','/access',undefined,active)).account.role,'admin');
  const fault=new DatabaseSync(file);
  try {
    fault.exec("CREATE TRIGGER refuse_demo_reset BEFORE DELETE ON companies BEGIN SELECT RAISE(ABORT,'test reset rollback'); END");
    await call('POST','/demo/reset',{confirmation:'REINITIALISER LA DEMO'},'',400);
    assert.equal((await call('GET','/access',undefined,active)).account.role,'admin');
    assert.equal(db.prepare('SELECT count(*) AS n FROM accounts').get().n,2);
    assert.equal(db.prepare('SELECT count(*) AS n FROM transport').get().n,1);
    assert.equal((await messages()).length,count);
    fault.exec('DROP TRIGGER refuse_demo_reset');
  } finally {fault.close();}
  await call('POST','/demo/reset',{confirmation:'REINITIALISER LA DEMO'});
  assert.deepEqual(await messages(),[]);assert.equal((await call('GET','/access',undefined,active)).setup,true);
  await call('GET','/admin/overview',undefined,active,401);
  for(const table of ['accounts','companies','company_emails','company_email_links','account_activation','sales_workspaces','transport','company_status_events','email_security_events'])
    assert.equal(db.prepare('SELECT count(*) AS n FROM '+table).get().n,0,table);
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  await call('POST','/company-email/verify',{token:verification.token},'',400);
  await call('POST','/setup',{email:'again@demo.test',password:'restart-demo-password'},'',201);
  const again=await latest();await call('POST','/company-email/verify',{token:again.token});
  await login('again@demo.test','restart-demo-password');
  assert.equal(smtp.mock.callCount(),0);
});

test('démo : refuse la production, les autres bases et les routes hors du mode démo',async t=>{
  const previous=process.env.NODE_ENV,parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-demo-isolation-'));
  const env={...process.env};
  t.after(()=>{Object.assign(process.env,env);for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;if(dirname(resolve(root))===parent && basename(root).startsWith('tms-demo-isolation-'))rmSync(root,{recursive:true,force:true});});
  process.env.NODE_ENV='production';assert.throws(()=>createSalesApi(root,undefined,'demo'),/développement/);
  assert.equal(existsSync(join(root,'.data')),false);
  process.env.NODE_ENV='development';const file=demoDatabase(root);
  const directory=new CompanyDirectory(file,true,true);directory.close();
  const source=join(root,'.data','sales-live.sqlite');copyFileSync(file,source);
  assert.throws(()=>new DemoMailbox(source),/isolée/);
  const fake=new CompanyDirectory(source);assert.throws(()=>fake.resetDemo(),/réservée/);fake.close();
  const wrongRoot=mkdtempSync(join(parent,'tms-demo-isolation-'));
  try {mkdirSync(join(wrongRoot,'.data','demo'),{recursive:true});linkSync(source,join(wrongRoot,'.data','demo','demo.sqlite'));assert.throws(()=>demoDatabase(wrongRoot),/partagée/);}
  finally {if(dirname(resolve(wrongRoot))===parent && basename(wrongRoot).startsWith('tms-demo-isolation-'))rmSync(wrongRoot,{recursive:true,force:true});}
  for(const key of Object.keys(process.env))if(key.startsWith('TMS_'))delete process.env[key];
  const api=createSalesApi(root,undefined,'local-test'),http=api.app.listen(0,'127.0.0.1');await once(http,'listening');
  try {
    const base='http://127.0.0.1:'+(http.address() as AddressInfo).port;
    assert.deepEqual(await (await fetch(base+'/demo/status')).json(),{enabled:false});
    for(const route of ['/demo/messages','/demo/reset']) {
      const res=await fetch(base+route,{method:route.endsWith('reset')?'POST':'GET',headers:{'content-type':'application/json'},body:route.endsWith('reset')?JSON.stringify({confirmation:'REINITIALISER LA DEMO'}):undefined});
      assert.equal(res.status,401);assert.ok(!(await res.text()).includes('#company-email/'));
    }
    legacyAdmin(root,'standard-test-admin-password',true);
    const login=await fetch(base+'/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({login:'admin@fixture.test',password:'standard-test-admin-password'})});
    const {token}=await login.json();assert.ok(token);
    for(const route of ['/demo/messages','/demo/reset']) {
      const response=await fetch(base+route,{method:route.endsWith('reset')?'POST':'GET',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:route.endsWith('reset')?JSON.stringify({confirmation:'REINITIALISER LA DEMO'}):undefined});
      assert.equal(response.status,404);
    }
    assert.equal((await fetch(base+'/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'not-demo@example.test',password:'not-demo-password'})})).status,403);
  } finally {await new Promise<void>(done=>http.close(()=>done()));api.close();}
});
