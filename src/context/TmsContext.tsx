import React, { createContext, useContext, useState } from 'react';
import {
  Delivery,
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
  currentTour: Tour;
  selectedDeliveryId: string;
  activeViewMode: 'backoffice' | 'driver' | 'split';

  // Navigation & View controls
  setActiveViewMode: (mode: 'backoffice' | 'driver' | 'split') => void;
  setSelectedDeliveryId: (id: string) => void;
  backofficeTab: string;
  setBackofficeTab: (tab: string) => void;
  driverScreen: string;
  setDriverScreen: (screen: string) => void;

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
  markArrived: (deliveryId: string, time?: string) => void;
  verifyDeliveryItems: (deliveryId: string, itemIds: string[]) => void;
  confirmDeliveryPOD: (
    deliveryId: string,
    proofData: {
      photoUrl: string;
      signatureData?: string;
      recipientName: string;
      driverNotes?: string;
    }
  ) => void;
  failDelivery: (
    deliveryId: string,
    reason: string,
    comment: string,
    photoUrl?: string
  ) => void;
  recalculateRoute: (
    deliveryId: string,
    incidentType: string,
    reason: string,
    comment?: string
  ) => RouteOptimizationResult | null;
  confirmDeliveryOrder: (deliveryId: string) => void;
  validateDelivery: (deliveryId: string) => void;
  rejectDelivery: (deliveryId: string, reason: string, comment: string) => void;
  addDriver: (driver: Omit<Driver, 'id'>) => Driver;
  addVehicle: (vehicle: Vehicle) => Vehicle;
  addAddress: (address: Omit<DeliveryAddress, 'id'>) => DeliveryAddress;
  addZone: (zone: Omit<DeliveryZone, 'id'>) => DeliveryZone;
  resetDemoData: () => void;
}

const TmsContext = createContext<TmsContextType | undefined>(undefined);

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

