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
      bg = 'bg-[#EAF5EE] text-[#176B3A] border-[#BEE3CE] font-semibold';
      dot = 'bg-[#2E9E5B]';
      break;

    case 'À valider':
      bg = 'bg-[#FEF4EC] text-[#E8722C] border-[#FBD9C3] font-bold';
      dot = 'bg-[#E8722C] animate-pulse';
      break;

    case 'Retournée':
      bg = 'bg-[#FEF4EC] text-[#B8561B] border-[#FBD9C3]';
      dot = 'bg-[#E8722C]';
      break;

    case 'Échec':
    case 'Rejetée':
      bg = 'bg-[#FEE2E2] text-[#7F1D1D] border-[#FCA5A5] font-semibold';
      dot = 'bg-[#7F1D1D]';
      break;

    case 'Livraison en cours':
    case 'Arrivé':
    case 'En route':
    case 'En cours':
      bg = 'bg-[#EAF2FF] text-[#0057A8] border-[#B9D3F2] font-semibold';
      dot = 'bg-[#1976D2]';
      break;

    case 'Affectée':
    case 'Planifiée':
    case 'À planifier':
    default:
      bg = 'bg-[#F5F6F7] text-[#1D2229] border-[#E3E5E8] font-medium';
      dot = 'bg-[#5B6470]';
      break;
  }

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-[11px] px-2 py-0.5',
    lg: 'text-[12px] px-2.5 py-1',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border font-medium whitespace-nowrap leading-none ${bg} ${sizeClasses}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
      <span>{status}</span>
    </span>
  );
};
