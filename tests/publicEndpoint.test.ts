import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import { test } from 'node:test';
import { readPublicJson, validatePublicEndpoint } from '../server/sales/publicEndpoint';

test('destination publique : refuse les réseaux spéciaux, les IP encodées et le HTTP', () => {
  for (const url of ['http://service.example/bl', 'https://127.1/bl', 'https://0xa9fea9fe/bl',
    'https://192.168.5.1/bl', 'https://[::ffff:127.0.0.1]/bl', 'https://[fd00::1]/bl',
    'https://localhost./bl', 'https://service.localhost/bl']) {
    assert.throws(() => validatePublicEndpoint(new URL(url)), /HTTPS publique/);
  }
  assert.doesNotThrow(() => validatePublicEndpoint(new URL('https://ventes.example/bl')));
});

test('destination publique : bloque la connexion TLS si le nom approuvé résout aussi vers une IP privée', async t => {
  const resolve = t.mock.method(dns, 'lookup', async () => [
    { address:'93.184.216.34', family:4 }, { address:'127.0.0.1', family:4 },
  ]);
  await assert.rejects(readPublicJson(new URL('https://ventes.example/bl'), {}), /HTTPS publique/);
  assert.equal(resolve.mock.callCount(), 1);
});
