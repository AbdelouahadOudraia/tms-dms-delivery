import React from 'react';
import { DeliveryStop } from '../types';

interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  stop: DeliveryStop;
}

export const NavigationModal: React.FC<NavigationModalProps> = ({
  isOpen,
  onClose,
  stop,
}) => {
  if (!isOpen) return null;
};