export const TmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>(INITIAL_DELIVERIES);
  const [tours, setTours] = useState<Tour[]>(() => synchronizeTourCounters(INITIAL_TOURS, INITIAL_DELIVERIES));
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>(INITIAL_ADDRESSES as unknown as DeliveryAddress[]);
  const [zones, setZones] = useState<DeliveryZone[]>(INITIAL_ZONES as unknown as DeliveryZone[]);
  const [lastRouteOptimization, setLastRouteOptimization] = useState<RouteOptimizationResult | null>(null);

  // Active Driver & Tour for simulation
  const currentDriver = drivers[0]; // Youssef El Amrani
  const currentTour = tours.find((t) => t.id === 'TR-2026-058') || tours[0];

  // Selected delivery for inspector/detail
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>('CMD-45821');

  // Navigation view mode
  const [activeViewMode, setActiveViewMode] = useState<'backoffice' | 'driver' | 'split'>(
    'split'
  );
  const [backofficeTab, setBackofficeTab] = useState<string>('dashboard');
  const [driverScreen, setDriverScreen] = useState<string>('home'); // login, home, deliveries, detail, arrival, items, pod, success, failed, history, profile

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
    const driver = drivers.find((d) => d.id === payload.driverId) || drivers[0];
    const vehicle = vehicles.find((v) => v.id === payload.vehicleId) || vehicles[0];
    const zoneDistricts = payload.zone
      .match(/\(([^)]+)\)/)?.[1]
      .split(',')
      .map((district) => district.trim().toLowerCase()) || [];
    const eligibleDeliveryIds = payload.deliveryIds.filter((deliveryId) => {
      const delivery = deliveries.find((item) => item.id === deliveryId);
      return (
        delivery &&
        delivery.status === 'À planifier' &&
        !delivery.tourId &&
        delivery.deliveryDate === payload.date &&
        zoneDistricts.includes(delivery.district.toLowerCase())
      );
    });
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

    return newTour;
  };

  // Dispatch Tour from Backoffice
  const dispatchTour = (tourId: string, driverId: string, vehicleId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);

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
            departureTime: '08:30',
          };
        }
        return t;
      })
    );

    // Update tour's deliveries status to 'Affectée' or 'En route'
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.tourId === tourId && (d.status === 'À planifier' || d.status === 'Planifiée')) {
          return {
            ...d,
            status: 'Affectée',
            driverId,
            driverName: driver ? driver.name : d.driverName,
            vehicleId,
          };
        }
        return d;
      })
    );
  };

  // Driver marks "Je suis arrivé"
  const markArrived = (deliveryId: string, time: string = '10:32') => {
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id === deliveryId) {
          return {
            ...d,
            arrivalTime: time,
            status: 'Arrivé' as DeliveryStatus,
          };
        }
        return d;
      })
    );
  };

  // Driver verifies items
  const verifyDeliveryItems = (deliveryId: string, itemIds: string[]) => {
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id === deliveryId) {
          return {
            ...d,
            status: 'Livraison en cours' as DeliveryStatus,
            items: d.items.map((it) => ({
              ...it,
              checked: itemIds.includes(it.id),
            })),
          };
        }
        return d;
      })
    );
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
    const now = '10:42';
    const submittedDelivery = deliveries.find((d) => d.id === deliveryId);
    const nextDelivery = submittedDelivery
      ? deliveries
          .filter(
            (d) =>
              d.tourId === submittedDelivery.tourId &&
              d.sequence > submittedDelivery.sequence &&
              (d.status === 'Affectée' || d.status === 'Planifiée' || d.status === 'À planifier')
          )
          .sort((a, b) => a.sequence - b.sequence)[0]
      : undefined;

    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id === deliveryId) {
          const newProof: ProofOfDelivery = {
            photoUrl: proofData.photoUrl,
            photoTimestamp: '10:38:14',
            hasSignature: true,
            signatureData: proofData.signatureData,
            signatureTimestamp: '10:40:00',
            recipientName: proofData.recipientName || d.customerName,
            driverNotes: proofData.driverNotes,
            gpsCoordinates: d.coordinates,
            gpsAccuracy: '± 8 m (Conforme)',
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
  };

  // Driver fails delivery
  const failDelivery = (
    deliveryId: string,
    reason: string,
    comment: string,
    photoUrl?: string
  ) => {
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id === deliveryId) {
          return {
            ...d,
            status: 'Échec' as DeliveryStatus,
            failureReason: reason,
            failureComment: comment,
            failurePhotoUrl: photoUrl,
          };
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
    const target = deliveries.find((d) => d.id === deliveryId);
    if (target) {
      const newInc: Incident = {
        id: `INC-${Date.now().toString().slice(-4)}`,
        deliveryId: target.id,
        tourId: target.tourId,
        customerName: target.customerName,
        driverName: target.driverName,
        type: reason,
        description: comment || `Échec déclaré : ${reason}`,
        timestamp: '10:45',
        resolved: false,
      };
      setIncidents((prev) => [newInc, ...prev]);
    }
  };



  // Mock route recalculation after client call incident
  const recalculateRoute = (
    deliveryId: string,
    incidentType: string,
    reason: string,
    comment: string = ''
  ) => {
    const target = deliveries.find((d) => d.id === deliveryId);
    if (!target) return null;

    const remainingStops = deliveries
      .filter(
        (d) =>
          d.tourId === target.tourId &&
          d.sequence > target.sequence &&
          (d.status === 'Affectée' || d.status === 'Planifiée' || d.status === 'À planifier' || d.status === 'En route')
      )
      .sort((a, b) => a.sequence - b.sequence);

    const incidentId = `INC-${Date.now().toString().slice(-5)}`;
    const optimization: RouteOptimizationResult = {
      deliveryId,
      incidentId,
      reorderedStops: Math.min(remainingStops.length, 3),
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
      timestamp: '10:46',
      resolved: false,
      status: 'Nouveau',
      severity: incidentType === 'Refus client' ? 'Bloquant' : 'Information',
    };

    setDeliveries((prev) => {
      const orderedRemainingIds = remainingStops
        .slice()
        .sort((a, b) => a.district.localeCompare(b.district))
        .map((d) => d.id);

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

        const newIndex = orderedRemainingIds.indexOf(delivery.id);
        if (newIndex !== -1) {
          return {
            ...delivery,
            sequence: target.sequence + newIndex,
            status: newIndex === 0 ? ('En route' as DeliveryStatus) : delivery.status,
            deliveryStatus: newIndex === 0 ? 'En cours' : 'À livrer',
          };
        }

        return delivery;
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
        if (delivery.id !== deliveryId || delivery.status !== 'À confirmer') return delivery;

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
        if (d.id === deliveryId) {
          return {
            ...d,
            status: 'Validée' as DeliveryStatus,
            proof: d.proof
              ? {
                  ...d.proof,
                  validationTimestamp: '10:46:12',
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
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id === deliveryId) {
          return {
            ...d,
            status: 'Rejetée' as DeliveryStatus,
            proof: d.proof
              ? {
                  ...d.proof,
                  rejectionReason: reason,
                  rejectionComment: comment,
                  validationTimestamp: '10:46:12',
                  validatedBy: 'Karim Dispatcher (Superviseur)',
                }
              : undefined,
          };
        }
        return d;
      })
    );
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
    setDeliveries(INITIAL_DELIVERIES);
    setTours(synchronizeTourCounters(INITIAL_TOURS, INITIAL_DELIVERIES));
    setIncidents(INITIAL_INCIDENTS);
    setDrivers(INITIAL_DRIVERS);
    setVehicles(INITIAL_VEHICLES);
    setAddresses(INITIAL_ADDRESSES as unknown as DeliveryAddress[]);
    setZones(INITIAL_ZONES as unknown as DeliveryZone[]);
    setLastRouteOptimization(null);
    setSelectedDeliveryId('CMD-45821');
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
        selectedDeliveryId,
        activeViewMode,
        setActiveViewMode,
        setSelectedDeliveryId,
        backofficeTab,
        setBackofficeTab,
        driverScreen,
        setDriverScreen,
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
