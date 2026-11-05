import { useCompanySpace } from './CompanySpace';
import { useTransportSave } from '../hooks/useTransportSave';
import React, { createContext, useContext, useState } from 'react';
import {
  Delivery,
  FailedDeliveryTreatment,
  Tour,
  Driver,
  Vehicle,
  Incident,
  DeliveryStatus,
  TourStatus,
  ProofOfDelivery,
  DeliveryAddress,
  DeliveryZone,
  RouteOptimizationResult,
} from '../types';
import {
  INITIAL_DELIVERIES,
  INITIAL_TOURS,
  INITIAL_DRIVERS,
  INITIAL_VEHICLES,
  INITIAL_INCIDENTS,
  INITIAL_ADDRESSES,
  INITIAL_ZONES,
} from '../data/tmsMockData';
import { getDistrictsFromTourZone, getDeliveryWarehouse, getTourLoadError } from '../data/logisticsReference';
import { prepareFailedDeliveryTreatment, synchronizeDeliveryStatus } from '../utils/deliveryRecovery';
import { buildOperationalIncidents } from '../utils/operationalIncidents';
import { canFailDelivery, canWorkDelivery, getAssignmentError, getCloseTourError, getDriverTour, getNextStop, isActiveTour, reorderRemainingStops } from '../utils/workflow';
import { useSalesWorkflow, type SalesWorkflow } from '../hooks/useSalesWorkflow';

interface TmsContextType {
  // Data
  deliveries: Delivery[];
  tours: Tour[];
  drivers: Driver[];
  vehicles: Vehicle[];
  incidents: Incident[];
  addresses: DeliveryAddress[];
  zones: DeliveryZone[];
  lastRouteOptimization: RouteOptimizationResult | null;
  currentDriver: Driver;
  currentTour: Tour | undefined;
  activeDriverId: string;
  selectedDeliveryId: string;
  activeViewMode: 'backoffice' | 'driver' | 'split';
  workflowSettings: WorkflowSettings;
  sales: SalesWorkflow;

  // Navigation & View controls
  setActiveViewMode: (mode: 'backoffice' | 'driver' | 'split') => void;
  setActiveDriverId: (id: string) => void;
  setSelectedDeliveryId: (id: string) => void;
  backofficeTab: string;
  setBackofficeTab: (tab: string) => void;
  planningSelectionIds: string[];
  setPlanningSelectionIds: (ids: string[]) => void;
  driverScreen: string;
  setDriverScreen: (screen: string) => void;
  updateWorkflowSettings: (settings: WorkflowSettings) => void;

  // Actions
  createTour: (payload: {
    date: string;
    zone: string;
    departureTime: string;
    estimatedEndTime: string;
    driverId: string;
    vehicleId: string;
    deliveryIds: string[];
  }) => Tour;
  dispatchTour: (tourId: string, driverId: string, vehicleId: string) => void;
  markArrived: (deliveryId: string, time?: string) => boolean;
  verifyDeliveryItems: (deliveryId: string, itemIds: string[]) => boolean;
  confirmDeliveryPOD: (
    deliveryId: string,
    proofData: {
      photoUrl: string;
      signatureData?: string;
      recipientName: string;
      driverNotes?: string;
    }
  ) => boolean;
  failDelivery: (
    deliveryId: string,
    reason: string,
    comment: string,
    photoUrl?: string
  ) => boolean;
  recalculateRoute: (
    deliveryId: string,
    incidentType: string,
    reason: string,
    comment?: string
  ) => RouteOptimizationResult | null;
  confirmDeliveryOrder: (deliveryId: string) => void;
  validateDelivery: (deliveryId: string) => void;
  rejectDelivery: (deliveryId: string, reason: string, comment: string) => void;
  closeTour: (tourId: string) => { success: boolean; message: string };
  resolveIncident: (incidentId: string, resolution: string) => void;
  replanifyFailedDelivery: (
    incidentId: string,
    deliveryId: string,
    payload: FailedDeliveryTreatment
  ) => { success: boolean; message: string };
  addDriver: (driver: Omit<Driver, 'id'>) => Driver;
  addVehicle: (vehicle: Vehicle) => Vehicle;
  addAddress: (address: Omit<DeliveryAddress, 'id'>) => DeliveryAddress;
  addZone: (zone: Omit<DeliveryZone, 'id'>) => DeliveryZone;
  resetDemoData: () => void;
}

