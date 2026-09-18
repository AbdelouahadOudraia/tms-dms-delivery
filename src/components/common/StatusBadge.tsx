import React from 'react';
import { DeliveryStatus } from '../../types';

interface StatusBadgeProps {
  status: DeliveryStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  let bg = 'bg-[#F5F6F7] text-[#1D2229] border-[#E3E5E8]';
  let dot = 'bg-[#5B6470]';

  switch (status) {
    case 'Validée':
    case 'Terminée':
    case 'Livrée':
    case 'Géocodée':
    case 'Résolu':
      bg = 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]';
      dot = 'bg-[#2E9E5B]';
      break;

    case 'À valider':
    case 'À traiter':
    case 'À clôturer':
      bg = 'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]';
      dot = 'bg-[#E8722C]';
      break;

    case 'Retournée':
      bg = 'bg-[#FEF4EC] text-[#B8561B] border-[#FBD9C3]';
      dot = 'bg-[#E8722C]';
      break;

    case 'Échec':
    case 'Rejetée':
    case 'Annulée':
    case 'Échec de livraison':
    case 'Non localisée':
      bg = 'bg-[#FEF2F2] text-[#7F1D1D] border-[#FECACA]';
      dot = 'bg-[#7F1D1D]';
      break;

    case 'Livraison en cours':
    case 'Arrivé':
    case 'En route':
    case 'En cours':
    case 'Confirmée':
      bg = 'bg-[#EFF6FF] text-[#0057A8] border-[#BFDBFE]';
      dot = 'bg-[#1976D2]';
      break;

    case 'Nouveau':
    case 'À collecter':
    case 'À vérifier':
    case 'À confirmer':
      bg = 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]';
      dot = 'bg-[#FFD200]';
      break;

    case 'Affectée':
    case 'Planifiée':
    case 'À planifier':
    case 'Brouillon':
    case 'Non chargée':
    default:
      bg = 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]';
      dot = 'bg-[#5B6470]';
      break;
  }

  const sizeClasses = {
    sm: 'h-[22px] text-xs px-2',
    md: 'h-6 text-xs px-2.5',
    lg: 'h-7 text-[13px] px-3',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap leading-none ${bg} ${sizeClasses}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
      <span>{status}</span>
    </span>
  );
};
