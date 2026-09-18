export type DeliveryStatus =
  | 'À confirmer'
  | 'À planifier'
  | 'Planifiée'
  | 'Affectée'
  | 'En route'
  | 'Arrivé'
  | 'Livraison en cours'
  | 'À valider'
  | 'Validée'
  | 'Échec'
  | 'Rejetée'
  | 'Retournée';

export type TourStatus = 'Brouillon' | 'Planifiée' | 'Affectée' | 'En cours' | 'À clôturer' | 'Terminée' | 'Annulée';

export type DeliveryLifecycleStatus =
  | 'À livrer'
  | 'Confirmée'
  | 'En cours'
  | 'Livrée'
  | 'Échec de livraison'
  | 'Non chargée'
  | 'Annulée';

export type PodStatus = 'À collecter' | 'À valider' | 'Validée' | 'Rejetée';

export type IncidentStatus = 'Nouveau' | 'À traiter' | 'Résolu';
export type IncidentSeverity = 'Bloquant' | 'Information';

export interface DeliveryAddress {
  id: string;
  name: string;
  address: string;
  city: string;
  zone: string;
  lat: number;
  lng: number;
  geocodingStatus: 'Géocodée' | 'À vérifier' | 'Non localisée';
}

export interface DeliveryZone {
  id: string;
  name: string;
  region: string;
  addressesCount: number;
  activeToursCount: number;
}

export interface RouteOptimizationResult {
  deliveryId: string;
  incidentId: string;
  reorderedStops: number;
  newEta: string;
  remainingDistance: string;
  message: string;
}

export interface OrderItem {
  id: string;
  name: string;
  ref: string;
  quantity: number;
  weight: string;
  category: 'Lourd' | 'Fragile' | 'Standard';
  serialNumber?: string;
  checked?: boolean;
}

export interface ProofOfDelivery {
  photoUrl: string;
  photoTimestamp: string;
  hasSignature: boolean;
  signatureData?: string;
  signatureTimestamp: string;
  recipientName: string;
  driverNotes?: string;
  gpsCoordinates: {
    lat: number;
    lng: number;
  };
  gpsAccuracy: string;
  timestamp: string;
  validationTimestamp?: string;
  validatedBy?: string;
  rejectionReason?: string;
  rejectionComment?: string;
}

export interface Delivery {
  id: string; // e.g. "CMD-45821"
  orderId: string;
  deliveryDate?: string;
  customerName: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  timeSlot: string; // e.g. "10:00 – 11:00"
  arrivalTime?: string;
  deliveryTime?: string;
  status: DeliveryStatus;
  deliveryStatus?: DeliveryLifecycleStatus;
  podStatus?: PodStatus;
  tourId: string; // e.g. "TR-2026-058"
  sequence: number; // 1, 2, 3...
  driverId: string; // e.g. "DRV-001"
  driverName: string;
  vehicleId: string; // e.g. "12345-A-6"
  items: OrderItem[];
  instructions?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  proof?: ProofOfDelivery;
  failureReason?: string;
  failureComment?: string;
  failurePhotoUrl?: string;
}

export interface Tour {
  id: string; // e.g. "TR-2026-058"
  date: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleId: string;
  vehicleModel: string;
  deliveriesCount: number;
  completedCount: number;
  departureTime: string;
  estimatedEndTime: string;
  status: TourStatus;
  zone: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  license: string;
  status: 'Disponible' | 'En tournée' | 'Repos';
  currentTourId?: string;
  activeDeliveriesCount?: number;
  rating: number;
}

export interface Vehicle {
  id: string; // plate e.g. "12345-A-6"
  model: string;
  capacity: string;
  status: 'En service' | 'Disponible' | 'Maintenance';
  assignedDriverId?: string;
}

export interface Incident {
  id: string;
  deliveryId: string;
  tourId: string;
  customerName: string;
  driverName: string;
  type: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  status?: IncidentStatus;
  severity?: IncidentSeverity;
}


// Compatibility types for legacy screens
export type ScreenType =
  | 'dashboard'
  | 'list'
  | 'detail'
  | 'pod'
  | 'map'
  | 'incidents'
  | 'profile';

export interface StopItem {
  id: string;
  name: string;
  ref: string;
  weight: string;
  category: string;
  serialNumber?: string;
  validatedAt?: string;
  checked?: boolean;
}

export interface StopProof {
  photoUrl: string;
  photoTimestamp: string;
  signatureTimestamp: string;
  hasSignature: boolean;
  signatureData?: string;
  recipientName: string;
  driverNotes?: string;
  gpsVerified?: boolean;
}

export interface DeliveryStop {
  id: number;
  sequence: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  timeSlot: string;
  actualDeliveryTime?: string;
  status: 'pending' | 'current' | 'delivered' | 'failed';
  items: StopItem[];
  instructions?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  proof?: StopProof;
}

export interface IncidentReport {
  id: string;
  stopId: number;
  stopName: string;
  type: string;
  details: string;
  reportedAt: string;
  status: string;
}
