import React from 'react';
import { useTms } from '../../context/TmsContext';
import { StatusBadge } from '../common/StatusBadge';

export const DashboardScreen: React.FC = () => {
  const {
    deliveries,
    tours,
    incidents,
    setBackofficeTab,
    setSelectedDeliveryId,
  } = useTms();

  const total = deliveries.length;
  const completed = deliveries.filter((d) => d.status === 'Validée').length;
  const inProgress = deliveries.filter(
    (d) =>
      d.status === 'Livraison en cours' ||
      d.status === 'Arrivé' ||
      d.status === 'En route'
  ).length;
  const pendingValidation = deliveries.filter((d) => d.status === 'À valider').length;
  const anomalies = deliveries.filter(
    (d) => d.status === 'Échec' || d.status === 'Rejetée'
  ).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#EEF3F8] overflow-hidden p-4 space-y-4">
      {/* Dashboard Header */}
      <div className="rounded-2xl border border-[#0057A8] bg-gradient-to-r from-[#003B73] via-[#0057A8] to-[#0B5CAD] p-4 shadow-md shadow-blue-950/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFD200]" />
              Exploitation en direct
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Tableau de bord d'exploitation
            </h1>
            <p className="text-xs text-[#D6E9FA] mt-1 max-w-2xl">
              Supervision temps réel de la flotte, des tournées Casablanca et de la validation e-POD.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBackofficeTab('pending-validation')}
              className="px-3.5 py-2 rounded-xl bg-[#FFF4EA] text-[#B8561B] text-xs font-bold flex items-center gap-1.5 border border-[#FBD9C3] transition-all hover:bg-[#FFE8D4]"
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>{pendingValidation} Preuve(s) à valider</span>
            </button>

            <button
              onClick={() => setBackofficeTab('tours')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#E8F2FB] text-[#0057A8] text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">alt_route</span>
              <span>Gérer les tournées</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#DDE7F0] border-l-4 border-l-[#0057A8] shadow-sm shadow-slate-200/60 space-y-2 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider block">
              Total livraisons
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#1976D2]">inventory_2</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#1e293b] font-mono">{total}</span>
            <span className="text-[10px] font-semibold text-[#64748b]">Jour J</span>
          </div>
          <span className="text-[10px] text-[#94a3b8] block">Aujourd'hui</span>
        </div>

        {/* Terminées */}
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 border-l-4 border-l-[#2E9E5B] shadow-sm shadow-slate-200/60 space-y-2 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Livrées / Validées
            </span>
            <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700 font-mono">
              {completed}
            </span>
            <span className="text-xs font-semibold text-emerald-700">
              {Math.round((completed / total) * 100)}%
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 block">Conformes e-POD</span>
        </div>

        {/* En cours */}
        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 border-l-4 border-l-[#0057A8] shadow-sm shadow-slate-200/60 space-y-2 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">
              Livraisons en cours
            </span>
            <span className="material-symbols-outlined text-[18px] text-blue-600">near_me</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#0057A8] font-mono">
              {inProgress}
            </span>
            <span className="w-2 h-2 rounded-full bg-[#1976D2]" />
          </div>
          <span className="text-[10px] text-blue-600 block">Sur le terrain</span>
        </div>

        {/* À valider (Orange) */}
        <div
          onClick={() => setBackofficeTab('pending-validation')}
          className="bg-white p-3.5 rounded-2xl border border-amber-300 border-l-4 border-l-[#E8722C] shadow-sm shadow-slate-200/60 space-y-2 cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider block">
              À valider
            </span>
            <span className="material-symbols-outlined text-[18px] text-amber-600">approval</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-700 font-mono">
              {pendingValidation}
            </span>
            <span className="material-symbols-outlined text-[17px] text-amber-600">chevron_right</span>
          </div>
          <span className="text-[10px] text-amber-800 block">En attente superviseur</span>
        </div>

        {/* Anomalies / Retards (Rouge) */}
        <div
          onClick={() => setBackofficeTab('anomalies')}
          className="bg-white p-3.5 rounded-2xl border border-rose-200 border-l-4 border-l-[#7F1D1D] shadow-sm shadow-slate-200/60 space-y-2 cursor-pointer hover:border-rose-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
              Anomalies / Échecs
            </span>
            <span className="material-symbols-outlined text-[18px] text-rose-600">
              warning
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-700 font-mono">
              {anomalies}
            </span>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
              Risque
            </span>
          </div>
          <span className="text-[10px] text-rose-600 block">Nécessite rappel</span>
        </div>
      </div>

      {/* Main Row: Map Dispatch & Tournées en cours */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Real-time Dispatch Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#DDE7F0] shadow-sm shadow-slate-200/70 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#0057A8]">
                map
              </span>
              <h2 className="text-sm font-bold text-[#1e293b]">
                Carte des chauffeurs & livraisons en temps réel
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#64748b]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                3 Véhicules actifs
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Casablanca
              </span>
            </div>
          </div>

          <div className="relative h-[270px] bg-[#E8F2FB] overflow-hidden">
            <iframe
              title="Carte réelle Casablanca"
              className="absolute inset-0 h-full w-full border-0 grayscale-[0.15] contrast-[0.98] saturate-[0.9]"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-7.7000%2C33.5650%2C-7.6100%2C33.6150&layer=mapnik&marker=33.5895%2C-7.6465"
            />
            <div className="absolute inset-0 bg-[#0057A8]/5 pointer-events-none" />

            {/* Route métier simulée par-dessus la vraie carte */}
            <svg
              className="absolute inset-0 h-full w-full pointer-events-none"
              viewBox="0 0 700 270"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M 210 170 L 300 120 L 370 190 L 455 145 L 520 215"
                stroke="#0057A8"
                strokeWidth="3"
                strokeDasharray="7 5"
                strokeLinecap="round"
              />
            </svg>

            {/* Chauffeur actif */}
            <button
              type="button"
              className="absolute left-[42%] top-[42%] -translate-x-1/2 -translate-y-1/2 group"
              title="Youssef El Amrani - TR-058"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0057A8] text-[10px] font-bold text-white shadow-lg ring-2 ring-white">
                YE
              </span>
              <span className="absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#DDE7F0] bg-white px-2 py-1 text-[10px] font-bold text-[#1D2229] shadow-sm">
                Youssef (TR-058)
              </span>
            </button>

            {/* Preuve e-POD en attente */}
            <button
              type="button"
              onClick={() => {
                setSelectedDeliveryId('CMD-45821');
                setBackofficeTab('pending-validation');
              }}
              className="absolute left-[51%] top-[57%] -translate-x-1/2 -translate-y-1/2 group"
              title="CMD-45821 - e-POD en attente"
            >
              <span className="absolute -inset-2 rounded-full bg-[#E8722C]/20 animate-ping" />
              <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-[#E8722C] shadow-lg ring-2 ring-white" />
              <span className="absolute left-1/2 -top-8 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#102A43] px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                CMD-45821 POD
              </span>
            </button>

            {/* Deuxième tournée */}
            <button
              type="button"
              className="absolute left-[63%] top-[52%] -translate-x-1/2 -translate-y-1/2 group"
              title="Tariq Benali - TR-059"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D9488] text-[10px] font-bold text-white shadow-lg ring-2 ring-white">
                TB
              </span>
              <span className="absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#DDE7F0] bg-white px-2 py-1 text-[10px] font-bold text-[#1D2229] shadow-sm">
                Tariq (TR-059)
              </span>
            </button>
            {/* Map Legend float */}
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-1 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#0057A8]" />
                <span>Tournée TR-2026-058 (Ain Diab / Maarif)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Preuve e-POD en attente</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Alertes & Anomalies en direct */}
        <div className="bg-white rounded-2xl border border-[#DDE7F0] shadow-sm shadow-slate-200/70 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-rose-600">
                notifications_active
              </span>
              <h2 className="text-sm font-bold text-[#1e293b]">
                Alertes & Incidents récents
              </h2>
            </div>
            <button
              onClick={() => setBackofficeTab('anomalies')}
              className="text-xs text-[#0057A8] font-semibold hover:underline"
            >
              Tout voir
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-soft divide-y divide-slate-100 p-2">
            {incidents.map((inc) => {
              const isBlockingIncident =
                inc.type.toLowerCase().includes('client absent') ||
                inc.type.toLowerCase().includes('colis') ||
                inc.type.toLowerCase().includes('échec') ||
                inc.type.toLowerCase().includes('rejet');

              const typeClass = isBlockingIncident
                ? 'border-[#FCA5A5] bg-[#FEE2E2] text-[#7F1D1D]'
                : 'border-[#B9D3F2] bg-[#EAF2FF] text-[#0057A8]';
              const statusClass = isBlockingIncident
                ? 'text-[#7F1D1D] bg-[#FEE2E2] border-[#FCA5A5]'
                : 'text-[#5B6470] bg-[#F5F7FA] border-[#DDE7F0]';

              return (
                <div key={inc.id} className="p-3 hover:bg-slate-50 rounded-xl space-y-1 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${typeClass}`}>
                      {inc.type}
                    </span>
                    <span className="text-[10px] font-mono text-[#64748b]">{inc.timestamp}</span>
                  </div>

                  <p className="text-xs font-bold text-[#1e293b] mt-1">
                    {inc.customerName} ({inc.deliveryId})
                  </p>
                  <p className="text-xs text-[#475569] line-clamp-1">
                    {inc.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px] text-[#64748b]">
                    <span>Chauffeur : {inc.driverName}</span>
                    <span className={`rounded border px-1.5 py-0.5 font-semibold ${statusClass}`}>
                      Non résolu
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tournées du jour summary table */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-[#DDE7F0] shadow-sm shadow-slate-200/70 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[#1e293b]">Tournées actives</h3>
            <p className="text-xs text-[#64748b]">Progression globale des tournées planifiées</p>
          </div>
          <button
            onClick={() => setBackofficeTab('tours')}
            className="text-xs font-bold text-[#0057A8] hover:underline"
          >
            Gérer les tournées ↗
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto scrollbar-soft">
          <table className="w-full min-w-[980px] text-xs text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[#64748b] border-b border-[#e2e8f0] shadow-sm">
              <tr>
                <th className="px-4 py-3 font-semibold">Réf. Tournée</th>
                <th className="px-4 py-3 font-semibold">Chauffeur</th>
                <th className="px-4 py-3 font-semibold">Véhicule</th>
                <th className="px-4 py-3 font-semibold">Zone</th>
                <th className="px-4 py-3 font-semibold">Livraisons</th>
                <th className="px-4 py-3 font-semibold">Progression</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {tours.map((t) => {
                const percent = Math.round((t.completedCount / t.deliveriesCount) * 100);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-bold text-[#0057A8]">{t.id}</td>
                    <td className="px-4 py-3 font-bold text-[#1e293b]">{t.driverName}</td>
                    <td className="px-4 py-3 font-mono text-[#475569]">{t.vehicleId}</td>
                    <td className="px-4 py-3 text-[#64748b]">{t.zone}</td>
                    <td className="px-4 py-3 font-mono">
                      {t.completedCount} / {t.deliveriesCount}
                    </td>
                    <td className="px-4 py-3 w-40">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#0057A8] h-full rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold">{percent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setBackofficeTab('tours')}
                        className="text-xs font-bold text-[#0057A8] hover:underline"
                      >
                        Consulter
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
