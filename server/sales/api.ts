import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import { CompanyDirectory, CompanyDisabledError, AccountSuspendedError, validNewPassword, type Account, type RegisteredCompany } from './companies';
import {AccountAccessError} from './accountSecurity';
import {loginErrorMessages} from '../../src/types/authentication';
import { getCommercialSource, validateSourceUrl } from './connectors';
import { SalesStore } from './store';
import { SalesSyncService, SourcePolicyError } from './service';
import { DEFAULT_SALES_API } from '../../src/utils/salesSynchronization';
import type { CommercialSource, SalesApiSettings } from '../../src/types/sales';
import { localTestDatabase } from './testDatabase';
import { configureMail, mailUnavailable } from './mail';
import {emailKey,type EmailPurpose} from './companyEmail';
import {requireAuthMigrationApproval} from './authMigration';
import {requireCompanyNameMigrationApproval} from './companySchema';
import {demoDatabase} from './demoDatabase';
import {DemoMailbox} from './demoMailbox';
import {limitLoginAttempts} from './loginAttempts';

export function createSalesApi(root: string, legacyCompany = process.env.TMS_COMPANY_ID || 'electroplanet', mode: 'standard' | 'local-test' | 'demo' = 'standard') {
  const demoMode=mode==='demo';
  const limiterResets:(()=>void)[]=[];
  const rateLimit=(limit:number,countSuccessful=false)=>limitAttempts(limit,countSuccessful,demoMode?limiterResets:undefined);
  const localTest = mode !== 'standard';
  const file = demoMode?demoDatabase(root):localTest ? localTestDatabase(root) : path.join(root, '.data', 'sales-live.sqlite');
  if(!localTest) {requireAuthMigrationApproval(file);requireCompanyNameMigrationApproval(file);}
  const store = new SalesStore(file);
  const directory = new CompanyDirectory(file, localTest,demoMode);
  const inbox=demoMode?new DemoMailbox(file):null;
  const mail = inbox ?? configureMail(localTest);
  let closed = false;
  let notificationEpoch=0,notifying:Promise<void>|null=null;
  async function flushUnblockNotices() {
    if(closed||!mail)return;
    if(notifying)return notifying;
    const epoch=notificationEpoch;
    notifying=(async()=>{
      for(let count=0;count<20&&!closed&&epoch===notificationEpoch;count++) {
        const notice=directory.unblockRequests.claimNotice();if(!notice)break;
        try {
          const recipient=directory.unblockRequests.resolveNoticeRecipient(notice.id,notice.lease);
          if(!recipient||!directory.unblockRequests.noticeIsCurrent(notice.id,notice.lease))throw new Error('Adresse remplacée.');
          await mail.check();if(closed||epoch!==notificationEpoch)break;
          if(!directory.unblockRequests.noticeIsCurrent(notice.id,notice.lease))throw new Error('Adresse remplacée.');
          await mail.sendNotice(String(recipient),notice.subject,notice.body);
          if(!closed)directory.unblockRequests.noticeDelivered(notice.id,notice.lease,true);
        } catch {if(!closed)directory.unblockRequests.noticeDelivered(notice.id,notice.lease,false);}
      }
    })().finally(()=>{notifying=null;});
    return notifying;
  }
  const noticeTimer=setInterval(()=>{void flushUnblockNotices().catch(()=>{});},60000);noticeTimer.unref();
  async function sendLink(ticket: {address:string;token:string;login:string}, purpose: EmailPurpose) {
    try { await mail.send(ticket.address,ticket.token,purpose,ticket.login); }
    catch {
      if (!closed) directory.emailRecovery.deliveryFailed(ticket.token);
      throw new Error('Le serveur SMTP n’a pas accepté le message. Vérifiez la configuration de messagerie.');
    }
  }
  const legacy = localTest ? null : getCommercialSource(legacyCompany);
  if (legacy) {
    for (const id of store.companyIds()) directory.registerExisting({ id, name: store.read(id).settings.companyName });
    if (legacy.url || process.env.TMS_COMPANY_ID) directory.registerExisting({ id: legacyCompany, name: legacy.companyName });
  }
  // Tokens are selected by company AND exact endpoint. Editing an address must never forward an old token.
  const credentials: Record<string, { url: string; token?: string; connectorId?: CommercialSource['connectorId']; allowPrivateNetwork?: boolean }> =
    localTest ? {} : JSON.parse(process.env.TMS_COMPANY_API_CREDENTIALS || '{}');
  const services = new Map<string, { revision: number; service: SalesSyncService }>();
  function open(company: RegisteredCompany) {
    const existingService = services.get(company.id);
    if (existingService?.revision === company.statusRevision) return existingService.service;
    existingService?.service.close();
    if (!store.companyIds().includes(company.id)) {
      const source = company.id === legacyCompany && legacy?.url ? legacy : { connectorId: 'standard' as const, url: '', sourceName: 'API standard' };
      store.transaction(company.id, state => {
        if (!directory.isActive(company.id, company.statusRevision)) throw new SourcePolicyError(409, 'Cet espace a changé.');
        return { ...state, settings: { ...DEFAULT_SALES_API, ...source, companyName: company.name } };
      });
    }
    const entry = Object.hasOwn(credentials, company.id) ? credentials[company.id] : undefined;
    const existing = store.read(company.id);
    const original = existing.approvedSources === undefined ? existing.settings
      : existing.approvedSources.find(source => source.legacyNetwork && source.url === entry?.url);
    const entryKind = entry?.connectorId ?? (original && original.url === entry?.url ? original.connectorId :
      entry?.url?.endsWith('/seller/searchDossierVente') ? 'seller' : 'standard');
    const credentialMatches = (source: CommercialSource) => entry?.url === source.url && source.connectorId === entryKind;
    const legacyMatches = (source: CommercialSource) => Boolean(legacy && company.id === legacyCompany && source.url === legacy.url && source.connectorId === legacy.connectorId);
    const service = new SalesSyncService(store, company.id, {
      isActive: () => directory.isActive(company.id, company.statusRevision),
      privateEndpoint: source => (entry?.allowPrivateNetwork === true && credentialMatches(source)) || legacyMatches(source),
      credential(settings) {
        if (credentialMatches(settings)) return entry.token;
        if (legacyMatches(settings)) return process.env.TMS_SALES_API_TOKEN;
      },
    });
    services.set(company.id, {revision: company.statusRevision, service});
    return service;
  }
  for (const company of directory.companies()) if (company.status === 'active') open(company);

  const app = express();
  app.use(express.json({ limit: '12mb' }));
  const auth = (req: express.Request) => req.get('authorization')?.replace(/^Bearer /, '') || '';
  const local = (ip = '') => ['::1','::ffff:127.0.0.1','127.0.0.1'].includes(ip);
  function canInitialize(req: express.Request) {
    const forwarded = ['forwarded','x-forwarded-for','x-forwarded-host','x-forwarded-proto','x-forwarded-port','x-real-ip'];
    return local(req.socket.remoteAddress) && localHost(req.hostname) && !forwarded.some(header=>req.get(header) !== undefined);
  }
  app.use((req,res,next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy','no-referrer');
    if (localTest && (!local(req.socket.remoteAddress) || !localHost(req.hostname)))
      return res.status(403).json({error:'Le mode de test est réservé au serveur local.'});
    if(demoMode && !canInitialize(req)) return res.status(403).json({error:'La démonstration exige un accès local direct, sans proxy.'});
    if (req.method !== 'GET' && req.get('origin') && new URL(req.get('origin')!).host !== req.get('host'))
      return res.status(403).json({ error: 'Origine refusée.' });
    next();
  });
  app.get('/access', (req,res) => {
    const account = directory.account(auth(req));
    const email=account ? directory.emailStatus(auth(req)) : null;
    const requiresEmailVerification=Boolean(account && !email?.emailVerified);
    const companies = account && !requiresEmailVerification ? directory.companies(account).map(({id, name, demo, status}) => ({id, name, demo, status})) : [];
    res.json({ setup: (directory.setupNeeded() || directory.setupPending()) && canInitialize(req), account, companies,requiresEmailVerification,email:email?.email??null });
  });
  app.get('/demo/status',(_req,res)=>res.json({enabled:demoMode}));
  if(inbox) {
    app.get('/demo/messages',(_req,res)=>res.json(inbox.list()));
    app.post('/demo/messages/:id/expire',(req,res)=>{
      const token=inbox.token(req.params.id);
      if(!token) return res.status(404).json({error:'Message de démonstration introuvable.'});
      directory.emailRecovery.deliveryFailed(token);directory.unblockRequests.deliveryFailed(token);res.json({});
    });
    app.post('/demo/reset',(req,res)=>{
      if(req.body?.confirmation!=='REINITIALISER LA DEMO') return res.status(400).json({error:'Confirmez la réinitialisation des seules données de démonstration.'});
      for(const {service} of services.values()) service.close();
      services.clear();notificationEpoch++;directory.resetDemo();inbox.clear();for(const reset of limiterResets) reset();res.json({});
    });
  }
  app.post('/setup', rateLimit(10,true), async (req,res,next) => {
    if (!canInitialize(req)) return res.status(403).json({ error: 'Créez le premier administrateur directement sur le serveur local.' });
    const secret=process.env[localTest?'TMS_TEST_SETUP_SECRET':'TMS_SETUP_SECRET'];
    const supplied=req.body?.setupSecret;
    if (!demoMode && (!secret || !/^[a-f0-9]{64}$/i.test(secret) || typeof supplied!=='string' || supplied.length>200 ||
      !timingSafeEqual(createHash('sha256').update(secret).digest(),createHash('sha256').update(supplied).digest())))
      return res.status(403).json({error:'L’initialisation nécessite la clé fournie par le responsable du serveur.'});
    if (!mail) return res.status(503).json({error:'Configurez le service SMTP et l’URL publique de cet environnement.'});
    if (!emailKey(req.body?.email) || !validNewPassword(req.body?.password))
      return res.status(400).json({error:'Saisissez une adresse e-mail et un mot de passe de 10 à 200 caractères.'});
    try {
      directory.beginEmailSetup(req.body.email,req.body.password);
      const ticket=directory.emailRecovery.issue('admin','verify');
      if (!ticket) return res.status(409).json({error:'Attendez une minute avant de renvoyer le lien.'});
      await sendLink(ticket,'verify');
      res.status(201).json({pending:true});
    } catch (error) {next(error);}
  });
  const loginLimiter=limitLoginAttempts(demoMode?limiterResets:undefined);
  app.post('/login', loginLimiter, (req,res) => {
    try {
      const token = directory.login(req.body?.login, req.body?.password);
      if (!token) return res.status(401).json({ error: loginErrorMessages.invalidCredentials });
      res.json({ token });
    } catch (error) {
      if(error instanceof CompanyDisabledError)
        return res.status(403).json({error:error.message,code:'COMPANY_DISABLED'});
      if(error instanceof AccountSuspendedError)
        return res.status(403).json({error:error.message,code:'ACCOUNT_SUSPENDED'});
      res.status(500).json({ error: 'Une erreur technique empêche la connexion. Réessayez plus tard.' });
    }
  });
  app.post('/account-unblock/request',loginLimiter,rateLimit(6,true),async(req,res,next)=>{
    if(!mail)return res.status(503).json({error:mailUnavailable});
    try {
      await mail.check();
      const result=directory.unblockRequests.issue(req.body?.login,req.body?.password);
      if(result.state==='verification_required'&&result.ticket) {
        try {await mail.sendUnblockVerification(result.ticket.address,result.ticket.token);}
        catch {directory.unblockRequests.deliveryFailed(result.ticket.token);return res.status(503).json({error:'L’envoi du lien de confirmation est indisponible. Réessayez plus tard.'});}
      }
      res.status(202).json({state:result.state});
    } catch(error){if(error instanceof AccountAccessError)return next(error);res.status(503).json({error:mailUnavailable});}
  });
  app.post('/account-unblock/verify',rateLimit(10),async(req,res,next)=>{
    try {const result=directory.unblockRequests.confirm(req.body?.token);void flushUnblockNotices().catch(()=>{});res.json(result);}
    catch(error){next(error);}
  });
  app.post('/company-email/request',rateLimit(6,true),async (req,res,next)=>{
    if (!mail) return res.status(503).json({error:mailUnavailable});
    const email = req.body?.email;
    if (!emailKey(email)) return res.status(400).json({error:'Saisissez une adresse e-mail valide.'});
    // Check transport availability for every request, independently of account existence.
    try {await mail.check();} catch {return res.status(503).json({error:mailUnavailable});}
    try {
      const ticket = directory.emailRecovery.issue(email.trim(),'reset');
      // SMTP latency and per-recipient failures must not disclose account eligibility.
      if (ticket) void sendLink(ticket,'reset').catch(()=>console.warn('Échec d’envoi SMTP pour la récupération de compte.'));
      res.status(202).json({});
    } catch(error) {next(error);}
  });
  app.post('/company-email/verify',rateLimit(10),(req,res)=>{
    if (!directory.emailRecovery.consume(req.body?.token,'verify'))
      return res.status(400).json({error:'Lien invalide, expiré ou déjà utilisé.'});
    res.json({});
  });
  app.post('/company-email/reset',rateLimit(10),(req,res)=>{
    if (!validNewPassword(req.body?.password)) return res.status(400).json({error:'Choisissez un mot de passe de 10 à 200 caractères.'});
    if (!directory.emailRecovery.consume(req.body?.token,'reset',req.body.password))
      return res.status(400).json({error:'Lien invalide, expiré ou déjà utilisé.'});
    res.json({});
  });
  app.post('/company-email/activate',rateLimit(10),(req,res)=>{
    if (!validNewPassword(req.body?.password)) return res.status(400).json({error:'Choisissez un mot de passe de 10 à 200 caractères.'});
    if (!directory.emailRecovery.consume(req.body?.token,'activate',req.body.password))
      return res.status(400).json({error:'Lien invalide, expiré ou déjà utilisé.'});
    res.json({});
  });
  app.use((req, res, next) => {
    const account = directory.account(auth(req));
    if (!account) return res.status(401).json({ error: 'Connectez-vous pour accéder à votre espace.' });
    res.locals.account = account; next();
  });
  app.post('/logout', (req,res) => { directory.logout(auth(req)); res.json({}); });
  app.put('/own-email',rateLimit(6,true),async(req,res,next)=>{
    if(!mail) return res.status(503).json({error:'Configurez le service SMTP et l’URL publique de cet environnement.'});
    try {
      const login=directory.confirmPassword(auth(req),req.body?.currentPassword);
      directory.emailRecovery.requestAccountAddress(login,req.body?.email,login);
      const ticket=directory.emailRecovery.issue(login,'verify');
      if(!ticket) return res.status(409).json({error:'Cette adresse est déjà vérifiée ou un envoi vient d’être demandé. Attendez une minute.'});
      await sendLink(ticket,'verify');res.json({});
    } catch(error){next(error);}
  });
  app.post('/own-email/verification',rateLimit(6,true),async(req,res,next)=>{
    if(!mail) return res.status(503).json({error:'Configurez le service SMTP et l’URL publique de cet environnement.'});
    const ticket=directory.emailRecovery.issue(directory.ownLogin(auth(req)),'verify');
    if(!ticket) return res.status(409).json({error:'Vérifiez l’adresse à confirmer ou attendez une minute.'});
    try {await sendLink(ticket,'verify');res.json({});} catch(error){next(error);}
  });
  app.use((req,res,next)=>{
    if(!directory.emailStatus(auth(req))?.emailVerified)
      return res.status(403).json({error:'Vérifiez votre adresse e-mail pour accéder à votre espace.',emailVerificationRequired:true});
    next();
  });
  const admin: express.RequestHandler = (_req,res,next) => {
    if (res.locals.account.role !== 'admin') return void res.status(403).json({ error: 'Action réservée à l’administrateur.' });
    next();
  };
  app.get('/admin/overview', admin, (req,res) => res.json(directory.adminOverview(auth(req))));
  app.get('/admin/accounts/:login',admin,(req,res)=>res.json(directory.accountDetails(auth(req),req.params.login)));
  app.get('/admin/unblock-requests',admin,(req,res)=>res.json(directory.listUnblockRequests(auth(req))));
  app.put('/admin/unblock-requests/:id',admin,rateLimit(15,true),async(req,res,next)=>{
    try {directory.decideUnblock(auth(req),req.params.id,req.body?.decision,req.body?.revision);void flushUnblockNotices().catch(()=>{});res.json(directory.listUnblockRequests(auth(req)).find(request=>request.id===req.params.id));}
    catch(error){next(error);}
  });
  app.put('/admin/accounts/:login/status',admin,rateLimit(15,true),(req,res)=>{
    if(!['active','suspended'].includes(req.body?.status))return res.status(400).json({error:'Statut de compte invalide.'});
    const result=directory.manageAccountAccess(auth(req),req.params.login,req.body.status,req.body?.revision);
    void flushUnblockNotices().catch(()=>{});res.json(result);
  });
  app.post('/admin/accounts/:login/revoke-sessions',admin,rateLimit(15,true),(req,res)=>
    res.json(directory.manageAccountAccess(auth(req),req.params.login,'revoke',req.body?.revision)));
  app.put('/admin/password', admin, rateLimit(10), (req,res) => {
    directory.changeAdminPassword(req.body?.currentPassword, req.body?.password);
    res.json({});
  });
  app.post('/companies', admin, rateLimit(10,true), async (req,res,next) => {
    if (!mail) return res.status(503).json({error:'Configurez le service SMTP avant de créer une entreprise avec invitation.'});
    let created=false;
    try {
      const company = directory.create(req.body?.name, undefined, randomBytes(32).toString('base64url'),req.body?.email ?? null);
      created=true;
      open(company);
      const ticket=directory.emailRecovery.issue(company.id,'activate');
      await sendLink(ticket,'activate');
      res.status(201).json({id:company.id,name:company.name,status:company.status});
    } catch(error) {
      if (created) return res.status(400).json({error:'L’entreprise a été créée, mais son invitation n’a pas pu être envoyée. Ouvrez sa fiche dans Entreprises et renvoyez l’invitation après correction du service SMTP.'});
      next(error);
    }
  });
  const space = express.Router({ mergeParams: true });
  app.use('/companies/:id', (req,res,next) => {
    const account: Account = res.locals.account;
    const company = directory.companies(account).find(c => c.id === req.params.id);
    if (!company) return res.status(403).json({ error: 'Accès à cet espace refusé.' });
    res.locals.company = company; next();
  }, space);
  function service(res: express.Response): SalesSyncService { return open(res.locals.company); }
  space.all('/', admin);
  if (localTest) {
    space.delete('/', (req,res) => {
      const { id } = res.locals.company;
      directory.deleteTestCompany(auth(req), id, req.body?.confirmationName, req.body?.revision);
      services.get(id)?.service.close();
      services.delete(id);
      res.json({id});
    });
  }
  space.patch('/', (req,res) => res.json(directory.rename(res.locals.company.id, req.body?.name)));
  space.put('/status', admin, (req,res) => {
    const { id } = res.locals.company;
    const status = req.body?.status;
    directory.setStatus(id, status);
    if (status === 'disabled') {
      services.get(id)?.service.close();
      services.delete(id);
    } else {
      const current = directory.companies().find(c => c.id === id);
      if (current?.status === 'active') open(current);
    }
    res.json({ id, status });
  });
  space.use((_req,res,next) => {
    if (res.locals.company.status !== 'active') return res.status(403).json({ error: 'Cette entreprise est désactivée.' });
    next();
  });
  space.put('/email',admin,(req,res)=>{
    directory.confirmPassword(auth(req),req.body?.currentPassword);
    directory.emailRecovery.setAddress(res.locals.company.id,req.body?.email,directory.ownLogin(auth(req)));
    res.json({});
  });
  space.post('/email/verification',admin,rateLimit(10,true),async (_req,res,next)=>{
    if (!mail) return res.status(503).json({error:'Configurez le service SMTP et l’URL publique de cet environnement.'});
    const ticket = directory.emailRecovery.issue(res.locals.company.id,'verify');
    if (!ticket) return res.status(409).json({error:'Vérifiez l’adresse à confirmer ou attendez une minute avant un nouvel envoi.'});
    try { await sendLink(ticket,'verify'); res.json({}); } catch (error) { next(error); }
  });
  space.post('/invitation',admin,rateLimit(6,true),async (req,res,next)=>{
    if (!mail) return res.status(503).json({error:'Configurez le service SMTP et l’URL publique de cet environnement.'});
    try {
      if(req.body?.email!==undefined) {
        directory.confirmPassword(auth(req),req.body?.currentPassword);
        directory.inviteExistingCompany(res.locals.company.id,req.body.email);
      }
      const ticket=directory.emailRecovery.issue(res.locals.company.id,'activate');
      if (!ticket) return res.status(409).json({error:'Vérifiez le compte en attente d’activation ou attendez une minute.'});
      await sendLink(ticket,'activate');res.json({});
    } catch(error){next(error);}
  });
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
    if (!directory.saveTransport(res.locals.company.id, revision, data, res.locals.company.statusRevision)) return res.status(409).json({ error: 'Cet espace a changé dans une autre session. Rechargez la page avant de continuer.' });
    res.json({ revision: revision + 1 });
  });
  app.use((_req,res) => res.status(404).json({ error: 'Opération inconnue.' }));
  app.use(((error,req,res,_next) => {
    if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large')
      return res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'Le contenu de la demande est invalide.' });
    if (error instanceof SourcePolicyError) return res.status(error.status).json({ error: error.message });
    if (error instanceof AccountAccessError) return res.status(error.status).json({error:error.message});
    if (['/login', '/setup'].includes(req.path.toLowerCase().replace(/\/$/, ''))) {
      // A body-parser error can contain part of the submitted credentials.
      const status = error.status === 413 ? 413 : 400;
      return res.status(status).json({ error: 'La demande d’authentification est invalide.' });
    }
    return res.status(400).json({ error: error instanceof Error && !('code' in error) ? error.message : 'Opération impossible.' });
  }) as express.ErrorRequestHandler);
  void flushUnblockNotices().catch(()=>{});
  return { app, close: () => { closed=true;notificationEpoch++;clearInterval(noticeTimer); for (const {service} of services.values()) service.close(); inbox?.close();directory.close(); store.close(); } };
}
function localHost(host: string) { return ['localhost','127.0.0.1','[::1]'].includes(host); }

function limitAttempts(limit: number, countSuccessful = false, resets?:(()=>void)[]): express.RequestHandler {
  const attempts = new Map<string, { count: number; until: number }>();
  let nextCleanup = 0;
  resets?.push(()=>attempts.clear());
  return (req, res, next) => {
    const now = Date.now();
    if (now >= nextCleanup) {
      for (const [ip,window] of attempts) if (window.until <= now) attempts.delete(ip);
      nextCleanup = now+60_000;
    }
    const key = req.socket.remoteAddress || '';
    let attempt = attempts.get(key);
    if (!attempt || now >= attempt.until) {
      attempt = { count: 0, until: now + 60_000 };
      attempts.set(key, attempt);
    }
    if (attempt.count >= limit) {
      res.setHeader('Retry-After', String(Math.ceil((attempt.until - Date.now()) / 1000)));
      res.status(429).json({ error: 'Trop de tentatives. Réessayez dans une minute.' });
      return;
    }
    attempt.count++;
    res.once('finish', () => {
      if (!countSuccessful && res.statusCode < 400 && attempts.get(key) === attempt) attempts.delete(key);
    });
    next();
  };
}
