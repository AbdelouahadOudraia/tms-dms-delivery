import { Delivery, Incident } from '../types';

export type OperationalIncident = Incident & { sourceStatus?: string };

export const buildOperationalIncidents = (
  incidents: Incident[],
  deliveries: Delivery[]
): OperationalIncident[] => {
  const byDelivery = new Map<string, OperationalIncident>();

  incidents.forEach((incident) => {
    byDelivery.set(incident.deliveryId, incident);
  });

  deliveries
    .filter((delivery) => delivery.status === 'Échec' || delivery.status === 'Rejetée')
    .forEach((delivery) => {
      const existing = byDelivery.get(delivery.id);
      if (existing) {
        byDelivery.set(delivery.id, { ...existing, sourceStatus: delivery.status });
        return;
      }

      byDelivery.set(delivery.id, {
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
        sourceStatus: delivery.status,
      });
    });

  return Array.from(byDelivery.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

export const countOpenOperationalIncidents = (
  incidents: Incident[],
  deliveries: Delivery[]
) => buildOperationalIncidents(incidents, deliveries).filter((incident) => !incident.resolved).length;
