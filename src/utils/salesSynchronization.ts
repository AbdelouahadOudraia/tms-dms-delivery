import type { Delivery } from '../types';
import type { CommercialSource, SalesApiSettings, SalesDossier, SalesWorkspace } from '../types/sales';
import { getSaleKey, getSaleEligibilityError } from './salesWorkflow';

export const sameSource = (a: CommercialSource, b: CommercialSource) => a.connectorId === b.connectorId && a.url === b.url;

export const DEFAULT_SALES_API: SalesApiSettings = {
  connectorId: 'seller', companyName: 'Electroplanet', sourceName: 'Seller', url: '',
  automatic: false, intervalSeconds: 60, eligibleStatuses: ['Payé'],
};

export const createSalesWorkspace = (companyId = 'electroplanet'): SalesWorkspace => ({
  companyId, dossiers: [], generatedBls: [], settings: structuredClone(DEFAULT_SALES_API), operations: [],
  importing: false, connectionTest: null, message: '', lastSyncAt: null, lastSuccessAt: null,
  nextSyncAt: null, cursor: null, consecutiveFailures: 0,
});

export const validateSalesApiSettings = (settings: SalesApiSettings) => {
  if (!settings || !settings.sourceName?.trim() || !settings.companyName?.trim()) throw new Error('Renseignez l’entreprise et le système source.');
  if (!['seller', 'standard'].includes(settings.connectorId)) throw new Error('Choisissez un connecteur disponible.');
  if (typeof settings.automatic !== 'boolean') throw new Error('Configuration du mode invalide.');
  if (!Number.isInteger(settings.intervalSeconds) || settings.intervalSeconds < 5 || settings.intervalSeconds > 86400) throw new Error('La fréquence doit être comprise entre 5 et 86 400 secondes.');
  if (!Array.isArray(settings.eligibleStatuses) || !settings.eligibleStatuses.length || settings.eligibleStatuses.some((status) => typeof status !== 'string' || !status.trim())) throw new Error('Définissez au moins un statut commercial éligible.');
  if (settings.url.trim()) {
    let url: URL;
    try { url = new URL(settings.url.trim()); } catch { throw new Error('Renseignez une URL API valide.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Utilisez une URL HTTP(S) sans identifiants ni paramètres confidentiels.');
  }
};

export const getNextSalesSyncAt = (settings: SalesApiSettings, failures: number, now: number): string | null =>
  settings.automatic ? new Date(now + Math.min(settings.intervalSeconds * 2 ** Math.min(failures, 6), Math.max(300, settings.intervalSeconds)) * 1000).toISOString() : null;

export const reconcileSalesDossiers = (existing: SalesDossier[], incoming: SalesDossier[], bls: Delivery[], statuses: string[]) => {
  const dossiers = structuredClone(existing);
  let imported = 0, updated = 0, unchanged = 0;
  const references: string[] = [];
  for (const received of incoming) {
    const index = dossiers.findIndex((sale) => getSaleKey(sale) === getSaleKey(received));
    if (index === -1) {
      if (getSaleEligibilityError(received, bls, statuses)) continue;
      if (dossiers.some((sale) => sale.systemId === received.systemId && sale.reference === received.reference)) continue;
      dossiers.push(structuredClone(received)); imported++; references.push(received.reference); continue;
    }
    const previous = dossiers[index];
    if ((received.sourceVersion ?? 0) < (previous.sourceVersion ?? 0)) { unchanged++; continue; }
    const { reviewRequired: oldWarning, sourceVersion: oldVersion, systemName: oldName, ...before } = previous;
    const { reviewRequired: ignoredWarning, sourceVersion: newVersion, systemName: newName, ...after } = received;
    if (JSON.stringify(before) === JSON.stringify(after)) {
      dossiers[index].sourceVersion = Math.max(oldVersion ?? 0, newVersion ?? 0); dossiers[index].systemName = received.systemName; unchanged++; continue;
    }
    const hasBl = bls.some((bl) => bl.sourceSale?.systemId === received.systemId && bl.sourceSale?.dossierId === received.id);
    dossiers[index] = { ...structuredClone(received), reviewRequired: hasBl
      ? 'Le dossier source a changé après génération d’un BL. Vérifiez les BL liés avant de poursuivre.' : oldWarning };
    updated++; references.push(received.reference);
  }
  return { dossiers, imported, updated, unchanged, references };
};