const TmsContext = createContext<TmsContextType | undefined>(undefined);

export interface WorkflowSettings {
  hubName: string;
  requirePhoto: boolean;
  requireSignature: boolean;
  gpsTolerance: number;
  delayThreshold: number;
  autoNotifyCustomer: boolean;
}

const DEFAULT_WORKFLOW_SETTINGS: WorkflowSettings = {
  hubName: 'Hub Central Casablanca - Ain Sebaa',
  requirePhoto: true,
  requireSignature: true,
  gpsTolerance: 50,
  delayThreshold: 15,
  autoNotifyCustomer: true,
};

const isClosedDeliveryStatus = (status: DeliveryStatus) =>
  status === 'À valider' ||
  status === 'Validée' ||
  status === 'Échec' ||
  status === 'Rejetée' ||
  status === 'Retournée';

const resolveTourStatus = (
  status: TourStatus,
  completedCount: number,
  deliveriesCount: number
): TourStatus => {
  const allStopsHandled = deliveriesCount > 0 && completedCount >= deliveriesCount;
  if (allStopsHandled && (status === 'En cours' || status === 'Affectée')) return 'À clôturer';
  return status;
};

const synchronizeTourCounters = (tours: Tour[], deliveries: Delivery[]) =>
  tours.map((tour) => {
    const tourDeliveries = deliveries.filter((delivery) => delivery.tourId === tour.id);
    const completedCount = tourDeliveries.filter((delivery) => isClosedDeliveryStatus(delivery.status)).length;
    return {
      ...tour,
      deliveriesCount: tourDeliveries.length,
      completedCount,
      status: resolveTourStatus(tour.status, completedCount, tourDeliveries.length),
    };
  });

const normalizeDeliverySequences = (deliveries: Delivery[]) => {
  const normalizedSequenceById = new Map<string, number>();
  const tourIds = Array.from(
    new Set(deliveries.map((delivery) => delivery.tourId).filter(Boolean))
  );

  tourIds.forEach((tourId) => {
    deliveries
      .filter((delivery) => delivery.tourId === tourId)
      .sort((first, second) => first.sequence - second.sequence || first.id.localeCompare(second.id))
      .forEach((delivery, index) => normalizedSequenceById.set(delivery.id, index + 1));
  });

  return deliveries.map((delivery) => ({
    ...delivery,
    sequence: normalizedSequenceById.get(delivery.id) ?? delivery.sequence,
  }));
};

const NORMALIZED_INITIAL_DELIVERIES = normalizeDeliverySequences(INITIAL_DELIVERIES).map((delivery) => synchronizeDeliveryStatus({
  ...delivery,
  deliveryDate: delivery.deliveryDate || INITIAL_TOURS.find((tour) => tour.id === delivery.tourId)?.date,
  warehouseId: getDeliveryWarehouse(delivery)?.id,
}));

