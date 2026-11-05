import dns from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';

const reserved = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) reserved.addSubnet(address, prefix, 'ipv4');
const globalIPv6 = new BlockList();
globalIPv6.addSubnet('2000::', 3, 'ipv6');
for (const [address, prefix] of [['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20]] as const)
  reserved.addSubnet(address, prefix, 'ipv6');

function publicAddress(address: string) {
  return isIP(address) === 4 ? !reserved.check(address, 'ipv4')
    : isIP(address) === 6 && globalIPv6.check(address, 'ipv6') && !reserved.check(address, 'ipv6');
}

const publicOnlyMessage = 'Cette source doit utiliser une adresse HTTPS publique.';
export function validatePublicEndpoint(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (url.protocol !== 'https:' || (isIP(host) ? !publicAddress(host) :
    !host.includes('.') || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')))
    throw new Error(publicOnlyMessage);
}

// Check the DNS results used by the TLS socket itself, including for Seller detail requests.
// A separate preflight DNS lookup followed by fetch() would allow DNS rebinding.
export async function readPublicJson(url: URL, headers: Record<string, string>, body?: object): Promise<unknown> {
  validatePublicEndpoint(url);
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, {
      method: body ? 'POST' : 'GET', headers, agent: false, signal: AbortSignal.timeout(15000),
      lookup(host, options, callback) {
        dns.lookup(host, { all: true }).then(addresses => {
          if (!addresses.length || addresses.some(entry => !publicAddress(entry.address))) {
            callback(new Error(publicOnlyMessage), '');
            return;
          }
          const first = addresses[0];
          if (options.all) callback(null, addresses);
          else callback(null, first.address, first.family);
        }, error => callback(error, ''));
      },
    }, async response => {
      try {
        const status = response.statusCode ?? 0;
        if (status < 200 || status >= 300) throw new Error('API commerciale : HTTP ' + status + '.');
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of response) {
          size += chunk.length;
          if (size > 12 * 1024 * 1024) throw new Error('Réponse commerciale trop volumineuse.');
          chunks.push(chunk);
        }
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) { response.destroy(); reject(error); }
    });
    req.on('error', reject);
    req.end(body && JSON.stringify(body));
  });
}
