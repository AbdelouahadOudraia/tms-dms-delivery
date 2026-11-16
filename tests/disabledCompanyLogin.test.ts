import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import type {AddressInfo} from 'node:net';
import nodemailer from 'nodemailer';
import {createSalesApi} from '../server/sales/api';
import {CompanyDirectory,CompanyDisabledError} from '../server/sales/companies';

test('connexion démo : message de désactivation après mot de passe valide, sans session ni accès API',async t=>{
  const parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-disabled-login-')),previous=process.env.NODE_ENV;
  process.env.NODE_ENV='development';
  const smtp=t.mock.method(nodemailer,'createTransport',()=>{throw new Error('Aucun SMTP en démo');});
  const api=createSalesApi(root,undefined,'demo'),file=join(root,'.data','demo','demo.sqlite');
  const independent=new CompanyDirectory(file,true,true);
  const http=api.app.listen(0,'127.0.0.1');await once(http,'listening');
  t.after(async()=>{
    await new Promise<void>(done=>http.close(()=>done()));api.close();independent.close();
    if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;
    assert.equal(existsSync(join(root,'.data','sales-live.sqlite')),false);
    assert.equal(existsSync(join(root,'.data','tenant-test.sqlite')),false);
    if(dirname(resolve(root))===parent && basename(root).startsWith('tms-disabled-login-'))rmSync(root,{recursive:true,force:true});
  });
  const base='http://127.0.0.1:'+(http.address() as AddressInfo).port;
  async function call(method:string,path:string,body?:object,token='',status=200) {
    const response=await fetch(base+path,{method,headers:{'content-type':'application/json',authorization:'Bearer '+token},body:body&&JSON.stringify(body)});
    const data=await response.json();assert.equal(response.status,status,method+' '+path+' '+JSON.stringify(data));
    assert.equal(response.headers.get('set-cookie'),null);
    return data;
  }
  const login=(email:string,password:string,status=200)=>call('POST','/login',{login:email,password},'',status);
  const latestLink=async(email:string)=>{
    const messages=await call('GET','/demo/messages');
    return messages.find(message=>message.recipient===email).link.split('/').pop();
  };
  await call('POST','/setup',{email:'admin@demo.test',password:'demo-admin-password'},'',201);
  await call('POST','/company-email/verify',{token:await latestLink('admin@demo.test')});
  const admin=(await login('admin@demo.test','demo-admin-password')).token;
  for(const [name,email]of [['Electroplanet','company@demo.test'],['Entreprise témoin','witness@demo.test']]) {
    await call('POST','/companies',{name,email},admin,201);
    await call('POST','/company-email/activate',{token:await latestLink(email),password:'demo-company-password'});
  }
  independent.saveTransport('electroplanet',0,{marker:'electroplanet-data-kept'});
  independent.saveTransport('entreprise-temoin',0,{marker:'witness-data-kept'});
  const company=(await login('company@demo.test','demo-company-password')).token;
  const secondSession=(await login('company@demo.test','demo-company-password')).token;
  const witness=(await login('witness@demo.test','demo-company-password')).token;
  const otherProcessSession=independent.login('company@demo.test','demo-company-password');
  const generic={error:'Adresse e-mail ou mot de passe incorrect.'};
  assert.deepEqual(await login('company@demo.test','incorrect-password',401),generic);
  await call('PUT','/companies/electroplanet/status',{status:'disabled'},admin);
  const disabled=await login('company@demo.test','demo-company-password',403);
  assert.deepEqual(disabled,{
    error:"Votre espace entreprise est temporairement désactivé. Veuillez contacter l'administrateur de la plateforme.",
    code:'COMPANY_DISABLED',
  });
  assert.equal('token' in disabled,false);
  assert.deepEqual(await login('company@demo.test','incorrect-password',401),generic);
  assert.deepEqual(await login('absent@demo.test','demo-company-password',401),generic);
  assert.deepEqual(await login('electroplanet','demo-company-password',401),generic);
  assert.deepEqual(await login('admin','demo-admin-password',401),generic);
  assert.equal((await call('GET','/access')).account,null);
  for(const token of [company,secondSession]) {
    const access=await call('GET','/access',undefined,token);
    assert.equal(access.account,null);assert.deepEqual(access.companies,[]);
    for(const path of ['/companies/electroplanet/state','/companies/electroplanet/transport','/admin/overview'])
      await call('GET',path,undefined,token,401);
    await call('POST','/companies/electroplanet/sync',{},token,401);
  }
  assert.equal(independent.account(otherProcessSession),null);
  // Inspect the real session store: neither a valid disabled password nor a wrong one issues a session.
  const sessions=Reflect.get(independent,'sessions') as Map<string,unknown>,count=sessions.size;
  assert.throws(()=>independent.login('company@demo.test','demo-company-password'),CompanyDisabledError);
  assert.equal(independent.login('company@demo.test','incorrect-password'),null);
  assert.equal(sessions.size,count);
  await call('GET','/admin/overview',undefined,admin);
  assert.deepEqual((await call('GET','/companies/entreprise-temoin/transport',undefined,witness)).data,{marker:'witness-data-kept'});
  await call('PUT','/companies/electroplanet/status',{status:'active'},admin);
  for(const token of [company,secondSession])await call('GET','/companies/electroplanet/transport',undefined,token,401);
  assert.equal(independent.account(otherProcessSession),null);
  const restored=(await login('company@demo.test','demo-company-password')).token;
  assert.equal((await call('GET','/access',undefined,restored)).account.companyId,'electroplanet');
  assert.deepEqual((await call('GET','/companies/electroplanet/transport',undefined,restored)).data,{marker:'electroplanet-data-kept'});
  await call('GET','/companies/entreprise-temoin/transport',undefined,restored,403);
  assert.deepEqual(await login('company@demo.test','incorrect-password',401),generic);
  assert.ok((await login('admin@demo.test','demo-admin-password')).token);
  assert.equal((await call('GET','/demo/messages')).length,3);
  assert.equal(independent.companies().length,2);
  assert.equal(smtp.mock.callCount(),0);
});