const getCurrentTime = () =>
  new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export const TmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { company, initial } = useCompanySpace();
  const seed = company.demo;
  const stored = initial.data;
  const [deliveries, updateDeliveries] = useState<Delivery[]>(stored?.deliveries ?? (seed ? NORMALIZED_INITIAL_DELIVERIES : []));
  const setDeliveries = (update: React.SetStateAction<Delivery[]>) => updateDeliveries((previous) =>
    (typeof update === 'function' ? update(previous) : update).map(synchronizeDeliveryStatus));
  const [tours, setTours] = useState<Tour[]>(() =>
    stored?.tours ?? (seed ? synchronizeTourCounters(INITIAL_TOURS, NORMALIZED_INITIAL_DELIVERIES) : [])
  );
  const [drivers, setDrivers] = useState<Driver[]>(stored?.drivers ?? (seed ? INITIAL_DRIVERS : []));
  const [vehicles, setVehicles] = useState<Vehicle[]>(stored?.vehicles ?? (seed ? INITIAL_VEHICLES : []));
  const [incidents, setIncidents] = useState<Incident[]>(stored?.incidents ?? (seed ? INITIAL_INCIDENTS : []));
  const [addresses, setAddresses] = useState<DeliveryAddress[]>(stored?.addresses ?? (seed ? INITIAL_ADDRESSES as unknown as DeliveryAddress[] : []));
  const [zones, setZones] = useState<DeliveryZone[]>(stored?.zones ?? (seed ? INITIAL_ZONES as unknown as DeliveryZone[] : []));
  const [lastRouteOptimization, setLastRouteOptimization] = useState<RouteOptimizationResult | null>(null);
  const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettings>(stored?.workflowSettings ?? { ...DEFAULT_WORKFLOW_SETTINGS, hubName: seed ? DEFAULT_WORKFLOW_SETTINGS.hubName : company.name });
  const transport = React.useMemo(() => ({ deliveries, tours, drivers, vehicles, incidents, addresses, zones, workflowSettings }),
    [deliveries, tours, drivers, vehicles, incidents, addresses, zones, workflowSettings]);
  useTransportSave(transport);
  const sales = useSalesWorkflow(deliveries, (bls) => setDeliveries((previous) => {
    const known = new Set(previous.map((delivery) => delivery.id));
    return [...bls.filter((delivery) => !known.has(delivery.id)), ...previous];
  }));

  // Active Driver & Tour for simulation
  const [activeDriverId, updateActiveDriverId] = useState(drivers[0]?.id || '');
  const currentDriver = drivers.find((driver) => driver.id === activeDriverId) || drivers[0];
  const currentTour = currentDriver ? getDriverTour(tours, currentDriver) : undefined;

  // Selected delivery for inspector/detail
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>('CMD-45821');

  // Navigation view mode
  const [activeViewMode, setActiveViewMode] = useState<'backoffice' | 'driver' | 'split'>(
    'backoffice'
  );
  const [backofficeTab, setBackofficeTab] = useState<string>('sales');
  const [planningSelectionIds, setPlanningSelectionIds] = useState<string[]>([]);
  const [driverScreen, setDriverScreen] = useState<string>('home'); // login, home, deliveries, detail, arrival, items, pod, success, failed, history, profile

  const setActiveDriverId = (id: string) => {
    const driver = drivers.find((item) => item.id === id);
    if (!driver) return;
    updateActiveDriverId(id);
    const tour = getDriverTour(tours, driver);
    const stop = tour ? deliveries.filter((item) => item.tourId === tour.id && item.driverId === id)
      .sort((a, b) => a.sequence - b.sequence).find((item) => !isClosedDeliveryStatus(item.status)) : undefined;
    setSelectedDeliveryId(stop?.id || '');
    setLastRouteOptimization(null);
    setDriverScreen('home');
  };

  // Backoffice creates a new tour from existing planned deliveries
  const createTour = (payload: {
    date: string;
    zone: string;
    departureTime: string;
    estimatedEndTime: string;
    driverId: string;
    vehicleId: string;
    deliveryIds: string[];
  }) => {
    const driver = drivers.find((d) => d.id === payload.driverId);
    const vehicle = vehicles.find((v) => v.id === payload.vehicleId);
    const assignmentError = getAssignmentError(tours, driver, vehicle);
    if (assignmentError) throw new Error(assignmentError);
    if (!driver || !vehicle) throw new Error('Ressources introuvables.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.departureTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.estimatedEndTime) ||
      payload.estimatedEndTime <= payload.departureTime) {
      throw new Error('La fin estimée doit être après le départ, le même jour.');
    }
    if (new Set(payload.deliveryIds).size !== payload.deliveryIds.length) {
      throw new Error('Un BL ne peut figurer qu’une seule fois dans la tournée.');
    }
    if (payload.deliveryIds.length === 0) {
      throw new Error('Sélectionnez au moins un BL.');
    }

    const zoneDistricts = getDistrictsFromTourZone(payload.zone);
    const eligibleDeliveryIds = payload.deliveryIds.filter((deliveryId) => {
      const delivery = deliveries.find((item) => item.id === deliveryId);
      return (
        delivery &&
        delivery.status === 'À planifier' &&
        !delivery.tourId &&
        !delivery.driverId &&
        delivery.deliveryDate === payload.date &&
        zoneDistricts.includes(delivery.district.toLowerCase())
      );
    });
    if (eligibleDeliveryIds.length !== payload.deliveryIds.length) {
      throw new Error(
        `${payload.deliveryIds.length - eligibleDeliveryIds.length} BL ne correspondent plus à la date ou à la zone sélectionnée.`
      );
    }
    const loadError = getTourLoadError(deliveries.filter((item) => eligibleDeliveryIds.includes(item.id)), vehicle, payload.zone);
    if (loadError) throw new Error(loadError);
    const nextNumber =
      Math.max(
        ...tours
          .map((tour) => Number(tour.id.replace('TR-2026-', '')))
          .filter((value) => Number.isFinite(value)),
        0
      ) + 1;
    const newTour: Tour = {
      id: `TR-2026-${String(nextNumber).padStart(3, '0')}`,
      date: payload.date,
      driverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone,
      vehicleId: vehicle.id,
      vehicleModel: vehicle.model,
      deliveriesCount: eligibleDeliveryIds.length,
      completedCount: 0,
      departureTime: payload.departureTime,
      estimatedEndTime: payload.estimatedEndTime,
      status: 'Affectée',
      zone: payload.zone,
    };

    setTours((prev) => [newTour, ...prev]);
    setDeliveries((prev) =>
      prev.map((delivery) => {
        const sequenceIndex = eligibleDeliveryIds.indexOf(delivery.id);
        if (sequenceIndex === -1) return delivery;

        return {
          ...delivery,
          tourId: newTour.id,
          sequence: sequenceIndex + 1,
          driverId: driver.id,
          driverName: driver.name,
          vehicleId: vehicle.id,
          status: 'Affectée' as DeliveryStatus,
        };
      })
    );
    setDrivers((prev) =>
      prev.map((item) =>
        item.id === driver.id
          ? { ...item, status: 'En tournée', currentTourId: newTour.id }
          : item
      )
    );
    setVehicles((prev) =>
      prev.map((item) =>
        item.id === vehicle.id
          ? { ...item, status: 'En service', assignedDriverId: driver.id }
          : item
      )
    );

    return newTour;
  };

  // Dispatch Tour from Backoffice
  const dispatchTour = (tourId: string, driverId: string, vehicleId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const targetTour = tours.find((tour) => tour.id === tourId);
    const assignmentError = getAssignmentError(tours, driver, vehicle, tourId);
    if (assignmentError) throw new Error(assignmentError);
    if (!driver || !vehicle || !targetTour) throw new Error('Tournée ou ressources introuvables.');

    const loadError = getTourLoadError(deliveries.filter((item) => item.tourId === tourId && !isClosedDeliveryStatus(item.status)), vehicle);
    if (loadError) throw new Error(loadError);

    setTours((prev) =>
      prev.map((t) => {
        if (t.id === tourId) {
          return {
            ...t,
            driverId,
            driverName: driver ? driver.name : t.driverName,
            driverPhone: driver ? driver.phone : t.driverPhone,
            vehicleId,
            vehicleModel: vehicle ? vehicle.model : t.vehicleModel,
            status: 'En cours',
          };
        }
        return t;
      })
    );

    // Update tour's deliveries status to 'Affectée' or 'En route'
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.tourId === tourId && !isClosedDeliveryStatus(d.status)) {
          return {
            ...d,
            status:
              d.status === 'À planifier' || d.status === 'Planifiée'
                ? ('Affectée' as DeliveryStatus)
                : d.status,
            driverId,
            driverName: driver ? driver.name : d.driverName,
            vehicleId,
          };
        }
        return d;
      })
    );
    setDrivers((prev) =>
      prev.map((item) =>
        item.id === targetTour?.driverId && item.id !== driverId
          ? { ...item, status: 'Disponible', currentTourId: undefined }
          : item.id === driverId
          ? { ...item, status: 'En tournée', currentTourId: tourId }
          : item
      )
    );
    setVehicles((prev) =>
      prev.map((item) =>
        item.id === targetTour?.vehicleId && item.id !== vehicleId
          ? { ...item, status: 'Disponible', assignedDriverId: undefined }
          : item.id === vehicleId
          ? { ...item, status: 'En service', assignedDriverId: driverId }
          : item
      )
    );
  };

  // Driver marks "Je suis arrivé"
  const markArrived = (deliveryId: string, time: string = getCurrentTime()) => {
    const target = deliveries.find((delivery) => delivery.id === deliveryId);
    if (!canWorkDelivery(target, activeDriverId, tours) || !target || !['En route', 'Affectée'].includes(target.status)) return false;
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id === deliveryId && (d.status === 'En route' || d.status === 'Affectée')) {
          return {
            ...d,
            arrivalTime: time,
            status: 'Arrivé' as DeliveryStatus,
          };
        }
        return d;
      })
    );
    return true;
  };

  // Driver verifies items
  const verifyDeliveryItems = (deliveryId: string, itemIds: string[]) => {
    const target = deliveries.find((delivery) => delivery.id === deliveryId);
    if (!canWorkDelivery(target, activeDriverId, tours) || !target ||
      !['Arrivé', 'Livraison en cours', 'Rejetée'].includes(target.status) || !target.items.length ||
      !target.items.every((item) => itemIds.includes(item.id))) return false;
    setDeliveries((prev) =>
      prev.map((d) => {
        const everyItemChecked =
          d.items.length > 0 && d.items.every((item) => itemIds.includes(item.id));
        if (d.id === deliveryId && ['Arrivé', 'Livraison en cours', 'Rejetée'].includes(d.status) && everyItemChecked) {
          return {
            ...d,
            status: d.status === 'Rejetée' ? 'Rejetée' : 'Livraison en cours' as DeliveryStatus,
            items: d.items.map((it) => ({
              ...it,
              checked: itemIds.includes(it.id),
            })),
          };
        }
        return d;
      })
    );
    return true;
  };

  // Driver submits Proof of Delivery (e-POD) -> status becomes "À valider"
  const confirmDeliveryPOD = (
    deliveryId: string,
    proofData: {
      photoUrl: string;
      signatureData?: string;
      recipientName: string;
      driverNotes?: string;
    }
  ) => {
    const now = getCurrentTime();
    const submittedDelivery = deliveries.find((d) => d.id === deliveryId);
    const canSubmit =
      submittedDelivery &&
      canWorkDelivery(submittedDelivery, activeDriverId, tours) &&
      (submittedDelivery.status === 'Livraison en cours' || submittedDelivery.status === 'Rejetée') &&
      submittedDelivery.items.length > 0 && submittedDelivery.items.every((item) => item.checked) &&
      (!workflowSettings.requirePhoto || Boolean(proofData.photoUrl.trim())) &&
      (!workflowSettings.requireSignature || Boolean(proofData.signatureData)) &&
      Boolean(proofData.recipientName.trim());
    if (!canSubmit) return false;
    const isRejectedProofCorrection = submittedDelivery.status === 'Rejetée';
    const nextDelivery = isRejectedProofCorrection ? undefined : getNextStop(deliveries, submittedDelivery);

    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id === deliveryId) {
          const newProof: ProofOfDelivery = {
            photoUrl: proofData.photoUrl,
            photoTimestamp: `${now}:00`,
            hasSignature: Boolean(proofData.signatureData),
            signatureData: proofData.signatureData,
            signatureTimestamp: `${now}:00`,
            recipientName: proofData.recipientName.trim(),
            driverNotes: proofData.driverNotes,
            gpsCoordinates: d.coordinates,
            gpsAccuracy: `± 8 m (tolérance ${workflowSettings.gpsTolerance} m)`,
            timestamp: `${now}:00`,
          };
          return {
            ...d,
            status: 'À valider' as DeliveryStatus,
            deliveryTime: now,
            proof: newProof,
          };
        }
        if (nextDelivery && d.id === nextDelivery.id) {
          return {
            ...d,
            status: 'En route' as DeliveryStatus,
          };
        }
        return d;
      })
    );

    if (isRejectedProofCorrection) {
      setIncidents((prev) =>
        prev.map((incident) =>
          incident.deliveryId === deliveryId &&
          incident.type === 'Preuve rejetée par le backoffice' &&
          !incident.resolved
            ? {
                ...incident,
                resolved: true,
                status: 'Résolu',
                description: `${incident.description} · Preuve corrigée et renvoyée par le chauffeur à ${now}.`,
              }
            : incident
        )
      );
    }

    // Update tour counters
    setTours((prev) =>
      prev.map((t) => {
        if (submittedDelivery && t.id === submittedDelivery.tourId) {
          const tourDeliveries = deliveries.map((delivery) =>
            delivery.id === deliveryId
              ? { ...delivery, status: 'À valider' as DeliveryStatus }
              : delivery
          );
          const completedCount = tourDeliveries.filter(
            (delivery) => delivery.tourId === t.id && isClosedDeliveryStatus(delivery.status)
          ).length;

          return {
            ...t,
            completedCount,
            status: resolveTourStatus(t.status, completedCount, t.deliveriesCount),
          };
        }
        return t;
      })
    );
    return true;
  };

  // Driver fails delivery
  const failDelivery = (
    deliveryId: string,
    reason: string,
    comment: string,
    photoUrl?: string
  ) => {
    const target = deliveries.find((d) => d.id === deliveryId);
    if (!target || !canWorkDelivery(target, activeDriverId, tours) || !canFailDelivery(target) || !reason.trim()) return false;
    const nextDelivery = getNextStop(deliveries, target);

    setDeliveries((prev) =>
      prev.map((d) => {
        if (
          d.id === deliveryId &&
          ['En route', 'Affectée', 'Arrivé', 'Livraison en cours'].includes(d.status)
        ) {
          return {
            ...d,
            status: 'Échec' as DeliveryStatus,
            failureReason: reason,
            failureComment: comment,
            failurePhotoUrl: photoUrl,
          };
        }
        if (nextDelivery && d.id === nextDelivery.id) {
          return { ...d, status: 'En route' as DeliveryStatus };
        }
        return d;
      })
    );

    const targetTourId = deliveries.find((d) => d.id === deliveryId)?.tourId;
    if (targetTourId) {
      setTours((prev) =>
        prev.map((t) => {
          if (t.id !== targetTourId) return t;
          const completedCount = deliveries.filter(
            (delivery) =>
              delivery.tourId === targetTourId &&
              (delivery.id === deliveryId || isClosedDeliveryStatus(delivery.status))
          ).length;
          return {
            ...t,
            completedCount,
            status: resolveTourStatus(t.status, completedCount, t.deliveriesCount),
          };
        })
      );
    }

    // Add incident
    if (target) {
      const newInc: Incident = {
        id: `INC-${crypto.randomUUID()}`,
        deliveryId: target.id,
        tourId: target.tourId,
        customerName: target.customerName,
        driverName: target.driverName,
        type: reason,
        description: comment || `Échec déclaré : ${reason}`,
        timestamp: getCurrentTime(),
        resolved: false,
      };
      setIncidents((prev) => [newInc, ...prev]);
    }
    return true;
  };



  // Mock route recalculation after client call incident
  const recalculateRoute = (
    deliveryId: string,
    incidentType: string,
    reason: string,
    comment: string = ''
  ) => {
    const target = deliveries.find((d) => d.id === deliveryId);
    if (!target || !canWorkDelivery(target, activeDriverId, tours) || !canFailDelivery(target)) return null;

    const remainingStops = reorderRemainingStops(deliveries, target);

    const incidentId = `INC-${crypto.randomUUID()}`;
    const optimization: RouteOptimizationResult = {
      deliveryId,
      incidentId,
      reorderedStops: remainingStops.length,
      newEta: '13:42',
      remainingDistance: '18,4 km',
      message: 'Tournée recalculée',
    };

    const newIncident: Incident = {
      id: incidentId,
      deliveryId: target.id,
      tourId: target.tourId,
      customerName: target.customerName,
      driverName: target.driverName,
      type: incidentType,
      description: comment || reason,
      timestamp: getCurrentTime(),
      resolved: false,
      status: 'Nouveau',
      severity: incidentType === 'Refus client' ? 'Bloquant' : 'Information',
    };

    setDeliveries((prev) => {
      return prev.map((delivery) => {
        if (delivery.id === deliveryId) {
          return {
            ...delivery,
            status: 'Échec' as DeliveryStatus,
            deliveryStatus: 'Échec de livraison',
            podStatus: 'À collecter',
            failureReason: incidentType,
            failureComment: comment || reason,
          };
        }

        return remainingStops.find((stop) => stop.id === delivery.id) || delivery;
      });
    });

    setTours((prev) =>
      prev.map((tour) => {
        if (tour.id !== target.tourId) return tour;
        return {
          ...tour,
          completedCount: Math.min(tour.deliveriesCount, tour.completedCount + 1),
          status: resolveTourStatus(
            tour.status,
            Math.min(tour.deliveriesCount, tour.completedCount + 1),
            tour.deliveriesCount
          ),
          estimatedEndTime: '13:42',
        };
      })
    );

    setIncidents((prev) => [newIncident, ...prev]);
    setLastRouteOptimization(optimization);
    return optimization;
  };

  const confirmDeliveryOrder = (deliveryId: string) => {
    setDeliveries((prev) =>
      prev.map((delivery) => {
        if (delivery.id !== deliveryId || delivery.status !== 'À confirmer' || delivery.tourId || delivery.driverId) return delivery;

        return {
          ...delivery,
          status: 'À planifier' as DeliveryStatus,
          tourId: '',
          sequence: 0,
          driverId: '',
          driverName: 'Non affecté',
          vehicleId: '',
        };
      })
    );
  };

  // Backoffice validates delivery -> status becomes "Validée"
  const validateDelivery = (deliveryId: string) => {
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id === deliveryId && d.status === 'À valider' && d.proof) {
          return {
            ...d,
            status: 'Validée' as DeliveryStatus,
            proof: d.proof
              ? {
                  ...d.proof,
                  validationTimestamp: new Date().toISOString(),
                  validatedBy: 'Karim Dispatcher (Superviseur)',
                }
              : undefined,
          };
        }
        return d;
      })
    );
  };

  // Backoffice rejects delivery -> status becomes "Rejetée"
  const rejectDelivery = (deliveryId: string, reason: string, comment: string) => {
    const target = deliveries.find((delivery) => delivery.id === deliveryId);
    if (!target || target.status !== 'À valider' || !target.proof || !reason.trim()) return;
    setIncidents((prev) => [{
      id: `INC-${crypto.randomUUID()}`, deliveryId: target.id, tourId: target.tourId,
      customerName: target.customerName, driverName: target.driverName,
      type: 'Preuve rejetée par le backoffice', description: `${reason} : ${comment}`,
      timestamp: getCurrentTime(), resolved: false, status: 'Nouveau', severity: 'Bloquant',
    }, ...prev]);
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id === deliveryId && d.status === 'À valider' && d.proof) {
          return {
            ...d,
            status: 'Rejetée' as DeliveryStatus,
            proof: d.proof
              ? {
                  ...d.proof,
                  rejectionReason: reason,
                  rejectionComment: comment,
                  validationTimestamp: new Date().toISOString(),
                  validatedBy: 'Karim Dispatcher (Superviseur)',
                }
              : undefined,
          };
        }
        return d;
      })
    );
  };

  const closeTour = (tourId: string) => {
    const tour = tours.find((item) => item.id === tourId);
    const error = getCloseTourError(tour, deliveries);
    if (error || !tour) return { success: false, message: error || 'Tournée introuvable.' };

    setTours((prev) =>
      prev.map((item) => (item.id === tourId ? { ...item, status: 'Terminée' } : item))
    );
    setDrivers((prev) =>
      prev.map((item) =>
        item.id === tour.driverId && !tours.some((other) => other.id !== tourId && isActiveTour(other) && other.driverId === item.id)
          ? { ...item, status: 'Disponible', currentTourId: undefined }
          : item
      )
    );
    setVehicles((prev) =>
      prev.map((item) =>
        item.id === tour.vehicleId && !tours.some((other) => other.id !== tourId && isActiveTour(other) && other.vehicleId === item.id)
          ? { ...item, status: 'Disponible', assignedDriverId: undefined }
          : item
      )
    );
    return { success: true, message: `Tournée ${tourId} clôturée.` };
  };

  const resolveIncident = (incidentId: string, resolution: string) => {
    const target = buildOperationalIncidents(incidents, deliveries).find((incident) => incident.id === incidentId);
    if (!target || target.resolved || !resolution.trim()) return;
    setIncidents((prev) =>
      (prev.some((incident) => incident.id === incidentId) ? prev : [target, ...prev]).map((incident) =>
        incident.id === incidentId
          ? {
              ...incident,
              resolved: true,
              status: 'Résolu',
              description: `${incident.description} · Résolution : ${resolution}`,
            }
          : incident
      )
    );
  };

  const replanifyFailedDelivery = (
    incidentId: string, deliveryId: string, payload: FailedDeliveryTreatment
  ) => {
    const incident = buildOperationalIncidents(incidents, deliveries).find((item) => item.id === incidentId);
    const result = prepareFailedDeliveryTreatment(deliveries, incident, deliveryId, payload, new Date().toISOString());
    if (!result.success) return result;
    setDeliveries(result.deliveries);
    setIncidents((previous) => previous.some((item) => item.id === incidentId)
      ? previous.map((item) => item.id === incidentId ? result.incident : item)
      : [result.incident, ...previous]);
    return { success: true, message: result.message };
  };

  const addDriver = (payload: Omit<Driver, 'id'>) => {
    const driver: Driver = {
      ...payload,
      id: `DRV-${String(drivers.length + 1).padStart(3, '0')}`,
    };
    setDrivers((prev) => [...prev, driver]);
    return driver;
  };

  const addVehicle = (vehicle: Vehicle) => {
    setVehicles((prev) => [...prev, vehicle]);
    return vehicle;
  };

  const addAddress = (payload: Omit<DeliveryAddress, 'id'>) => {
    const address: DeliveryAddress = {
      ...payload,
      id: `ADR-${String(addresses.length + 1).padStart(3, '0')}`,
    };
    setAddresses((prev) => [...prev, address]);
    return address;
  };

  const addZone = (payload: Omit<DeliveryZone, 'id'>) => {
    const zone: DeliveryZone = {
      ...payload,
      id: `ZONE-${String(zones.length + 1).padStart(3, '0')}`,
    };
    setZones((prev) => [...prev, zone]);
    return zone;
  };

  // Reset demo
  const resetDemoData = () => {
    if (!seed) return;
    sales.setSelectionIds([]);
    if (backofficeTab === 'sales' || backofficeTab === 'sales-generate') setBackofficeTab('orders');
    setDeliveries([...NORMALIZED_INITIAL_DELIVERIES, ...sales.generatedBls]);
    setTours(synchronizeTourCounters(INITIAL_TOURS, NORMALIZED_INITIAL_DELIVERIES));
    setIncidents(INITIAL_INCIDENTS);
    setDrivers(INITIAL_DRIVERS);
    setVehicles(INITIAL_VEHICLES);
    setAddresses(INITIAL_ADDRESSES as unknown as DeliveryAddress[]);
    setZones(INITIAL_ZONES as unknown as DeliveryZone[]);
    setLastRouteOptimization(null);
    setWorkflowSettings(DEFAULT_WORKFLOW_SETTINGS);
    updateActiveDriverId(INITIAL_DRIVERS[0].id);
    setDriverScreen('home');
    setSelectedDeliveryId('CMD-45821');
    setPlanningSelectionIds([]);
  };

  return (
    <TmsContext.Provider
      value={{
        deliveries,
        tours,
        drivers,
        vehicles,
        incidents,
        addresses,
        zones,
        lastRouteOptimization,
        currentDriver,
        currentTour,
        activeDriverId,
        selectedDeliveryId,
        activeViewMode,
        workflowSettings,
        sales,
        setActiveViewMode,
        setActiveDriverId,
        setSelectedDeliveryId,
        backofficeTab,
        setBackofficeTab,
        planningSelectionIds,
        setPlanningSelectionIds,
        driverScreen,
        setDriverScreen,
        updateWorkflowSettings: setWorkflowSettings,
        createTour,
        dispatchTour,
        markArrived,
        verifyDeliveryItems,
        confirmDeliveryPOD,
        failDelivery,
        recalculateRoute,
        confirmDeliveryOrder,
        validateDelivery,
        rejectDelivery,
        closeTour,
        resolveIncident,
        replanifyFailedDelivery,
        addDriver,
        addVehicle,
        addAddress,
        addZone,
        resetDemoData,
      }}
    >
      {children}
    </TmsContext.Provider>
  );
};

export const useTms = () => {
  const context = useContext(TmsContext);
  if (!context) {
    throw new Error('useTms must be used within a TmsProvider');
  }
  return context;
};
