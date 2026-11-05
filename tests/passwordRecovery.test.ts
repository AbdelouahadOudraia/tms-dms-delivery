import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { createSalesApi } from '../server/sales/api';
import { CompanyDirectory } from '../server/sales/companies';

function fixture(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'tms-recovery-'));
  const service = createSalesApi(root);
  const file = join(root, '.data', 'sales-live.sqlite');
  const directory = new CompanyDirectory(file);
  directory.setup('initial-admin-password');
  directory.create('Entreprise A', 'alfa', 'initial-alfa-password');
  directory.create('Entreprise B', 'beta', 'initial-beta-password');
  t.after(() => {
    directory.close();
    service.close();
    if (dirname(resolve(root)) === resolve(tmpdir()) && basename(root).startsWith('tms-recovery-')) {
      rmSync(root, { recursive: true, force: true });
    }
  });
  return { root, file, service, directory };
}

test('récupération : empreinte persistante, échéance exacte de 15 minutes et remplacement du code', t => {
  const { file, directory } = fixture(t);
  let clock = Date.now();
  t.mock.method(Date, 'now', () => clock);
  const code = directory.issueRecoveryCode('admin');
  const reader = new DatabaseSync(file, { readOnly: true });
  try {
    const ticket = reader.prepare('SELECT digest,expires_at FROM password_recovery WHERE login=?').get('admin')!;
    assert.ok(ticket.digest === createHash('sha256').update(code).digest('hex'), 'Seule l’empreinte doit être conservée.');
    assert.equal(ticket.expires_at, clock + 15 * 60_000);
    const second = new CompanyDirectory(file);
    try {
      clock += 15 * 60_000;
      assert.equal(second.redeemRecoveryCode('admin', code, 'replacement-password'), false);
      const current = directory.issueRecoveryCode('admin');
      const replacement = directory.issueRecoveryCode('admin');
      assert.equal(second.redeemRecoveryCode('admin', current, 'replacement-password'), false);
      clock += 15 * 60_000 - 1;
      assert.equal(second.redeemRecoveryCode('admin', replacement, 'replacement-password'), true);
      assert.equal(directory.redeemRecoveryCode('admin', replacement, 'other-new-password'), false);
      const account = reader.prepare('SELECT password FROM accounts WHERE login=?').get('admin')!;
      assert.ok(/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(String(account.password)), 'Le nouveau mot de passe doit être haché.');
    } finally { second.close(); }
  } finally { reader.close(); }
});

test('récupération : code lié au compte, sessions révoquées et données des autres entreprises préservées', t => {
  const { file, directory } = fixture(t);
  const second = new CompanyDirectory(file);
  try {
    const adminSession = directory.login('admin', 'initial-admin-password')!;
    const alfaSession = directory.login('alfa', 'initial-alfa-password')!;
    const betaSession = directory.login('beta', 'initial-beta-password')!;
    directory.saveTransport('alfa', 0, { marker: 'transport-alfa' });
    directory.saveTransport('beta', 0, { marker: 'transport-beta' });
    const companyCode = second.issueRecoveryCode('alfa');
    assert.equal(directory.redeemRecoveryCode('admin', companyCode, 'wrong-target-password'), false);
    assert.equal(directory.redeemRecoveryCode('beta', companyCode, 'wrong-target-password'), false);
    assert.equal(directory.redeemRecoveryCode('alfa', companyCode, 'new-alfa-password'), true);
    assert.equal(directory.account(alfaSession), null);
    assert.equal(directory.account(betaSession)?.companyId, 'beta');
    const adminCode = second.issueRecoveryCode('admin');
    assert.equal(second.redeemRecoveryCode('admin', adminCode, 'new-admin-password'), true);
    assert.equal(directory.account(adminSession), null);
    assert.ok(directory.login('admin', 'new-admin-password'));
    assert.equal(directory.login('admin', 'initial-admin-password'), null);
    assert.ok(directory.login('alfa', 'new-alfa-password'));
    assert.deepEqual(directory.transport('alfa').data, { marker: 'transport-alfa' });
    assert.deepEqual(directory.transport('beta').data, { marker: 'transport-beta' });
    assert.equal(directory.companies().length, 2);
    const stale = second.issueRecoveryCode('alfa');
    directory.setPassword('alfa', 'admin-set-alfa-password');
    assert.equal(second.redeemRecoveryCode('alfa', stale, 'forbidden-password'), false);
    assert.throws(() => directory.issueRecoveryCode('missing-account'), /introuvable/);
  } finally { second.close(); }
});

