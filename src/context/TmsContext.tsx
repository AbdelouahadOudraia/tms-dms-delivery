import React, { createContext, useContext, useState } from 'react';
import {
  Delivery,
  Tour,
  Driver,
  Vehicle,
  Incident,
  DeliveryStatus,
  ProofOfDelivery,
} from '../types';
import {
  INITIAL_DELIVERIES,
  INITIAL_TOURS,
  INITIAL_DRIVERS,
  INITIAL_VEHICLES,
  INITIAL_INCIDENTS,
} from '../data/tmsMockData';

interface TmsContextType {
  // Data
  deliveries: Delivery[];
  tours: Tour[];
  drivers: Driver[];
  vehicles: Vehicle[];
  incidents: Incident[];
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
  validateDelivery: (deliveryId: string) => void;
  rejectDelivery: (deliveryId: string, reason: string, comment: string) => void;
  resetDemoData: () => void;
}

const TmsContext = createContext<TmsContextType | undefined>(undefined);

const isClosedDeliveryStatus = (status: DeliveryStatus) =>
  status === 'À valider' ||
  status === 'Validée' ||
  status === 'Échec' ||
  status === 'Rejetée' ||
  status === 'Retournée';

export const TmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>(INITIAL_DELIVERIES);
  const [tours, setTours] = useState<Tour[]>(INITIAL_TOURS);
  const [drivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [vehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);

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
      deliveriesCount: payload.deliveryIds.length,
      completedCount: 0,
      departureTime: payload.departureTime,
      estimatedEndTime: payload.estimatedEndTime,
      status: 'Affectée',
      zone: payload.zone,
    };

    setTours((prev) => [newTour, ...prev]);
    setDeliveries((prev) =>
      prev.map((delivery) => {
        const sequenceIndex = payload.deliveryIds.indexOf(delivery.id);
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

  // Reset demo
  const resetDemoData = () => {
    setDeliveries(INITIAL_DELIVERIES);
    setTours(INITIAL_TOURS);
    setIncidents(INITIAL_INCIDENTS);
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
        validateDelivery,
        rejectDelivery,
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
