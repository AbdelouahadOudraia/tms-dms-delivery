import type { SalesApiSettings, SalesDossier, SalesLine } from '../../src/types/sales';
import { readPublicJson } from './publicEndpoint';

export interface SalesConnector {
  fetchDossiers(settings: SalesApiSettings, cursor: string | null, known?: SalesDossier[], token?: string): Promise<{ dossiers: SalesDossier[]; cursor: string | null }>;
  test(settings: SalesApiSettings, token?: string): Promise<void>;
}

type Row = Record<string, unknown>;
const shapeError = () => new Error('Le format des dossiers reçus ne correspond pas au connecteur configuré.');
function row(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw shapeError();
  return value as Row;
}
const str = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
function required(value: unknown) {
  const result = str(value);
  if (!result) throw shapeError();
  return result;
}
function number(value: unknown) {
  const n = Number(required(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) throw shapeError();
  return n;
}
function lines(value: unknown, parse: (r: Row) => SalesLine) {
  if (!Array.isArray(value)) throw shapeError();
  const items = value.map(item => parse(row(item)));
  if (new Set(items.map(item => item.id)).size !== items.length ||
      items.some(item => !Number.isSafeInteger(item.quantity) || item.quantity < 1)) throw shapeError();
  return items;
}

export function getCommercialSource(companyId: string) {
  const kind = process.env.TMS_SALES_CONNECTOR || 'seller';
  if (kind !== 'seller' && kind !== 'standard') throw new Error('TMS_SALES_CONNECTOR doit valoir seller ou standard.');
  const url = process.env.TMS_SALES_API_URL?.trim() || '';
  validateSourceUrl(kind, url);
  return { connectorId: kind as SalesApiSettings['connectorId'], url,
    sourceName: process.env.TMS_SALES_SOURCE_NAME || (kind === 'seller' ? 'Seller' : 'Système commercial'),
    companyName: process.env.TMS_COMPANY_NAME || (companyId === 'electroplanet' ? 'Electroplanet' : companyId) };
}

export function validateSourceUrl(kind: string, url: string) {
  if (url) {
    const u = new URL(url);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
    if ((u.protocol !== 'https:' && !(local && u.protocol === 'http:')) || u.username || u.password || u.search || u.hash)
      throw new Error('Configurez une URL HTTPS sans identifiants ni paramètres.');
    if (kind === 'seller' && !u.pathname.endsWith('/seller/searchDossierVente'))
      throw new Error('L’URL Seller doit se terminer par /seller/searchDossierVente.');
  }
}

async function request(url: URL, token?: string, body?: object, publicOnly = false): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body) headers['Content-Type'] = 'application/json';
  try {
    if (publicOnly) return await readPublicJson(url, headers, body);
    const res = await fetch(url, { headers, method: body ? 'POST' : 'GET', body: body && JSON.stringify(body),
      redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('API commerciale : HTTP ' + res.status +
      ([401, 403].includes(res.status) ? ' (accès refusé).' : '.'));
    return await res.json();
  } catch (err) {
    if (err instanceof SyntaxError) throw shapeError();
    if (err instanceof Error && err.message.startsWith('API commerciale')) throw err;
    throw new Error('API commerciale inaccessible. Vérifiez son adresse et sa disponibilité.');
  }
}
function endpoint(settings: SalesApiSettings) {
  if (!settings.url) throw new Error('L’adresse de l’API commerciale doit être configurée sur le serveur.');
  return new URL(settings.url);
}
const statusNames: Record<string, string> = { REGLER: 'Payé', ANNULER: 'Annulé', CAISSE: 'En caisse',
  DRAFT: 'Brouillon', PENDING: 'En attente', EXPIRER: 'Expiré', VALIDER: 'Validé' };
const status = (r: Row) => statusNames[str(r.statutCd)] || required(r.statutLb || r.statutCd);
async function sellerPage(settings: SalesApiSettings, page: number, size: number, token: string | undefined, publicOnly: boolean) {
  const data = row(await request(endpoint(settings), token, { Page: page, PageSize: size, Filters: { IsArchive: false },
    Sorts: { ColumnSort: 'Id', isDescending: false } }, publicOnly));
  const total = number(data.totalCount);
  if (!Array.isArray(data.liste) || !Number.isSafeInteger(total)) throw shapeError();
  return { rows: data.liste.map(row), total };
}

function sellerDossier(r: Row, settings: SalesApiSettings): SalesDossier {
  if (!Array.isArray(r.dossierVenteDetail)) throw shapeError();
  const delivery = r.dossierVenteDetail.map(row).filter(line => Number(line.modelivraisonId) === 3 ||
    (!line.modelivraisonId && /livr/i.test(str(line.modelivraisonLb))));
  const items = lines(delivery, line => ({ id: required(line.id), ref: required(line.artCode), name: required(line.artLibelle),
    quantity: number(line.qte), unitValue: number(line.prixTtc),
    unitWeightKg: line.unitWeightKg == null ? null : number(line.unitWeightKg),
    category: line.category === 'Lourd' || line.category === 'Fragile' ? line.category : 'Standard' }));
  const only = (key: string) => {
    const values = new Set(delivery.map(line => str(line[key])));
    return values.size === 1 ? [...values][0] : '';
  };
  return { systemId: 'seller', systemName: settings.sourceName, id: required(r.id), reference: str(r.dvRef) || required(r.id),
    customerName: str(r.clientFullName), phone: str(r.tel), commercialStatus: status(r),
    collectionMode: delivery.length ? 'À livrer' : 'À emporter', items,
    address: only('adresseLb'), date: only('dateDetail').slice(0, 10).replace(/^0001-01-01$/, ''),
    city: only('city'), district: only('district'), warehouseId: only('warehouseId'),
    startTime: only('startTime'), endTime: only('endTime'), latitude: only('latitude'), longitude: only('longitude'),
    instructions: str(r.commentaire) };
}

async function sellerBatch(settings: SalesApiSettings, known: SalesDossier[], token: string | undefined, publicOnly: boolean) {
    const existing = new Map(known.filter(s => s.systemId === 'seller').map(s => [s.id, s]));
    const dossiers: SalesDossier[] = [];
    const seen = new Set<string>();
    let page = 1, count = 0;
    do {
      const { rows, total } = await sellerPage(settings, page++, 100, token, publicOnly);
      for (const summary of rows) {
        const id = required(summary.id);
        if (seen.has(id)) throw new Error('La liste Seller a changé pendant la lecture. Relancez la synchronisation.');
        seen.add(id);
        const commercialStatus = status(summary);
        if (!settings.eligibleStatuses.includes(commercialStatus)) {
          const previous = existing.get(id);
          if (previous) dossiers.push({ ...previous, commercialStatus });
          continue;
        }
        const url = new URL('vente', endpoint(settings));
        url.searchParams.set('search', id);
        const detail = row(await request(url, token, undefined, publicOnly));
        if (str(detail.id) !== id) throw shapeError();
        dossiers.push(sellerDossier(detail, settings));
      }
      count += rows.length;
      if (count >= total) break;
      if (!rows.length) throw new Error('La pagination Seller est incomplète.');
    } while (true);
    return { dossiers, cursor: null };
}

async function standardBatch(settings: SalesApiSettings, cursor: string | null, token: string | undefined, publicOnly: boolean) {
  const url = endpoint(settings);
  if (cursor) url.searchParams.set('cursor', cursor);
  const payload = await request(url, token, undefined, publicOnly);
  const batch = Array.isArray(payload) ? { dossiers: payload, cursor: null } : row(payload);
  if (!Array.isArray(batch.dossiers) || (batch.cursor != null && typeof batch.cursor !== 'string')) throw shapeError();
  const dossiers = batch.dossiers.map((entry): SalesDossier => {
    const r = row(entry);
    if (r.collectionMode !== 'À livrer' && r.collectionMode !== 'À emporter' && r.collectionMode !== 'À récupérer') throw shapeError();
    return { systemId: 'standard', systemName: settings.sourceName, id: required(r.id), reference: required(r.reference),
      customerName: required(r.customerName), commercialStatus: required(r.commercialStatus), collectionMode: r.collectionMode,
      phone: str(r.phone), address: str(r.address), city: str(r.city), district: str(r.district), date: str(r.date),
      startTime: str(r.startTime), endTime: str(r.endTime), warehouseId: str(r.warehouseId), latitude: str(r.latitude),
      longitude: str(r.longitude), instructions: str(r.instructions),
      ...(r.sourceVersion == null ? {} : { sourceVersion: number(r.sourceVersion) }),
      items: lines(r.items, line => ({ id: required(line.id), ref: required(line.ref), name: required(line.name),
        quantity: number(line.quantity), unitValue: number(line.unitValue),
        unitWeightKg: line.unitWeightKg == null ? null : number(line.unitWeightKg),
        category: line.category === 'Lourd' || line.category === 'Fragile' ? line.category : 'Standard' })) };
  });
  return { dossiers, cursor: batch.cursor as string ?? null };
}
function connectors(publicOnly: boolean): Record<SalesApiSettings['connectorId'], SalesConnector> {
  return {
    seller: {
      fetchDossiers: (settings, _cursor, known = [], token) => sellerBatch(settings, known, token, publicOnly),
      async test(settings, token) { await sellerPage(settings, 1, 1, token, publicOnly); },
    },
    standard: {
      fetchDossiers: (settings, cursor, _known, token) => standardBatch(settings, cursor, token, publicOnly),
      async test(settings, token) { await standardBatch(settings, null, token, publicOnly); },
    },
  };
}
export const SALES_CONNECTORS = connectors(false);
export const PUBLIC_SALES_CONNECTORS = connectors(true);
