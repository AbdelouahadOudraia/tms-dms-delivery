import { Delivery, Incident } from '../types';

export type OperationalIncident = Incident;

export const buildOperationalIncidents = (
  incidents: Incident[],
  deliveries: Delivery[]
): OperationalIncident[] => {
  const byId = new Map<string, OperationalIncident>();

  incidents.forEach((incident) => {
    byId.set(incident.id, { ...incident, sourceStatus: incident.sourceStatus ||
      (incident.type === 'Preuve rejetée par le backoffice' ? 'Rejetée' : 'Échec') });
  });

  deliveries
    .filter((delivery) => delivery.status === 'Échec' || delivery.status === 'Rejetée')
    .forEach((delivery) => {
      const existing = incidents.filter((incident) => incident.deliveryId === delivery.id);
      if (existing.length) {
        return;
      }

      byId.set(`INC-${delivery.id}`, {
        id: `INC-${delivery.id}`,
        deliveryId: delivery.id,
        tourId: delivery.tourId,
        customerName: delivery.customerName,
        driverName: delivery.driverName,
        type: delivery.failureReason || 'Preuve rejetée par le backoffice',
        description:
          delivery.failureComment ||
          delivery.proof?.rejectionComment ||
          'Anomalie déclarée sur la livraison.',
        timestamp: delivery.deliveryTime || '10:45',
        resolved: false,
        sourceStatus: delivery.status === 'Rejetée' ? 'Rejetée' : 'Échec',
      });
    });

  return Array.from(byId.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

export const countOpenOperationalIncidents = (
  incidents: Incident[],
  deliveries: Delivery[]
) => buildOperationalIncidents(incidents, deliveries).filter((incident) => !incident.resolved).length;