test('récupération HTTP : usage unique concurrent, contrôle d’accès et réponses sans code', async t => {
  const { service, directory } = fixture(t);
  const logLines: string[] = [];
  for (const method of ['log', 'warn', 'error'] as const) {
    t.mock.method(console, method, (...args: unknown[]) => { logLines.push(args.map(String).join(' ')); });
  }
  const server = service.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise<void>(done => server.close(() => done())));
  const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
  const code = directory.issueRecoveryCode('alfa');
  async function call(path: string, body: object, token = '') {
    const response = await fetch(base + path, { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(body) });
    const content = await response.text();
    assert.ok(!content.includes(code), 'Le code ne doit jamais figurer dans une réponse HTTP.');
    return { status: response.status, content };
  }
  const request = { login: 'alfa', code, password: 'recovered-alfa-password' };
  assert.equal((await call('/password-recovery', { ...request, login: 'admin' })).status, 400);
  const short = await call('/password-recovery', { ...request, password: 'short' });
  assert.equal(short.status, 400);
  const parallel = await Promise.all([call('/password-recovery', request), call('/password-recovery', request)]);
  assert.deepEqual(parallel.map(r => r.status).sort(), [200, 400]);
  const login = await call('/login', { login: 'alfa', password: request.password });
  assert.equal(login.status, 200);
  const token = JSON.parse(login.content).token;
  const forbidden = await fetch(base + '/companies/beta/state', { headers: { Authorization: 'Bearer ' + token } });
  assert.equal(forbidden.status, 403);
  for (const path of ['/password-recovery/request', '/password-recovery/issue']) {
    assert.equal((await call(path, { login: 'admin' })).status, 401);
    assert.equal((await call(path, { login: 'admin' }, token)).status, 404);
  }
  const malformed = await fetch(base + '/password-recovery', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"code":"' + code + '"',
  });
  assert.equal(malformed.status, 400);
  assert.ok(!(await malformed.text()).includes(code), 'Les erreurs JSON doivent masquer les données soumises.');
  const access = await fetch(base + '/access');
  assert.ok(!(await access.text()).includes(code), 'L’état public ne doit pas exposer le code.');
  assert.ok(logLines.every(line => !line.includes(code)), 'Les journaux applicatifs ne doivent pas contenir le code.');
});

test('récupération HTTP : dix tentatives par minute et compteur distinct de la connexion', async t => {
  const { service, directory } = fixture(t);
  let clock = Date.now();
  t.mock.method(Date, 'now', () => clock);
  const server = service.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise<void>(done => server.close(() => done())));
  const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
  const code = directory.issueRecoveryCode('admin');
  const post = (path: string, body: object) => fetch(base + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  for (let attempt = 0; attempt < 10; attempt++) {
    const response = await post('/password-recovery', { login: 'admin', code: 'x'.repeat(43), password: 'new-admin-password' });
    assert.equal(response.status, 400);
    await response.text();
  }
  const blocked = await post('/password-recovery', { login: 'admin', code, password: 'new-admin-password' });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  await blocked.text();
  const login = await post('/login', { login: 'admin', password: 'initial-admin-password' });
  assert.equal(login.status, 200);
  await login.text();
  clock += 60_000;
  const reset = await post('/password-recovery', { login: 'admin', code, password: 'new-admin-password' });
  assert.equal(reset.status, 200);
  await reset.text();
});

test('récupération locale : la commande refuse une exécution redirigée et ne délivre aucun code', t => {
  const { file } = fixture(t);
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'server/recovery.ts', 'admin'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /terminal privé et interactif/);
  const reader = new DatabaseSync(file, { readOnly: true });
  try { assert.equal(reader.prepare('SELECT COUNT(*) AS n FROM password_recovery').get()!.n, 0); }
  finally { reader.close(); }
});
