import React, { useState } from 'react';
import { useTms } from '../../../context/TmsContext';
import type { Delivery } from '../../../types';
import { getDriverHistoryEntries, getIncidentTreatmentSummary, type DriverHistoryEntry } from '../../../utils/driverHistory';
import { StatusBadge } from '../../common/StatusBadge';
import { DeliveryCompactCard, MobileScreenHeader } from '../MobileUI';

type HistoryFilter = 'Tous' | 'Validée' | 'Échec' | 'Retournée' | 'À valider' | 'Rejetée';

const FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: 'Tous', label: 'Tous' },
  { value: 'Validée', label: 'Validées' },
  { value: 'Échec', label: 'Échecs' },
  { value: 'Retournée', label: 'Retours' },
  { value: 'À valider', label: 'En attente' },
  { value: 'Rejetée', label: 'À corriger' },
];

const HistoryEntryCard: React.FC<{
  entry: DriverHistoryEntry;
  deliveries: Delivery[];
  onOpen: () => void;
}> = ({ entry, deliveries, onOpen }) => {
  const { delivery, incidents } = entry;

  return (
    <div className="space-y-2">
      {delivery.nextAttemptId && (
        <p className="px-1 text-[11px] font-semibold text-[#0057A8]">Ancienne tentative de livraison</p>
      )}
      <DeliveryCompactCard delivery={delivery} onClick={onOpen} />

      {delivery.status === 'À valider' && (
        <p className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2 text-[11px] text-[#9A3412]">
          Preuve envoyée · en attente de validation par le backoffice.
        </p>
      )}
      {delivery.status === 'Rejetée' && (
        <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#7F1D1D]">
          Preuve à corriger{delivery.proof?.rejectionReason ? ` : ${delivery.proof.rejectionReason}` : ''}. Ouvrez la livraison pour la corriger.
        </p>
      )}
      {delivery.status === 'Validée' && delivery.proof && (
        <p className="rounded-xl border border-[#BEE3CE] bg-[#EAF5EE] px-3 py-2 text-[11px] text-[#176B3A]">
          e-POD validé par le backoffice.
        </p>
      )}
      {delivery.failureReason && (
        <p className="rounded-xl border border-[#DDE7F0] bg-white px-3 py-2 text-[11px] text-[#5B6470]">
          {delivery.nextAttemptId ? 'Motif de l’ancienne tentative' : 'Motif d’échec'} : {delivery.failureReason}
        </p>
      )}

      {incidents.map((incident) => (
        <div key={incident.id} className="rounded-xl border border-[#DDE7F0] bg-white px-3 py-2.5 text-[11px] text-[#5B6470]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[#1D2229]">Traitement · {incident.type}</span>
            <StatusBadge status={incident.resolved ? 'Résolu' : 'À traiter'} size="sm" />
          </div>
          <p className="mt-1">{getIncidentTreatmentSummary(incident, deliveries)}</p>
          {incident.treatment?.note && <p className="mt-1">Décision : {incident.treatment.note}</p>}
        </div>
      ))}
    </div>
  );
};

export const HistoryScreen: React.FC = () => {
  const { deliveries, incidents, currentDriver, setSelectedDeliveryId, setDriverScreen } = useTms();
  const [filter, setFilter] = useState<HistoryFilter>('Tous');

  const entries = getDriverHistoryEntries(deliveries, incidents, currentDriver.id)
    .filter((entry) => filter === 'Tous' || entry.delivery.status === filter);
  const sections = [
    { group: 'follow-up' as const, title: 'Preuves à suivre', entries: entries.filter((entry) => entry.group === 'follow-up') },
    { group: 'completed' as const, title: 'Tentatives terminées', entries: entries.filter((entry) => entry.group === 'completed') },
  ].filter((section) => section.entries.length > 0);

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] overflow-hidden pb-20">
      <MobileScreenHeader title="Historique" subtitle="Tentatives terminées et preuves à suivre" icon="history" />

      <div className="shrink-0 border-b border-[#DDE7F0] bg-white px-4 py-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-soft pb-0.5">
          {FILTERS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${filter === tab.value ? 'bg-[#0057A8] text-white' : 'bg-[#F7FAFC] text-[#5B6470]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-soft p-3 space-y-4">
        {sections.length === 0 ? (
          <div className="rounded-3xl border border-[#DDE7F0] bg-white p-8 text-center text-[#5B6470]">
            <span className="material-symbols-outlined text-[38px]">inbox</span>
            <p className="mt-1 text-sm font-bold">Aucune livraison trouvée</p>
          </div>
        ) : sections.map((section) => (
          <section key={section.group} className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1D2229]">{section.title}</h2>
              <span className="text-[11px] text-[#5B6470]">{section.entries.length}</span>
            </div>
            {section.entries.map((entry) => (
              <HistoryEntryCard
                key={entry.delivery.id}
                entry={entry}
                deliveries={deliveries}
                onOpen={() => {
                  setSelectedDeliveryId(entry.delivery.id);
                  setDriverScreen('history-detail');
                }}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
};
