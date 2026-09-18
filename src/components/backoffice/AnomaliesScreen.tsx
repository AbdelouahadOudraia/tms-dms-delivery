import React, { useMemo, useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { PageHeader, SectionHeader } from '../common/BackofficeUI';
import { StatusBadge } from '../common/StatusBadge';
import { buildOperationalIncidents, OperationalIncident } from '../../utils/operationalIncidents';

export const AnomaliesScreen: React.FC = () => {
  const { incidents, deliveries } = useTms();
  const [activeTab, setActiveTab] = useState<'tous' | 'echecs' | 'rejetes'>('tous');
  const [selectedIncident, setSelectedIncident] = useState<OperationalIncident | null>(incidents[0] || null);
  const [resolutionToast, setResolutionToast] = useState<string | null>(null);

  const incidentItems = useMemo(
    () => buildOperationalIncidents(incidents, deliveries),
    [deliveries, incidents]
  );

  const visibleIncidents = incidentItems.filter((incident) => {
    if (activeTab === 'echecs') return incident.sourceStatus === 'Échec' || !incident.sourceStatus;
    if (activeTab === 'rejetes') return incident.sourceStatus === 'Rejetée';
    return true;
  });

  const handleResolveAction = (actionName: string) => {
    setResolutionToast(`Action enregistrée : ${actionName}`);
    setTimeout(() => setResolutionToast(null), 3500);
  };

  const actions = [
    ['event_repeat', 'Reprogrammer', 'Reprogrammer sur prochaine tournée'],
    ['support_agent', 'Contacter le client', 'Appel Service Client déclenché'],
    ['assignment_return', 'Retour entrepôt', 'Retour en entrepôt validé'],
    ['cancel', 'Annuler', 'Commande annulée & remboursement'],
  ];

  return (
    <div className="bo-page">
      <PageHeader
        title="Incidents"
        subtitle={`${incidentItems.length} incident(s) · traitement des échecs terrain et litiges de livraison`}
        actions={<div className="flex rounded-md border border-[#CBD5E1] bg-[#F8FAFC] p-0.5 text-[13px]">{[
          ['tous', 'Tous'], ['echecs', 'Échecs terrain'], ['rejetes', 'e-POD rejetées'],
        ].map(([id, label]) => <button key={id} onClick={() => setActiveTab(id as typeof activeTab)} className={`h-8 rounded px-3 font-medium ${activeTab === id ? 'bg-white text-[#0057A8] ring-1 ring-[#E2E8F0]' : 'text-[#64748B]'}`}>{label}</button>)}</div>}
      />

      {resolutionToast && <div className="mb-4 flex h-10 shrink-0 items-center justify-between rounded-md bg-[#F0FDF4] px-3 text-[13px] font-medium text-[#166534]"><span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">check_circle</span>{resolutionToast}</span><button onClick={() => setResolutionToast(null)}>×</button></div>}

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        <section className="bo-panel flex w-[40%] min-w-[380px] flex-col overflow-hidden">
          <SectionHeader title="Anomalies terrain" subtitle={`${visibleIncidents.length} élément(s) à afficher`} />
          <div className="scrollbar-soft min-h-0 flex-1 overflow-y-auto divide-y divide-[#E2E8F0]">
            {visibleIncidents.map((incident) => (
              <button key={incident.id} onClick={() => setSelectedIncident(incident)} className={`w-full border-l-2 px-4 py-3 text-left transition-colors hover:bg-[#F8FAFC] ${selectedIncident?.id === incident.id ? 'border-l-[#0057A8] bg-[#EFF6FF]' : 'border-l-transparent'}`}>
                <div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-medium text-[#1F2937]">{incident.type}</span><span className="shrink-0 font-mono text-xs text-[#64748B]">{incident.timestamp}</span></div>
                <p className="mt-1 truncate text-[13px] text-[#475569]">{incident.customerName} · {incident.deliveryId}</p>
                <div className="mt-2 flex items-center justify-between gap-3"><span className="truncate text-xs text-[#64748B]">{incident.driverName}</span><StatusBadge status={incident.resolved ? 'Résolu' : incident.sourceStatus || 'À traiter'} size="sm" /></div>
              </button>
            ))}
          </div>
        </section>

        <section className="bo-panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <SectionHeader title="Traitement de l’incident" subtitle={selectedIncident?.id} />
          {selectedIncident ? (
            <div className="scrollbar-soft min-h-0 flex-1 overflow-y-auto p-6">
              <div className="border-b border-[#E2E8F0] pb-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[13px] font-medium text-[#7F1D1D]">Incident {selectedIncident.id}</p><h3 className="mt-1 text-xl font-semibold text-[#1F2937]">{selectedIncident.type}</h3></div><StatusBadge status={selectedIncident.resolved ? 'Résolu' : 'À traiter'} /></div><p className="mt-3 max-w-3xl text-sm leading-6 text-[#475569]">{selectedIncident.description}</p></div>

              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-b border-[#E2E8F0] py-5 text-sm lg:grid-cols-4">
                <div><dt className="text-[13px] text-[#64748B]">Client</dt><dd className="mt-1 font-medium text-[#1F2937]">{selectedIncident.customerName}</dd></div>
                <div><dt className="text-[13px] text-[#64748B]">Commande</dt><dd className="mt-1 font-mono text-[#0057A8]">{selectedIncident.deliveryId}</dd></div>
                <div><dt className="text-[13px] text-[#64748B]">Chauffeur</dt><dd className="mt-1 font-medium text-[#1F2937]">{selectedIncident.driverName}</dd></div>
                <div><dt className="text-[13px] text-[#64748B]">Tournée</dt><dd className="mt-1 font-mono text-[#1F2937]">{selectedIncident.tourId}</dd></div>
              </dl>

              <div className="pt-5"><h4 className="mb-3 text-base font-semibold text-[#1F2937]">Actions recommandées</h4><div className="flex flex-wrap gap-2">{actions.map(([icon, label, action]) => <button key={label} onClick={() => handleResolveAction(action)} className={label === 'Annuler' ? 'inline-flex h-9 items-center gap-2 rounded-md border border-[#FECACA] bg-white px-3 text-sm font-medium text-[#7F1D1D] hover:bg-[#FEF2F2]' : 'bo-button-secondary'}><span className="material-symbols-outlined text-[18px]">{icon}</span>{label}</button>)}</div></div>
            </div>
          ) : <div className="m-auto text-sm text-[#64748B]">Sélectionnez un incident pour afficher son détail.</div>}
        </section>
      </div>
    </div>
  );
};
