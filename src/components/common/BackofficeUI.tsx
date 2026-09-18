import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <header className="mb-6 flex shrink-0 items-start justify-between gap-6">
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold leading-8 text-[#1F2937]">{title}</h1>
      {subtitle && <p className="mt-1 text-sm leading-5 text-[#64748B]">{subtitle}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </header>
);

interface FilterBarProps {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ children, action, className = '' }) => (
  <div className={`bo-panel mb-4 flex shrink-0 flex-wrap items-end gap-3 p-4 ${className}`}>
    {children}
    {action && <div className="ml-auto flex items-center">{action}</div>}
  </div>
);

interface FilterFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export const FilterField: React.FC<FilterFieldProps> = ({ label, children, className = '' }) => (
  <label className={`min-w-[140px] text-[13px] font-medium text-[#475569] ${className}`}>
    <span className="mb-1.5 block">{label}</span>
    {children}
  </label>
);

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action }) => (
  <div className="flex min-h-14 items-center justify-between gap-4 border-b border-[#E2E8F0] px-4 py-3">
    <div>
      <h2 className="text-base font-semibold leading-6 text-[#1F2937]">{title}</h2>
      {subtitle && <p className="text-[13px] text-[#64748B]">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const MoreButton: React.FC<{ label?: string; onClick: () => void }> = ({ label = 'Afficher le détail', onClick }) => (
  <button type="button" title={label} onClick={onClick} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0057A8]">
    <span className="material-symbols-outlined text-[20px]">more_horiz</span>
  </button>
);

interface SimpleModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const SimpleModal: React.FC<SimpleModalProps> = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4 backdrop-blur-xs">
    <div className="w-full max-w-lg rounded-lg border border-[#E2E8F0] bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-5 py-4">
        <div><h2 className="text-lg font-semibold text-[#1F2937]">{title}</h2>{subtitle && <p className="mt-1 text-[13px] text-[#64748B]">{subtitle}</p>}</div>
        <button type="button" onClick={onClose} title="Fermer" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9]"><span className="material-symbols-outlined text-[20px]">close</span></button>
      </div>
      {children}
    </div>
  </div>
);
