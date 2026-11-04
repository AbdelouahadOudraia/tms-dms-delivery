import type { Delivery, Incident } from '../types';
import { buildOperationalIncidents } from './operationalIncidents';

export type DriverHistoryGroup = 'completed' | 'follow-up';

export interface DriverHistoryEntry {
  delivery: Delivery;
  group: DriverHistoryGroup;
  incidents: Incident[];
}

const COMPLETED_STATUSES = new Set<Delivery['status']>(['Validée', 'Échec', 'Retournée']);
const FOLLOW_UP_STATUSES = new Set<Delivery['status']>(['À valider', 'Rejetée']);

export const getDriverHistoryEntries = (
  deliveries: Delivery[], incidents: Incident[], driverId: string
): DriverHistoryEntry[] => {
  const incidentsByDelivery = new Map<string, Incident[]>();
  buildOperationalIncidents(incidents, deliveries).forEach((incident) => {
    const related = incidentsByDelivery.get(incident.deliveryId) || [];
    related.push(incident);
    incidentsByDelivery.set(incident.deliveryId, related);
  });

  return deliveries
    .filter((delivery) => delivery.driverId === driverId &&
      (COMPLETED_STATUSES.has(delivery.status) || FOLLOW_UP_STATUSES.has(delivery.status)))
    .map((delivery) => ({
      delivery,
      group: COMPLETED_STATUSES.has(delivery.status) ? 'completed' as const : 'follow-up' as const,
      incidents: (incidentsByDelivery.get(delivery.id) || []).filter((incident) => incident.tourId === delivery.tourId),
    }));
};

export const getIncidentTreatmentSummary = (incident: Incident, deliveries: Delivery[]): string => {
  if (incident.treatment?.action === 'return') return 'Retour à l’entrepôt enregistré.';
  if (incident.treatment?.nextAttemptId) {
    const attempt = deliveries.find((delivery) => delivery.id === incident.treatment?.nextAttemptId);
    const decision = incident.treatment.action === 'replace' ? 'Remplacement prévu' : 'Nouvelle tentative prévue';
    return `${decision}${attempt?.deliveryDate ? ` le ${attempt.deliveryDate}` : ''}${attempt ? ` · ${attempt.status}` : ''}.`;
  }
  const resolution = incident.description.split(' · Résolution : ').at(-1);
  if (incident.resolved && resolution !== incident.description) return `Résolution : ${resolution}`;
  if (incident.resolved && incident.type === 'Preuve rejetée par le backoffice') {
    return 'Preuve corrigée et renvoyée au backoffice.';
  }
  return incident.resolved ? 'Incident traité par le backoffice.' : 'Traitement en attente côté backoffice.';
};
