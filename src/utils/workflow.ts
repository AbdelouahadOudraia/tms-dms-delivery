import type { Delivery, Driver, Tour, Vehicle } from '../types';

export const getTimeSlotStartMinutes = (timeSlot: string) => {
  const match = timeSlot.match(/(\d{1,2}):(\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const sortDeliveriesByTimeSlot = (deliveries: Delivery[]) =>
  [...deliveries].sort(
    (first, second) =>
      getTimeSlotStartMinutes(first.timeSlot) - getTimeSlotStartMinutes(second.timeSlot) ||
      first.district.localeCompare(second.district, 'fr') ||
      first.id.localeCompare(second.id)
  );

export const isActiveTour = (tour: Tour) => !['Terminée', 'Annulée'].includes(tour.status);

export const getDriverTour = (tours: Tour[], driver: Driver) =>
  tours.find((tour) => tour.id === driver.currentTourId && tour.driverId === driver.id && isActiveTour(tour)) ||
  tours.find((tour) => tour.driverId === driver.id && isActiveTour(tour));

// A failed attempt stays on its original tour for the operational record, but
// leaves the driver's route list once a new attempt has been scheduled.
export const getVisibleDriverTourStops = (deliveries: Delivery[], tourId: string) =>
  deliveries.filter((delivery) => delivery.tourId === tourId && !delivery.nextAttemptId)
    .sort((first, second) => first.sequence - second.sequence);

export const canWorkDelivery = (delivery: Delivery | undefined, driverId: string, tours: Tour[]) =>
  Boolean(delivery && delivery.driverId === driverId &&
    tours.some((tour) => tour.id === delivery.tourId && tour.driverId === driverId && isActiveTour(tour)));

export const canFailDelivery = (delivery: Delivery) =>
  ['En route', 'Affectée', 'Arrivé', 'Livraison en cours'].includes(delivery.status);

export const getNextStop = (deliveries: Delivery[], current: Delivery) =>
  deliveries.filter((delivery) => delivery.tourId === current.tourId && delivery.id !== current.id &&
    delivery.sequence > current.sequence && ['Affectée', 'En route'].includes(delivery.status))
    .sort((a, b) => a.sequence - b.sequence)[0];

export const getAssignmentError = (
  tours: Tour[], driver: Driver | undefined, vehicle: Vehicle | undefined, tourId?: string
): string | null => {
  const target = tourId ? tours.find((tour) => tour.id === tourId) : undefined;
  if (tourId && (!target || !isActiveTour(target) || target.status === 'À clôturer')) {
    return 'Cette tournée ne peut plus être envoyée ou réaffectée.';
  }
  if (!driver || driver.status === 'Repos' ||
    (driver.status !== 'Disponible' && target?.driverId !== driver.id) ||
    tours.some((tour) => isActiveTour(tour) && tour.id !== tourId && tour.driverId === driver.id)) {
    return 'Le chauffeur sélectionné n’est plus disponible.';
  }
  if (!vehicle || vehicle.status === 'Maintenance' ||
    (vehicle.status !== 'Disponible' && target?.vehicleId !== vehicle.id) ||
    tours.some((tour) => isActiveTour(tour) && tour.id !== tourId && tour.vehicleId === vehicle.id)) {
    return 'Le véhicule sélectionné n’est plus disponible.';
  }
  return null;
};

export const getCloseTourError = (tour: Tour | undefined, deliveries: Delivery[]) => {
  if (!tour) return 'Tournée introuvable.';
  if (!isActiveTour(tour)) return 'Cette tournée est déjà terminée ou annulée.';
  const stops = deliveries.filter((delivery) => delivery.tourId === tour.id);
  if (!stops.length) return 'Impossible de clôturer une tournée sans livraison.';
  const remaining = stops.filter((delivery) => !['Validée', 'Échec', 'Retournée'].includes(delivery.status));
  return remaining.length ? `${remaining.length} livraison(s) doivent encore être traitées ou validées.` : null;
};

// Reuse the existing sequence slots: already handled stops must keep their position.
export const reorderRemainingStops = (deliveries: Delivery[], target: Delivery) => {
  const remaining = deliveries.filter((delivery) => delivery.tourId === target.tourId &&
    delivery.sequence > target.sequence && ['Affectée', 'En route'].includes(delivery.status));
  const slots = remaining.map((delivery) => delivery.sequence).sort((a, b) => a - b);
  return [...remaining].sort((a, b) => a.district.localeCompare(b.district) || a.sequence - b.sequence)
    .map((delivery, index) => ({ ...delivery, sequence: slots[index],
      status: index === 0 ? 'En route' as const : 'Affectée' as const }));
};
