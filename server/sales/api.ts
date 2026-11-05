import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { CompanyDirectory, validNewPassword, type Account, type Company } from './companies';
import { getCommercialSource, validateSourceUrl } from './connectors';
import { SalesStore } from './store';
import { SalesSyncService, SourcePolicyError } from './service';
import { DEFAULT_SALES_API } from '../../src/utils/salesSynchronization';
import type { CommercialSource, SalesApiSettings } from '../../src/types/sales';

export function createSalesApi(root: string, legacyCompany = process.env.TMS_COMPANY_ID || 'electroplanet') {
  const file = path.join(root, '.data', 'sales-live.sqlite');
  const store = new SalesStore(file);
  const directory = new CompanyDirectory(file);
  const legacy = getCommercialSource(legacyCompany);
  for (const id of store.companyIds()) directory.registerExisting({ id, name: store.read(id).settings.companyName });
  if (legacy.url || process.env.TMS_COMPANY_ID) directory.registerExisting({ id: legacyCompany, name: legacy.companyName });
  // Tokens are selected by company AND exact endpoint. Editing an address must never forward an old token.
  const credentials: Record<string, { url: string; token?: string; connectorId?: CommercialSource['connectorId']; allowPrivateNetwork?: boolean }> =
    JSON.parse(process.env.TMS_COMPANY_API_CREDENTIALS || '{}');
  const services = new Map<string, SalesSyncService>();
  function open(company: Company) {
    if (!store.companyIds().includes(company.id)) {
      const source = company.id === legacyCompany && legacy.url ? legacy : { connectorId: 'standard' as const, url: '', sourceName: 'API standard' };
      store.transaction(company.id, state => ({ ...state, settings: { ...DEFAULT_SALES_API, ...source, companyName: company.name } }));
    }
    const entry = Object.hasOwn(credentials, company.id) ? credentials[company.id] : undefined;
    const existing = store.read(company.id);
    const original = existing.approvedSources === undefined ? existing.settings
      : existing.approvedSources.find(source => source.legacyNetwork && source.url === entry?.url);
    const entryKind = entry?.connectorId ?? (original && original.url === entry?.url ? original.connectorId :
      entry?.url?.endsWith('/seller/searchDossierVente') ? 'seller' : 'standard');
    const credentialMatches = (source: CommercialSource) => entry?.url === source.url && source.connectorId === entryKind;
    const legacyMatches = (source: CommercialSource) => company.id === legacyCompany && source.url === legacy.url && source.connectorId === legacy.connectorId;
    const service = new SalesSyncService(store, company.id, {
      privateEndpoint: source => (entry?.allowPrivateNetwork === true && credentialMatches(source)) || legacyMatches(source),
      credential(settings) {
        if (credentialMatches(settings)) return entry.token;
        if (legacyMatches(settings)) return process.env.TMS_SALES_API_TOKEN;
      },
    });
    services.set(company.id, service);
    return service;
  }
  for (const company of directory.companies()) open(company);

  const app = express();
  app.use(express.json({ limit: '12mb' }));
  const auth = (req: express.Request) => req.get('authorization')?.replace(/^Bearer /, '') || '';
  const local = (ip = '') => ['::1','::ffff:127.0.0.1','127.0.0.1'].includes(ip);
  app.use((req,res,next) => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'GET' && req.get('origin') && new URL(req.get('origin')!).host !== req.get('host'))
      return res.status(403).json({ error: 'Origine refusée.' });
    next();
  });
  app.get('/access', (req,res) => {
    const account = directory.account(auth(req));
    res.json({ setup: directory.setupNeeded(), account, companies: account ? directory.companies(account) : [] });
  });
  app.post('/setup', (req,res) => {
    if (!local(req.socket.remoteAddress) || !localHost(req.hostname)) return res.status(403).json({ error: 'Créez le premier administrateur sur le serveur local.' });
    directory.setup(req.body.password);
    res.status(201).json({ token: directory.login('admin', req.body.password) });
  });
  app.post('/login', limitAttempts(20), (req,res) => {
    try {
      const token = directory.login(req.body?.login, req.body?.password);
      if (!token) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
      res.json({ token });
    } catch {
      res.status(500).json({ error: 'Une erreur technique empêche la connexion. Réessayez plus tard.' });
    }
  });
  app.post('/password-recovery', limitAttempts(10), (req,res) => {
    const { login, code, password } = req.body ?? {};
    if (!validNewPassword(password)) return res.status(400).json({ error: 'Choisissez un mot de passe de 10 à 200 caractères.' });
    try {
      if (!directory.redeemRecoveryCode(login, code, password)) {
        return res.status(400).json({ error: 'Identifiant ou code invalide, expiré ou déjà utilisé.' });
      }
      res.json({});
    } catch {
      res.status(500).json({ error: 'Une erreur technique empêche la réinitialisation. Réessayez plus tard.' });
    }
  });
  app.use((req, res, next) => {
    const account = directory.account(auth(req));
    if (!account) return res.status(401).json({ error: 'Connectez-vous pour accéder à votre espace.' });
    res.locals.account = account; next();
  });
  app.post('/logout', (req,res) => { directory.logout(auth(req)); res.json({}); });
  const admin: express.RequestHandler = (_req,res,next) => {
    if (res.locals.account.role !== 'admin') return void res.status(403).json({ error: 'Action réservée à l’administrateur.' });
    next();
  };
  app.get('/admin/overview', admin, (req,res) => res.json(directory.adminOverview(auth(req))));
  app.put('/admin/password', admin, limitAttempts(10), (req,res) => {
    directory.changeAdminPassword(req.body?.currentPassword, req.body?.password);
    res.json({});
  });
  app.post('/companies', admin, (req,res) => {
    const company = directory.create(req.body.name, req.body.login, req.body.password);
    open(company); res.status(201).json(company);
  });
  const space = express.Router({ mergeParams: true });
  app.use('/companies/:id', (req,res,next) => {
    const account: Account = res.locals.account;
    const company = directory.companies(account).find(c => c.id === req.params.id);
    if (!company) return res.status(403).json({ error: 'Accès à cet espace refusé.' });
    res.locals.company = company; res.locals.service = services.get(company.id); next();
  }, space);
  function service(res: express.Response): SalesSyncService { return res.locals.service; }
  space.patch('/', admin, (req,res) => res.json(directory.rename(res.locals.company.id, req.body?.name)));
  space.put('/password', admin, (req,res) => { directory.setPassword(res.locals.company.id, req.body.password); res.json({}); });
  space.get('/state', (_req,res) => res.json(service(res).snapshot()));
  function requestedSource(body: Partial<CommercialSource>): CommercialSource {
    if (!body || !['standard','seller'].includes(body.connectorId) || typeof body.url !== 'string')
      throw new Error('Vérifiez le connecteur et l’adresse de la source.');
    return { connectorId: body.connectorId, url: body.url.trim() };
  }
  space.post('/sources', admin, (req,res) => res.json(service(res).authorize(requestedSource(req.body))));
  space.delete('/sources', admin, (req,res) => res.json(service(res).revoke(requestedSource(req.body))));
  space.put('/settings', (req,res) => {
    const { connectorId, url } = requestedSource(req.body);
    const { sourceName, eligibleStatuses, automatic, intervalSeconds } = req.body;
    const next: SalesApiSettings = { sourceName: connectorId === 'seller' ? 'Seller' : sourceName,
      connectorId, url, eligibleStatuses, automatic, intervalSeconds, companyName: res.locals.company.name };
    validateSourceUrl(next.connectorId, next.url);
    res.json(service(res).updateSettings(next, res.locals.account.role === 'admin'));
  });
  space.post('/sync', async (_req,res,next) => { try { res.json(await service(res).synchronize()); } catch (err) { next(err); } });
  space.post('/test', async (_req,res,next) => { try { res.json(await service(res).testConnection()); } catch (err) { next(err); } });
  space.post('/generate', (req,res) => {
    if (!Array.isArray(req.body.requests) || req.body.requests.length > 100) throw new Error('Sélection invalide.');
    res.json(service(res).generate(req.body.requests));
  });
  space.get('/transport', (_req,res) => res.json(directory.transport(res.locals.company.id)));
  space.put('/transport', (req,res) => {
    const { revision, data } = req.body;
    if (!Number.isSafeInteger(revision) || revision < 0 || !data || !['deliveries','tours','drivers','vehicles','incidents','addresses','zones'].every(k => Array.isArray(data[k])) || typeof data.workflowSettings !== 'object' || !data.workflowSettings)
      return res.status(400).json({ error: 'Données de transport invalides.' });
    if (!directory.saveTransport(res.locals.company.id, revision, data)) return res.status(409).json({ error: 'Cet espace a changé dans une autre session. Rechargez la page avant de continuer.' });
    res.json({ revision: revision + 1 });
  });
  app.use((_req,res) => res.status(404).json({ error: 'Opération inconnue.' }));
  app.use(((error,req,res,_next) => {
    if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large')
      return res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'Le contenu de la demande est invalide.' });
    if (error instanceof SourcePolicyError) return res.status(error.status).json({ error: error.message });
    if (['/login', '/password-recovery'].includes(req.path.toLowerCase().replace(/\/$/, ''))) {
      // A body-parser error can contain part of the submitted credentials.
      const status = error.status === 413 ? 413 : 400;
      return res.status(status).json({ error: 'La demande d’authentification est invalide.' });
    }
    return res.status(400).json({ error: error instanceof Error && !('code' in error) ? error.message : 'Opération impossible.' });
  }) as express.ErrorRequestHandler);
  return { app, close: () => { for (const s of services.values()) s.close(); directory.close(); store.close(); } };
}
function localHost(host: string) { return ['localhost','127.0.0.1','[::1]'].includes(host); }

function limitAttempts(limit: number): express.RequestHandler {
  const attempts = new Map<string, { count: number; until: number }>();
  return (req, res, next) => {
    const key = req.socket.remoteAddress || '';
    let attempt = attempts.get(key);
    if (!attempt || Date.now() >= attempt.until) {
      attempt = { count: 0, until: Date.now() + 60_000 };
      attempts.set(key, attempt);
    }
    if (attempt.count >= limit) {
      res.setHeader('Retry-After', String(Math.ceil((attempt.until - Date.now()) / 1000)));
      res.status(429).json({ error: 'Trop de tentatives. Réessayez dans une minute.' });
      return;
    }
    attempt.count++;
    res.once('finish', () => {
      if (res.statusCode < 400 && attempts.get(key) === attempt) attempts.delete(key);
    });
    next();
  };
}
