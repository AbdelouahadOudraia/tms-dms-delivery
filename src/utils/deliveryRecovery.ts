import type { Delivery, FailedDeliveryTreatment, Incident } from '../types';
import { WAREHOUSES } from '../data/logisticsReference';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export const formatDeliveryDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

export const isAddressFailure = (reason: string) => /adresse/i.test(reason);
export const isDamagedDelivery = (reason: string) => /endommag|ab[iî]m|cass/i.test(reason);

// The display status determines both lifecycle fields on every state transition.
export const synchronizeDeliveryStatus = (delivery: Delivery): Delivery => {
  const status = delivery.status;
  const deliveryStatus = status === 'Échec' || status === 'Retournée' ? 'Échec de livraison'
    : ['À valider', 'Validée', 'Rejetée'].includes(status) ? 'Livrée'
    : ['En route', 'Arrivé', 'Livraison en cours'].includes(status) ? 'En cours'
    : status === 'À confirmer' ? 'À livrer' : 'Confirmée';
  const podStatus = status === 'À valider' || status === 'Validée' || status === 'Rejetée' ? status : 'À collecter';
  return { ...delivery, deliveryStatus, podStatus };
};

export const prepareFailedDeliveryTreatment = (
  deliveries: Delivery[], incident: Incident | undefined, deliveryId: string,
  payload: FailedDeliveryTreatment, timestamp: string
): { success: false; message: string } | { success: true; message: string; deliveries: Delivery[]; incident: Incident } => {
  const delivery = deliveries.find((item) => item.id === deliveryId);
  const fail = (message: string) => ({ success: false as const, message });
  if (!delivery || !incident || incident.deliveryId !== deliveryId) return fail('Le BL ou l’incident est introuvable.');
  if (delivery.status !== 'Échec') return fail('Ce traitement concerne uniquement les livraisons en échec.');
  if (delivery.nextAttemptId || incident.treatment || deliveries.some((item) => item.previousAttemptId === deliveryId)) {
    return fail('Une reprise ou un retour a déjà été enregistré pour cette tentative.');
  }
  if (!['retry', 'replace', 'return'].includes(payload.action)) return fail('Choisissez un traitement.');
  if (!payload.note.trim() || !payload.confirmed) return fail('Décrivez et confirmez le traitement convenu avec le client ou l’entrepôt.');
  const history: Incident = { ...incident, sourceStatus: 'Échec', resolved: true, status: 'Résolu',
    treatment: { action: payload.action, note: payload.note.trim(), timestamp } };
  if (payload.action === 'return') {
    return { success: true, message: 'Retour à l’entrepôt enregistré. L’historique est conservé.',
      deliveries: deliveries.map((item) => item.id === deliveryId ? synchronizeDeliveryStatus({ ...item, status: 'Retournée' }) : item),
      incident: { ...history, description: `${incident.description} · Retour confirmé à l’entrepôt : ${payload.note.trim()}` } };
  }
  if (isDamagedDelivery(delivery.failureReason || incident.type) && payload.action !== 'replace') {
    return fail('Pour un produit endommagé, confirmez un remplacement ou un retour à l’entrepôt.');
  }
  const date = formatDeliveryDate(payload.date);
  if (!date) return fail('Choisissez une date de nouvelle livraison valide.');
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timePattern.test(payload.startTime) || !timePattern.test(payload.endTime) || payload.endTime <= payload.startTime) {
    return fail('Le créneau doit se terminer après son heure de début.');
  }
  const address = payload.address.trim(), phone = payload.phone.trim(), city = payload.city.trim();
  if (!address || !city || !/^\+?[\d\s().-]+$/.test(phone) || !/^\d{9,15}$/.test(phone.replace(/\D/g, ''))) {
    return fail('Vérifiez l’adresse, la ville et le numéro de téléphone.');
  }
  if (isAddressFailure(delivery.failureReason || incident.type) && address.toLowerCase() === delivery.address.trim().toLowerCase()) {
    return fail('Corrigez l’adresse signalée comme incorrecte.');
  }
  const warehouse = WAREHOUSES.find((item) => item.id === payload.warehouseId);
  if (!warehouse?.zones.includes(payload.district)) return fail('Choisissez un entrepôt desservant le quartier de destination.');
  const destinationChanged = address !== delivery.address || payload.district !== delivery.district || city !== delivery.city;
  const coordinates = payload.coordinates || (!destinationChanged ? delivery.coordinates : undefined);
  if (!coordinates || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng) ||
    Math.abs(coordinates.lat) > 90 || Math.abs(coordinates.lng) > 180) {
    return fail('Renseignez les coordonnées GPS vérifiées de la destination corrigée.');
  }
  // New attempt, same BL. The old stop and its evidence remain attached to the old tour.
  const attempt = deliveries.filter((item) => item.orderId === delivery.orderId).length + 1;
  const id = `${delivery.orderId}-T${attempt}`;
  if (deliveries.some((item) => item.id === id || (item.orderId === delivery.orderId &&
    item.id !== deliveryId && !item.nextAttemptId && !['Échec', 'Retournée'].includes(item.status)))) {
    return fail('Une autre tentative existe déjà pour ce BL.');
  }
  const next = synchronizeDeliveryStatus({ ...delivery, id, previousAttemptId: delivery.id, nextAttemptId: undefined,
    address, phone, city, district: payload.district, coordinates, warehouseId: warehouse.id,
    deliveryDate: date, timeSlot: `${payload.startTime} – ${payload.endTime}`,
    status: 'À planifier', tourId: '', sequence: 0, driverId: '', driverName: 'Non affecté', vehicleId: '',
    arrivalTime: undefined, deliveryTime: undefined, proof: undefined,
    failureReason: undefined, failureComment: undefined, failurePhotoUrl: undefined,
    items: delivery.items.map((item) => ({ ...item, checked: false })) });
  return { success: true, message: `${delivery.orderId.replace(/^CMD-/, 'BL-')} : nouvelle tentative à planifier le ${date}.`,
    deliveries: [...deliveries.map((item) => item.id === deliveryId ? { ...item, nextAttemptId: id } : item), next],
    incident: { ...history, treatment: { ...history.treatment!, nextAttemptId: id },
      description: `${incident.description} · ${payload.action === 'replace' ? 'Remplacement confirmé' : 'Nouvelle tentative'} le ${date} (${payload.startTime} – ${payload.endTime}) : ${payload.note.trim()}` } };
};
