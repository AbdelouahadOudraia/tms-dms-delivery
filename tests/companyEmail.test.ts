import {test, type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,dirname,basename} from 'node:path';
import type {AddressInfo} from 'node:net';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {createSalesApi} from '../server/sales/api';
import {openSmtpInbox} from './support/smtpInbox';
import {legacyAdmin,legacyCompany} from './support/legacyAccounts';

async function fixture(t:TestContext,port?:number) {
  const parent=resolve(tmpdir()), root=mkdtempSync(join(parent,'tms-email-test-'));
  const oldEnv={...process.env};
  const clearMailEnv=()=>{for (const name of Object.keys(process.env)) if (/^TMS_(TEST_)?(SMTP_|PUBLIC_URL)/.test(name)) delete process.env[name];};
  clearMailEnv();
  process.env.NODE_ENV='development';
  // Standard settings must never be inherited by tenant-test.
  Object.assign(process.env,{TMS_SMTP_HOST:'127.0.0.1',TMS_SMTP_FROM:'other@gmail.com',TMS_PUBLIC_URL:'https://other.example.test'});
  if (port) Object.assign(process.env,{TMS_TEST_SMTP_HOST:'127.0.0.1',TMS_TEST_SMTP_PORT:String(port),
    TMS_TEST_SMTP_FROM:'tms@gmail.com',TMS_TEST_PUBLIC_URL:'http://127.0.0.1:3010'});
  const api=createSalesApi(root,undefined,'local-test');
  const http=api.app.listen(0,'127.0.0.1'); await once(http,'listening');
  const db=new DatabaseSync(join(root,'.data','tenant-test.sqlite'),{readOnly:true});
  t.after(async()=>{
    await new Promise<void>(done=>http.close(()=>done())); api.close(); db.close();
    try { assert.equal(existsSync(join(root,'.data','sales-live.sqlite')),false); }
    finally {
      clearMailEnv();
      for(const [k,v] of Object.entries(oldEnv)) if (/^TMS_(TEST_)?(SMTP_|PUBLIC_URL)/.test(k)) process.env[k]=v;
      if(oldEnv.NODE_ENV===undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=oldEnv.NODE_ENV;
      if(dirname(resolve(root))===parent && basename(root).startsWith('tms-email-test-')) rmSync(root,{recursive:true,force:true});
    }
  });
  const base='http://127.0.0.1:'+(http.address() as AddressInfo).port;
  async function call(method:string,path:string,body?:object,token='',expected=200) {
    if(method==='PUT' && path.endsWith('/email') && token) body={...body,currentPassword:'initial-admin-password'};
    const res=await fetch(base+path,{method,headers:{'content-type':'application/json',authorization:'Bearer '+token},body:body&&JSON.stringify(body)});
    assert.equal(res.status,expected,method+' '+path);
    return res.json();
  }
  legacyAdmin(root,'initial-admin-password',true);
  const admin=(await call('POST','/login',{login:'admin@fixture.test',password:'initial-admin-password'})).token;
  for(const login of ['atelier','temoin']) {legacyCompany(root,login,login,'initial-company-password',true);await call('GET','/companies/'+login+'/state',undefined,admin);}
  return {admin,db,call,base};
}

test('récupération entreprise : SMTP isolé absent, même erreur publique pour tous',async t=>{
  const {admin,call}=await fixture(t);
  await call('PUT','/companies/atelier/email',{email:'atelier@gmail.com'},admin);
  await call('POST','/companies/atelier/email/verification',{},admin,503);
  const request=(login:string)=>call('POST','/company-email/request',{email:login+'@gmail.com'},'',503);
  assert.deepEqual(await request('atelier'),await request('inconnu'));
});

test('SMTP réel : vérification, liens liés au compte, expiration, révocation et usage unique',async t=>{
  const inbox=await openSmtpInbox(); t.after(inbox.close);
  const {admin,db,call,base}=await fixture(t,inbox.port);
  let now=Date.now(); t.mock.method(Date,'now',()=>now);
  const account='/companies/atelier';
  let currentLoginAddress='atelier@fixture.test';
  const login=async(id:string,password:string)=>(await call('POST','/login',{login:id==='atelier'?currentLoginAddress:id+'@fixture.test',password})).token;
  let session=await login('atelier','initial-company-password');
  const witness=await login('temoin','initial-company-password');
  const changeEmail=(email:string)=>{address=email;currentLoginAddress=email;return call('PUT',account+'/email',{email},admin);};
  let address='atelier@gmail.com';
  const request=(id:string,status=202)=>call('POST','/company-email/request',{email:id==='atelier'?address:id+'@gmail.com'},'',status);
  const verify=(token:string,status=200)=>call('POST','/company-email/verify',{token},'',status);
  const reset=(token:string,status=200)=>call('POST','/company-email/reset',{token,password:'replacement-company-password',login:'temoin'},'',status);
  const tokenFromMail=async(index:number,purpose:string)=>{
    const url=await inbox.link(index);
    assert.ok(url.origin==='http://127.0.0.1:3010' && url.hash.startsWith('#company-email/'+purpose+'/'));
    return url.hash.split('/').pop()!;
  };
  await call('PUT',account+'/email',{email:'no@gmail.com'},session,403);
  await call('POST',account+'/email/verification',{},witness,403);
  await call('PUT',account+'/email',{email:'a@gmail.com,b@gmail.com'},admin,400);
  await changeEmail('atelier@gmail.com');
  assert.deepEqual(await request('absente'),await request('atelier'));
  await call('POST',account+'/email/verification',{},admin);
  const confirmation=await tokenFromMail(0,'verify');
  assert.equal(inbox.messages[0].to,'<atelier@gmail.com>');
  await reset(confirmation,400);
  await verify(confirmation); await verify(confirmation,400);
  session=await login('atelier','initial-company-password');
  const overview=await call('GET','/admin/overview',undefined,admin);
  assert.equal(overview.companies.find(c=>c.id==='atelier').emailVerified,true);
  assert.ok(!JSON.stringify(overview).includes(confirmation));
  const accepted=await request('atelier');
  const old=await tokenFromMail(1,'reset');
  assert.deepEqual(await request('atelier'),accepted);
  const row=db.prepare("SELECT digest,issued_at,expires_at FROM company_email_links WHERE purpose='reset'").get();
  assert.ok(row.digest===createHash('sha256').update(old).digest('hex'));
  assert.equal(Number(row.expires_at)-Number(row.issued_at),900000);
  now+=61000;
  await request('atelier'); const expiring=await tokenFromMail(2,'reset');
  await reset(old,400); await verify(expiring,400);
  now+=900000; await reset(expiring,400);
  await request('atelier'); const usable=await tokenFromMail(3,'reset');
  const consume=()=>fetch(base+'/company-email/reset',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({token:usable,password:'replacement-company-password',login:'temoin'})});
  const attempts=await Promise.all([consume(),consume()]);
  assert.deepEqual(attempts.map(r=>r.status).sort(),[200,400]);
  await call('GET',account+'/transport',undefined,session,401);
  await call('GET','/companies/temoin/transport',undefined,witness);
  await login('admin','initial-admin-password'); await login('atelier','replacement-company-password');
  await call('POST','/login',{login:'atelier',password:'initial-company-password'},'',401);
  now+=61000;
  await request('atelier'); const beforeChange=await tokenFromMail(4,'reset');
  await changeEmail('new@gmail.com'); await reset(beforeChange,400);
  await request('atelier'); await call('POST',account+'/email/verification',{},admin);
  const newConfirmation=await tokenFromMail(5,'verify'); assert.equal(inbox.messages[5].to,'<new@gmail.com>');
  await verify(newConfirmation);
  await request('atelier'); const beforeSuspension=await tokenFromMail(6,'reset');
  await call('PUT',account+'/status',{status:'disabled'},admin);
  assert.deepEqual(await request('atelier'),accepted);
  await reset(beforeSuspension,400);
  await call('PUT',account+'/status',{status:'active'},admin); await reset(beforeSuspension,400);
  await changeEmail('refused@gmail.com'); inbox.refuseMail();
  await call('POST',account+'/email/verification',{},admin,400);
  assert.equal(db.prepare("SELECT expires_at FROM company_email_links WHERE purpose='verify'").get().expires_at,0);
  assert.equal(inbox.messages.length,7);
  now+=61000;
  for(let i=0;i<6;i++) await request('unknown');
  await request('atelier',429);
});
