import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {request} from 'node:http';
import {mkdtempSync, rmSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import type {AddressInfo} from 'node:net';
import {spawn} from 'node:child_process';
import {createSalesApi} from '../server/sales/api';
import {CompanyDirectory} from '../server/sales/companies';
import {verifiedFixture} from './support/legacyAccounts';
import {openSmtpInbox} from './support/smtpInbox';

test('initialisation : accès local direct, validation, unicité et session administrateur', async t => {
  const previousEnvironment = {...process.env};
  for (const name of Object.keys(process.env)) if (name.startsWith('TMS_')) delete process.env[name];
  process.env.NODE_ENV = 'development';
  const inbox=await openSmtpInbox();t.after(inbox.close);
  const setupSecret='a'.repeat(64),email='globaladmin@gmail.com';
  Object.assign(process.env,{TMS_TEST_SETUP_SECRET:setupSecret,TMS_TEST_SMTP_HOST:'127.0.0.1',
    TMS_TEST_SMTP_PORT:String(inbox.port),TMS_TEST_SMTP_FROM:'tms@example.test'});
  const parent = resolve(tmpdir());
  const root = mkdtempSync(join(parent,'tms-admin-setup-'));
  const first = createSalesApi(root,undefined,'local-test');
  const second = createSalesApi(root,undefined,'local-test');
  const servers = [first.app.listen(0,'127.0.0.1'), second.app.listen(0,'127.0.0.1')];
  await Promise.all(servers.map(server=>once(server,'listening')));
  t.after(async()=>{
    await Promise.all(servers.map(server=>new Promise<void>(done=>server.close(()=>done()))));
    first.close(); second.close();
    if (dirname(resolve(root)) === parent && basename(root).startsWith('tms-admin-setup-')) rmSync(root,{recursive:true,force:true});
    for (const name of Object.keys(process.env)) if (name.startsWith('TMS_')) delete process.env[name];
    for (const [name,value] of Object.entries(previousEnvironment)) if (name.startsWith('TMS_')) process.env[name]=value;
    if (previousEnvironment.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment.NODE_ENV;
  });
  const bases = servers.map(server=>'http://127.0.0.1:'+(server.address() as AddressInfo).port);
  function send(method: string, path: string, body?: string, headers: Record<string,string> = {}, base = bases[0]) {
    return new Promise<{status:number;data:any}>((resolve,reject)=>{
      const req = request(base+path,{method,headers:{'content-type':'application/json',...headers}},res=>{
        let data = '';
        res.setEncoding('utf8');
        res.on('data',chunk=>{data+=chunk;});
        res.on('end',()=>resolve({status:res.statusCode!,data:JSON.parse(data)}));
      });
      req.on('error',reject);
      req.end(body);
    });
  }
  const state = await send('GET','/access');
  assert.equal(state.data.setup,true);
  assert.equal((await send('POST','/setup',JSON.stringify({email,password:'valid-but-unauthorized'}))).status,403);
  for (const headers of [
    {host:'public.example'},
    {origin:'https://public.example'},
    {forwarded:'for=203.0.113.8'},
    {'x-forwarded-for':'127.0.0.1'},
    {'x-forwarded-host':'public.example'},
    {'x-forwarded-proto':'https'},
    {'x-real-ip':'203.0.113.8'},
  ]) {
    assert.equal((await send('POST','/setup',JSON.stringify({password:'unauthorized-secret'}),headers)).status,403);
  }
  assert.equal((await send('GET','/access',undefined,{'x-forwarded-for':'203.0.113.8'})).data.setup,false);
  for (const password of [undefined, '', 'short', 'a'.repeat(201), 123, ['invalid-array']]) {
    assert.equal((await send('POST','/setup',JSON.stringify({password,email,setupSecret}),{},bases[1])).status,400);
  }
  const malformed = await send('POST','/setup','{"password":"private-fragment" trailing',{},bases[1]);
  assert.equal(malformed.status,400);
  assert.ok(!JSON.stringify(malformed.data).includes('private-fragment'));
  const passwords = ['initial-admin-first','initial-admin-second'];
  const results = await Promise.all(bases.map((base,i)=>
    send('POST','/setup',JSON.stringify({email,setupSecret,password:passwords[i]}),{},base)));
  assert.deepEqual(results.map(r=>r.status).sort(),[201,400]);
  const winner = results.findIndex(r=>r.status===201);
  for (const password of passwords) assert.ok(!JSON.stringify(results).includes(password));
  assert.equal(results[winner].data.token,undefined);
  assert.equal((await send('POST','/login',JSON.stringify({login:email,password:passwords[winner]}),{},bases[winner])).status,401);
  const link=await inbox.link(0);
  assert.equal((await send('POST','/company-email/verify',JSON.stringify({token:link.hash.split('/').pop()}),{},bases[winner])).status,200);
  assert.equal((await send('POST','/company-email/verify',JSON.stringify({token:link.hash.split('/').pop()}),{},bases[winner])).status,400);
  const token = (await send('POST','/login',JSON.stringify({login:email,password:passwords[winner]}),{},bases[winner])).data.token;
  const authorized = await send('GET','/access',undefined,{authorization:'Bearer '+token},bases[winner]);
  assert.deepEqual(authorized.data.account,{role:'admin',companyId:null});
  assert.equal(authorized.data.setup,false);
  const reader = new DatabaseSync(join(root,'.data','tenant-test.sqlite'),{readOnly:true});
  try {
    const accounts = reader.prepare('SELECT login,password,company FROM accounts').all();
    assert.equal(accounts.length,1);
    assert.equal(accounts[0].login,'admin');
    assert.equal(accounts[0].company,null);
    assert.match(String(accounts[0].password),/^[a-f0-9]{32}:[a-f0-9]{64}$/);
    for (const password of passwords) assert.ok(!String(accounts[0].password).includes(password));
  } finally {reader.close();}
  assert.equal((await send('POST','/setup',JSON.stringify({email,setupSecret,password:'replacement-password'}),{},bases[winner])).status,400);
  const login = await send('POST','/login',JSON.stringify({login:email,password:passwords[winner]}),{},bases[winner]);
  assert.equal(login.status,200);
});

test('initialisation concurrente depuis deux processus : un seul compte et aucun écrasement', {timeout:15000}, async t => {
  const parent = resolve(tmpdir());
  const root = mkdtempSync(join(parent,'tms-admin-race-'));
  const file = join(root,'accounts.sqlite');
  const directory = new CompanyDirectory(file);
  directory.close();
  t.after(()=>{
    if (dirname(resolve(root)) === parent && basename(root).startsWith('tms-admin-race-')) rmSync(root,{recursive:true,force:true});
  });
  const startAt = Date.now() + 1200;
  const source = `
    import {CompanyDirectory} from './server/sales/companies.ts';
    const [file, number, startAt] = process.argv.slice(2);
    const directory = new CompanyDirectory(file);
    await new Promise(done=>setTimeout(done,Math.max(0,Number(startAt)-Date.now())));
    try { directory.setup('worker-password-'+number); process.stdout.write('created'); }
    catch (error) {
      if (error.message === 'Le compte administrateur existe déjà.') process.stdout.write('refused');
      else { process.stdout.write('unexpected'); process.exitCode=1; }
    } finally { directory.close(); }
  `;
  function initialize(number: number) {
    return new Promise<string>((resolve,reject)=>{
      const child = spawn(process.execPath,['--no-warnings','--import','tsx','--input-type=module','-',file,String(number),String(startAt)],
        {stdio:['pipe','pipe','pipe'],windowsHide:true,signal:t.signal});
      let output = '';
      child.stdout.setEncoding('utf8');
      child.stdout.on('data',chunk=>{output+=chunk;});
      child.stderr.resume();
      child.on('error',reject);
      child.on('close',code=>code===0 ? resolve(output) : reject(new Error('Échec du processus de test d’initialisation.')));
      child.stdin.end(source);
    });
  }
  const results = await Promise.all([initialize(0),initialize(1)]);
  assert.deepEqual([...results].sort(),['created','refused']);
  const check = new CompanyDirectory(file);
  try {
    const winner = results.findIndex(result=>result==='created');
    assert.equal(check.login('admin','worker-password-'+winner),null);
    verifiedFixture(check,'admin');
    assert.ok(check.login('admin@fixture.test','worker-password-'+winner));
    assert.equal(check.login('admin@fixture.test','worker-password-'+(1-winner)),null);
  } finally {check.close();}
});
