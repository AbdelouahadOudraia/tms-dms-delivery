export interface SalesOrigin {
  systemId: string;
  systemName: string;
  dossierId: string;
  dossierReference: string;
  generatedAt: string;
  lines: { saleLineId: string; quantity: number }[];
}

export interface SalesLine {
  id: string;
  ref: string;
  name: string;
  quantity: number;
  unitWeightKg: number | null;
  unitValue: number;
  category: 'Standard' | 'Lourd' | 'Fragile';
}

export interface SalesDossier {
  id: string;
  systemId: string;
  systemName: string;
  reference: string;
  commercialStatus: string;
  collectionMode: 'À livrer' | 'À emporter' | 'À récupérer';
  customerName: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  date: string;
  startTime: string;
  endTime: string;
  warehouseId: string;
  latitude: string;
  longitude: string;
  instructions: string;
  items: SalesLine[];
  sourceVersion?: number;
  reviewRequired?: string;
}

export interface SalesBlRequest {
  dossierId: string;
  systemId: string;
  quantities: Record<string, number>;
  unitWeights?: Record<string, number>;
  phone: string;
  address: string;
  district: string;
  city: string;
  date: string;
  startTime: string;
  endTime: string;
  warehouseId: string;
  latitude: string;
  longitude: string;
  packageCount: number;
  requiredVehicle: 'Fourgon' | '3.5T' | 'Camion';
  instructions: string;
}

export interface SalesApiSettings {
  sourceName: string;
  url: string;
  companyName: string;
  connectorId: 'seller' | 'standard';
  automatic: boolean;
  intervalSeconds: number;
  eligibleStatuses: string[];
}

export type CommercialSource = Pick<SalesApiSettings, 'connectorId' | 'url'>;

export interface SalesOperation {
  id: string;
  type: 'Récupération' | 'Génération BL' | 'Test connexion';
  status: 'En cours' | 'Réussi' | 'Erreur';
  timestamp: string;
  message: string;
  references: string[];
  trigger?: 'Manuel' | 'Automatique';
}

export interface SalesWorkspace {
  companyId: string;
  approvedSources?: Array<CommercialSource & { legacyNetwork?: true }>;
  dossiers: SalesDossier[];
  generatedBls: import('../types').Delivery[];
  settings: SalesApiSettings;
  operations: SalesOperation[];
  importing: boolean;
  connectionTest: boolean | null;
  message: string;
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  nextSyncAt: string | null;
  cursor: string | null;
  consecutiveFailures: number;
}
