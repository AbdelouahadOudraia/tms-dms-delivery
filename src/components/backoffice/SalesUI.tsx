import React, { useEffect, useId, useRef } from 'react';

export const SalesField: React.FC<{ label: string; children: React.ReactNode; hint?: string; className?: string }> = ({ label, children, hint, className = '' }) => (
  <label className={`block min-w-0 text-[13px] font-medium text-[#475569] ${className}`}>
    <span className="mb-1.5 block">{label}</span>{children}
    {hint && <span className="mt-1 block text-xs font-normal text-[#64748B]">{hint}</span>}
  </label>
);

export const SalesSection: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <section className="bo-panel min-w-0">
    <div className="border-b border-[#E2E8F0] px-5 py-4"><h2 className="text-sm font-semibold text-[#1F2937]">{title}</h2>{subtitle && <p className="mt-1 text-xs text-[#64748B]">{subtitle}</p>}</div>
    <div className="p-5">{children}</div>
  </section>
);

export const SalesPill: React.FC<{ children: React.ReactNode; tone?: 'neutral' | 'blue' | 'green' | 'orange' | 'red' }> = ({ children, tone = 'neutral' }) => {
  const tones = {
    neutral: 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]',
    blue: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#0057A8]',
    green: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]',
    orange: 'border-[#FED7AA] bg-[#FFF7ED] text-[#9A3412]',
    red: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
};

export const SalesDialog: React.FC<{ title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }> = ({ title, subtitle, onClose, children }) => {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { close.current(); return; }
      if (event.key !== 'Tab') return;
      const elements = (Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]') || []) as HTMLElement[]).filter((element) => element.getClientRects().length);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, []);
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0F172A]/45 p-4 backdrop-blur-xs">
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex max-h-[calc(100dvh-32px)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-xl">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E2E8F0] px-5 py-4"><div><h2 id={titleId} className="text-lg font-semibold text-[#1F2937]">{title}</h2>{subtitle && <p className="mt-1 text-[13px] text-[#64748B]">{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="Fermer le panneau" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9]"><span className="material-symbols-outlined text-[20px]">close</span></button></div>
      <div className="scrollbar-soft min-h-0 overflow-y-auto p-5">{children}</div>
    </div>
  </div>;
};
