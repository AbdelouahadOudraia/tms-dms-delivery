import React from 'react';
import { Delivery } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  variant?: 'light' | 'strong';
  icon?: string;
}

export const MobileScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  right,
  variant = 'light',
  icon,
}) => {
  const strong = variant === 'strong';

  return (
    <div
      className={`shrink-0 px-4 py-3 flex items-center justify-between border-b sticky top-0 z-20 ${
        strong
          ? 'bg-gradient-to-r from-[#003B73] via-[#0057A8] to-[#0B5CAD] border-[#003B73] text-white shadow-md shadow-blue-950/15'
          : 'bg-white border-[#DDE7F0] text-[#1D2229]'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${
              strong ? 'bg-white/10 hover:bg-white/20 text-white' : 'hover:bg-[#EEF3F8] text-[#5B6470]'
            }`}
          >
            <span className="material-symbols-outlined text-[21px]">arrow_back</span>
          </button>
        )}
        {icon && (
          <span
            className={`material-symbols-outlined text-[22px] ${
              strong ? 'text-[#FFD200]' : 'text-[#0057A8]'
            }`}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1 className={`text-base font-bold truncate ${strong ? 'text-white' : 'text-[#1D2229]'}`}>{title}</h1>
          {subtitle && (
            <p className={`text-xs truncate ${strong ? 'text-[#D6E9FA]' : 'text-[#5B6470]'}`}>{subtitle}</p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0 ml-3">{right}</div>}
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: string;
  tone?: 'primary' | 'danger' | 'neutral';
}

export const MobilePrimaryButton: React.FC<ButtonProps> = ({ children, icon, tone = 'primary', className = '', ...props }) => {
  const toneClass =
    tone === 'danger'
      ? 'bg-[#7F1D1D] hover:bg-[#641717] shadow-red-950/20'
      : tone === 'neutral'
      ? 'bg-[#102A43] hover:bg-[#0B1F3A] shadow-slate-950/20'
      : 'bg-[#0057A8] hover:bg-[#004280] shadow-blue-950/20';

  return (
    <button
      {...props}
      className={`w-full min-h-[48px] rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:bg-[#DDE7F0] disabled:text-[#7A8A9B] disabled:shadow-none disabled:cursor-not-allowed ${toneClass} ${className}`}
    >
      {icon && <span className="material-symbols-outlined text-[20px]">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export const MobileSecondaryButton: React.FC<ButtonProps> = ({ children, icon, className = '', ...props }) => (
  <button
    {...props}
    className={`w-full min-h-[44px] rounded-xl border border-[#DDE7F0] bg-white text-[#1D2229] text-xs font-bold flex items-center justify-center gap-2 transition-colors hover:bg-[#F7FAFC] active:scale-[0.99] ${className}`}
  >
    {icon && <span className="material-symbols-outlined text-[18px] text-[#0057A8]">{icon}</span>}
    <span>{children}</span>
  </button>
);

export const MobileProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => (
  <div className={`h-2.5 w-full overflow-hidden rounded-full bg-[#DDE7F0] ${className}`}>
    <div
      className="h-full rounded-full bg-[#0057A8] transition-all duration-500"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

export const MetricTile: React.FC<{
  label: string;
  value: React.ReactNode;
  tone?: 'blue' | 'success' | 'warning' | 'danger' | 'neutral';
}> = ({ label, value, tone = 'neutral' }) => {
  const toneClasses = {
    blue: 'border-[#BCD6ED] bg-[#E8F2FB] text-[#0057A8]',
    success: 'border-[#BEE3CE] bg-[#EAF5EE] text-[#176B3A]',
    warning: 'border-[#FBD9C3] bg-[#FEF4EC] text-[#B8561B]',
    danger: 'border-[#FCA5A5] bg-[#FEE2E2] text-[#7F1D1D]',
    neutral: 'border-[#DDE7F0] bg-[#F7FAFC] text-[#1D2229]',
  }[tone];

  return (
    <div className={`rounded-xl border p-2.5 text-center ${toneClasses}`}>
      <span className="block text-[10px] font-semibold text-[#5B6470]">{label}</span>
      <span className="mt-0.5 block font-mono text-base font-bold">{value}</span>
    </div>
  );
};

export const DeliveryCompactCard: React.FC<{
  delivery: Delivery;
  onClick: () => void;
  active?: boolean;
}> = ({ delivery, onClick, active }) => {
  const isDone = delivery.status === 'Validée' || delivery.status === 'À valider';
  const isFailed = delivery.status === 'Échec' || delivery.status === 'Rejetée';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border bg-white p-3 text-left shadow-sm transition-all active:scale-[0.99] ${
        active
          ? 'border-[#0057A8] ring-2 ring-[#0057A8]/10'
          : isFailed
          ? 'border-[#FCA5A5]'
          : 'border-[#DDE7F0] hover:border-[#BCD6ED]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
              isDone
                ? 'bg-[#EAF5EE] text-[#176B3A]'
                : active
                ? 'bg-[#0057A8] text-white'
                : isFailed
                ? 'bg-[#FEE2E2] text-[#7F1D1D]'
                : 'bg-[#EEF3F8] text-[#5B6470]'
            }`}
          >
            {isDone ? '✓' : delivery.sequence}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-bold text-[#1D2229]">{delivery.customerName}</h3>
              <span className="shrink-0 text-[10px] font-mono text-[#5B6470]">{delivery.orderId}</span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[#5B6470]">
              {delivery.district} • {delivery.timeSlot}
            </p>
          </div>
        </div>
        <StatusBadge status={delivery.status} size="sm" />
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-[#EEF3F8] pt-2 text-[11px] text-[#5B6470]">
        <span className="truncate">{delivery.items.length} article(s)</span>
        <span className="font-semibold text-[#0057A8]">Ouvrir</span>
      </div>
    </button>
  );
};