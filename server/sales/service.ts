import { randomUUID } from 'node:crypto';
import type { CommercialSource, SalesApiSettings, SalesBlRequest, SalesOperation, SalesWorkspace } from '../../src/types/sales';
import { getNextSalesSyncAt, reconcileSalesDossiers, sameSource, validateSalesApiSettings } from '../../src/utils/salesSynchronization';
import { generateSalesBls } from '../../src/utils/salesWorkflow';
import { PUBLIC_SALES_CONNECTORS, SALES_CONNECTORS, validateSourceUrl, type SalesConnector } from './connectors';
import { validatePublicEndpoint } from './publicEndpoint';
import { SalesStore } from './store';

export class SourcePolicyError extends Error {
  constructor(readonly status: 403 | 409, message: string) { super(message); }
}
const identity = ({ connectorId, url }: CommercialSource): CommercialSource => ({ connectorId, url });
const denied = () => new SourcePolicyError(403, 'Cette source commerciale doit être autorisée pour votre entreprise.');

export class SalesSyncService {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<SalesWorkspace> | null = null;
  private testsInProgress = 0;
  private epoch = 0;
  private closed = false;
  private closedSnapshot: SalesWorkspace | null = null;
  constructor(private store: SalesStore, readonly companyId: string,
    private options: { scheduling?: boolean; credential?: (settings: SalesApiSettings) => string | undefined; privateEndpoint?: (source: CommercialSource) => boolean; source?: Pick<SalesApiSettings, 'companyName' | 'connectorId' | 'sourceName' | 'url'>; connectors?: typeof SALES_CONNECTORS; now?: () => number } = {}) {
    const recovered = store.transaction(companyId, (state) => ({ ...state, importing: false,
      // Prior to delegation only the platform administrator could set this exact source.
      approvedSources: state.approvedSources ?? (state.settings.url ? [{ ...identity(state.settings), legacyNetwork: true }] : []),
      settings: { ...state.settings, ...options.source, automatic: Boolean((options.source?.url ?? state.settings.url) && state.settings.automatic) },
      nextSyncAt: (options.source?.url ?? state.settings.url) ? state.nextSyncAt : null,
      connectionTest: null,
      operations: state.operations.map((operation) => operation.status === 'En cours' ? { ...operation, status: 'Erreur', message: 'Traitement interrompu par le redémarrage du service.' } : operation) }));
    if (recovered.settings.automatic) this.schedule(recovered.nextSyncAt || new Date(this.now()).toISOString());
  }
  private now() { return this.options.now?.() ?? Date.now(); }
  private clearTimer() { if (this.timer) clearTimeout(this.timer); this.timer = null; }
  private schedule(at: string | null) {
    this.clearTimer();
    this.store.transaction(this.companyId, (state) => ({ ...state, nextSyncAt: state.settings.automatic ? at : null }));
    if (!at || this.options.scheduling === false || this.closed) return;
    this.timer = setTimeout(() => this.runScheduled(), Math.max(0, new Date(at).getTime() - this.now()));
    this.timer.unref();
  }
  private runScheduled() {
    void this.synchronize('Automatique').catch(() => {
      if (this.closed) return;
      // Storage failures cannot always be journaled in that same storage. Retry
      // without writing first, so a temporary lock does not stop the worker.
      console.error('Stockage de synchronisation indisponible ; nouvelle tentative dans 5 secondes.');
      this.clearTimer();
      this.timer = setTimeout(() => this.runScheduled(), 5000);
      this.timer.unref();
    });
  }
  snapshot() { return this.store.read(this.companyId); }
  private validateNewSource(source: CommercialSource) {
    if (!source.url || !['standard', 'seller'].includes(source.connectorId)) throw new Error('Choisissez un connecteur et renseignez son URL.');
    validateSourceUrl(source.connectorId, source.url);
    if (!this.options.privateEndpoint?.(source)) validatePublicEndpoint(new URL(source.url));
  }
  authorize(source: CommercialSource) {
    return this.store.transaction(this.companyId, state => {
      if (state.approvedSources.some(entry => sameSource(entry, source))) return state;
      this.validateNewSource(source);
      return { ...state, approvedSources: [...state.approvedSources, identity(source)] };
    });
  }
  revoke(source: CommercialSource) {
    if (this.running || this.testsInProgress) throw new SourcePolicyError(409, 'Un appel est en cours. Réessayez après sa fin.');
    const next = this.store.transaction(this.companyId, state => {
      const approvedSources = state.approvedSources.filter(entry => !sameSource(entry, source));
      if (!sameSource(state.settings, source)) return { ...state, approvedSources };
      return { ...state, approvedSources, settings: { ...state.settings, automatic: false },
        connectionTest: null, nextSyncAt: null, message: 'Autorisation de la source retirée.' };
    });
    if (sameSource(next.settings, source)) this.clearTimer();
    return next;
  }
  private connector(state: SalesWorkspace): SalesConnector {
    if (!state.settings.url) throw new Error('Configurez d’abord l’adresse de la source commerciale.');
    const source = state.approvedSources.find(entry => sameSource(entry, state.settings));
    if (!source) throw denied();
    const trustedNetwork = source.legacyNetwork || this.options.privateEndpoint?.(source);
    const available = this.options.connectors ?? (trustedNetwork ? SALES_CONNECTORS : PUBLIC_SALES_CONNECTORS);
    return available[source.connectorId];
  }
  updateSettings(settings: SalesApiSettings, platformAdmin = false) {
    settings = { ...settings, ...this.options.source };
    validateSalesApiSettings(settings);
    if (settings.automatic && !settings.url) throw new Error('Configurez d’abord l’URL de l’API sur le serveur.');
    const next = this.store.transaction(this.companyId, state => {
      if ((state.dossiers.length || state.generatedBls.length) && !sameSource(state.settings, settings))
        throw new SourcePolicyError(409, 'Cet espace contient déjà des dossiers importés. Le changement de source nécessite une migration.');
      let approvedSources = state.approvedSources;
      if (settings.url && !approvedSources.some(entry => sameSource(entry, settings))) {
        if (!platformAdmin) throw denied();
        this.validateNewSource(settings);
        approvedSources = [...approvedSources, identity(settings)];
      }
      return {
        ...state, approvedSources, settings: {
          ...settings, sourceName: settings.sourceName.trim(), companyName: settings.companyName.trim(), url: settings.url.trim(),
          eligibleStatuses: [...new Set(settings.eligibleStatuses.map(status => status.trim()))],
        },
        importing: false, connectionTest: null, cursor: null, consecutiveFailures: 0,
        operations: state.operations.map(operation => operation.status === 'En cours' ? { ...operation, status: 'Erreur', message: 'Configuration modifiée pendant la synchronisation.' } : operation),
        message: 'Configuration de synchronisation enregistrée.',
      };
    });
    this.epoch++;
    this.schedule(next.settings.automatic ? new Date(this.now() + next.settings.intervalSeconds * 1000).toISOString() : null);
    return this.snapshot();
  }
  async synchronize(trigger: 'Manuel' | 'Automatique' = 'Manuel'): Promise<SalesWorkspace> {
    if (this.running) return this.running;
    if (this.closed) throw new Error('Le service est arrêté.');
    const connector = this.connector(this.snapshot());
    this.clearTimer();
    const epoch = this.epoch;
    const id = randomUUID(), started = new Date(this.now()).toISOString();
    const before = this.store.transaction(this.companyId, (state) => ({ ...state, importing: true, nextSyncAt: null,
      message: 'Synchronisation des dossiers à transformer en BL…', operations: [{ id, type: 'Récupération', status: 'En cours', trigger,
        timestamp: started, message: 'Synchronisation en cours.', references: [] } satisfies SalesOperation, ...state.operations].slice(0, 200) }));
    const task = (async () => {
      try {
        const batch = await connector.fetchDossiers(before.settings, before.cursor, before.dossiers, this.options.credential?.(before.settings));
        if (this.closed || epoch !== this.epoch) return this.closedSnapshot || this.snapshot();
        const timestamp = new Date(this.now()).toISOString();
        return this.store.transaction(this.companyId, (state) => {
          const result = reconcileSalesDossiers(state.dossiers, batch.dossiers, state.generatedBls, state.settings.eligibleStatuses);
          const message = result.imported || result.updated || result.unchanged
            ? `${result.imported} nouveau(x) dossier(s), ${result.updated} mis à jour, ${result.unchanged} déjà connu(s).`
            : 'Aucun nouveau dossier ni changement depuis la dernière synchronisation.';
          return { ...state, dossiers: result.dossiers, importing: false, message, cursor: batch.cursor,
            lastSyncAt: timestamp, lastSuccessAt: timestamp, consecutiveFailures: 0,
            nextSyncAt: getNextSalesSyncAt(state.settings, 0, this.now()),
            operations: state.operations.map((operation) => operation.id === id ? { ...operation, status: 'Réussi', timestamp, message, references: result.references } : operation) };
        });
      } catch (cause) {
        if (this.closed || epoch !== this.epoch) return this.closedSnapshot || this.snapshot();
        const timestamp = new Date(this.now()).toISOString();
        const message = cause instanceof Error ? cause.message : 'La synchronisation a échoué.';
        return this.store.transaction(this.companyId, (state) => ({ ...state, importing: false, message, lastSyncAt: timestamp,
          consecutiveFailures: state.consecutiveFailures + 1,
          nextSyncAt: getNextSalesSyncAt(state.settings, state.consecutiveFailures + 1, this.now()),
          operations: state.operations.map((operation) => operation.id === id ? { ...operation, status: 'Erreur', timestamp, message, references: [] } : operation) }));
      }
    })().finally(() => {
      if (this.running === task) this.running = null;
      if (!this.closed) this.schedule(this.snapshot().nextSyncAt);
    });
    this.running = task;
    return task;
  }
  async testConnection() {
    const state = this.snapshot();
    const { settings } = state;
    const connector = this.connector(state);
    const epoch = this.epoch;
    let available = true, message = 'Connexion réussie. Le service a répondu à la requête.';
    this.testsInProgress++;
    try { await connector.test(settings, this.options.credential?.(settings)); }
    catch (error) { available = false; message = error instanceof Error ? error.message : 'Connexion impossible.'; }
    finally { this.testsInProgress--; }
    if (this.closed || epoch !== this.epoch) return this.closedSnapshot || this.snapshot();
    return this.store.transaction(this.companyId, (state) => {
      const operation: SalesOperation = { id: randomUUID(), type: 'Test connexion', status: available ? 'Réussi' : 'Erreur',
        timestamp: new Date(this.now()).toISOString(), references: [], message };
      return { ...state, connectionTest: available, message, operations: [operation, ...state.operations].slice(0, 200) };
    });
  }
  generate(requests: SalesBlRequest[]) {
    const timestamp = new Date(this.now()).toISOString();
    try {
      let generated: SalesWorkspace['generatedBls'] = [];
      const state = this.store.transaction(this.companyId, (previous) => {
        generated = generateSalesBls(previous.dossiers, previous.generatedBls, requests, timestamp, previous.settings.eligibleStatuses);
        const operation: SalesOperation = { id: randomUUID(), type: 'Génération BL', status: 'Réussi', timestamp,
          message: `${generated.length} BL généré(s) au statut « À confirmer ».`, references: generated.map((bl) => bl.orderId) };
        return { ...previous, generatedBls: [...generated, ...previous.generatedBls], message: operation.message,
          operations: [operation, ...previous.operations].slice(0, 200) };
      });
      return { state, generated };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'La génération a échoué.';
      this.store.transaction(this.companyId, (state) => ({ ...state, message, operations: [{ id: randomUUID(),
        type: 'Génération BL', status: 'Erreur', timestamp, message, references: [] } satisfies SalesOperation, ...state.operations].slice(0, 200) }));
      throw new Error(message);
    }
  }
  close() { this.closedSnapshot = this.snapshot(); this.closed = true; this.epoch++; this.clearTimer(); }
}
