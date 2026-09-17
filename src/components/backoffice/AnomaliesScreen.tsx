import React, { useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { StatusBadge } from '../common/StatusBadge';
import { Incident } from '../../types';

export const AnomaliesScreen: React.FC = () => {
  const { incidents, deliveries } = useTms();

  const [activeTab, setActiveTab] = useState<'tous' | 'echecs' | 'rejetes'>('tous');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(incidents[0] || null);
  const [resolutionToast, setResolutionToast] = useState<string | null>(null);

  // Deliveries with failure or rejection
  const failedDeliveries = deliveries.filter(
    (d) => d.status === 'Échec' || d.status === 'Rejetée'
  );

  const handleResolveAction = (actionName: string) => {
    setResolutionToast(`Action enregistrée : "${actionName}" pour ${selectedIncident?.customerName}`);
    setTimeout(() => setResolutionToast(null), 3500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1e293b]">
              Gestion des anomalies & litiges
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs border border-rose-300">
              {failedDeliveries.length + incidents.length} incidents signalés
            </span>
          </div>
          <p className="text-xs text-[#64748b] mt-0.5">
            Traitement des motifs d’échec remontés par les chauffeurs sur le terrain et suivi des litiges clients.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center bg-[#f1f5f9] p-1 rounded-lg border border-[#e2e8f0] text-xs">
          <button
            onClick={() => setActiveTab('tous')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'tous'
                ? 'bg-white text-[#0057A8] shadow-xs'
                : 'text-[#64748b] hover:text-[#1e293b]'
            }`}
          >
            Tous les incidents
          </button>
          <button
            onClick={() => setActiveTab('echecs')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'echecs'
                ? 'bg-white text-[#0057A8] shadow-xs'
                : 'text-[#64748b] hover:text-[#1e293b]'
            }`}
          >
            Échecs terrain ({failedDeliveries.filter((d) => d.status === 'Échec').length})
          </button>
          <button
            onClick={() => setActiveTab('rejetes')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'rejetes'
                ? 'bg-white text-[#0057A8] shadow-xs'
                : 'text-[#64748b] hover:text-[#1e293b]'
            }`}
          >
            e-POD Rejetées ({failedDeliveries.filter((d) => d.status === 'Rejetée').length})
          </button>
        </div>
      </div>

      {resolutionToast && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md flex items-center justify-between text-xs font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{resolutionToast}</span>
          </div>
          <button onClick={() => setResolutionToast(null)} className="opacity-80 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Split Layout: Incident List + Resolution Center */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Left: Incidents list */}
        <div className="w-full lg:w-1/2 bg-white rounded-2xl border border-[#e2e8f0] shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#e2e8f0] bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-[#475569] uppercase tracking-wider">
              Anomalies terrain signalées
            </span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-soft divide-y divide-[#f1f5f9]">
            {/* List from incidents */}
            {incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={`p-4 cursor-pointer transition-colors space-y-2 ${
                  selectedIncident?.id === inc.id
                    ? 'bg-rose-50/40 border-l-4 border-l-rose-600'
                    : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-xs">
                    {inc.type}
                  </span>
                  <span className="font-mono text-xs text-[#64748b]">{inc.timestamp}</span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#1e293b]">
                    {inc.customerName} • <span className="font-mono text-[#0057A8]">{inc.deliveryId}</span>
                  </h4>
                  <p className="text-xs text-[#475569] mt-0.5">{inc.description}</p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#64748b] pt-1 border-t border-slate-100">
                  <span>Chauffeur : <strong>{inc.driverName}</strong></span>
                  <span className="text-rose-600 font-semibold">En attente d'arbitrage</span>
                </div>
              </div>
            ))}

            {/* Also display failed deliveries from deliveries array */}
            {failedDeliveries.map((del) => (
              <div
                key={del.id}
                onClick={() =>
                  setSelectedIncident({
                    id: `INC-${del.id}`,
                    deliveryId: del.id,
                    tourId: del.tourId,
                    customerName: del.customerName,
                    driverName: del.driverName,
                    type: del.failureReason || 'Preuve rejetée par Backoffice',
                    description: del.failureComment || del.proof?.rejectionComment || 'Anomalie déclarée',
                    timestamp: del.deliveryTime || '10:45',
                    resolved: false,
                  })
                }
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors space-y-2 border-l-4 border-l-transparent"
              >
                <div className="flex items-center justify-between">
                  <StatusBadge status={del.status} size="sm" />
                  <span className="font-mono text-xs text-[#64748b]">
                    {del.deliveryTime || '10:45'}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#1e293b]">
                    {del.customerName} • <span className="font-mono text-[#0057A8]">{del.orderId}</span>
                  </h4>
                  <p className="text-xs text-[#475569] mt-0.5">
                    {del.failureComment || del.proof?.rejectionComment || 'Échec de livraison enregistré'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#64748b] pt-1 border-t border-slate-100">
                  <span>Chauffeur : <strong>{del.driverName}</strong></span>
                  <span className="text-rose-600 font-semibold">À traiter</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Incident Details & Action Resolution Center */}
        <div className="flex-1 bg-white rounded-2xl border border-[#e2e8f0] shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#e2e8f0] bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-[#475569] uppercase tracking-wider">
              Centre de traitement de litige
            </span>
            {selectedIncident && (
              <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {selectedIncident.id}
              </span>
            )}
          </div>

          {selectedIncident ? (
            <div className="flex-1 overflow-y-auto scrollbar-soft p-6 space-y-6 text-xs">
              <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                  Motif d'échec remonté par le chauffeur
                </span>
                <h3 className="text-base font-bold text-rose-950">
                  {selectedIncident.type}
                </h3>
                <p className="text-xs text-rose-900 leading-relaxed italic bg-white/70 p-3 rounded-lg border border-rose-100">
                  "{selectedIncident.description}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-[#64748b] block text-[11px]">Client concerné</span>
                  <strong className="text-sm text-[#1e293b]">{selectedIncident.customerName}</strong>
                </div>
                <div>
                  <span className="text-[#64748b] block text-[11px]">Commande liée</span>
                  <strong className="font-mono text-sm text-[#0057A8]">{selectedIncident.deliveryId}</strong>
                </div>
                <div>
                  <span className="text-[#64748b] block text-[11px]">Chauffeur terrain</span>
                  <strong className="text-[#1e293b]">{selectedIncident.driverName}</strong>
                </div>
                <div>
                  <span className="text-[#64748b] block text-[11px]">Tournée</span>
                  <strong className="font-mono text-[#1e293b]">{selectedIncident.tourId}</strong>
                </div>
              </div>

              {/* Action Buttons for Resolution */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-[#1e293b] text-xs uppercase tracking-wider">
                  Décision d'exploitation & Actions correctives :
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleResolveAction('Reprogrammer sur prochaine tournée')}
                    className="p-3.5 rounded-xl border border-[#cbd5e1] hover:border-[#0057A8] hover:bg-blue-50/20 text-left transition-colors flex items-start gap-2.5"
                  >
                    <span className="material-symbols-outlined text-[#0057A8] text-[20px] shrink-0">
                      event_repeat
                    </span>
                    <div>
                      <strong className="text-xs text-[#1e293b] block">
                        Reprogrammer la livraison
                      </strong>
                      <span className="text-[11px] text-[#64748b]">
                        Réinjecter dans la tournée de demain matin
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleResolveAction('Appel Service Client déclenché')}
                    className="p-3.5 rounded-xl border border-[#cbd5e1] hover:border-emerald-600 hover:bg-emerald-50/20 text-left transition-colors flex items-start gap-2.5"
                  >
                    <span className="material-symbols-outlined text-emerald-600 text-[20px] shrink-0">
                      support_agent
                    </span>
                    <div>
                      <strong className="text-xs text-[#1e293b] block">
                        Contacter le client
                      </strong>
                      <span className="text-[11px] text-[#64748b]">
                        Transférer au centre d’appels pour confirmation adresse
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleResolveAction('Retour en entrepôt validé')}
                    className="p-3.5 rounded-xl border border-[#cbd5e1] hover:border-amber-500 hover:bg-amber-50/20 text-left transition-colors flex items-start gap-2.5"
                  >
                    <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0">
                      assignment_return
                    </span>
                    <div>
                      <strong className="text-xs text-[#1e293b] block">
                        Valider retour entrepôt
                      </strong>
                      <span className="text-[11px] text-[#64748b]">
                        Générer bon de réintégration stock logistique
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleResolveAction('Commande annulée & remboursement')}
                    className="p-3.5 rounded-xl border border-[#cbd5e1] hover:border-rose-600 hover:bg-rose-50/20 text-left transition-colors flex items-start gap-2.5"
                  >
                    <span className="material-symbols-outlined text-rose-600 text-[20px] shrink-0">
                      cancel
                    </span>
                    <div>
                      <strong className="text-xs text-[#1e293b] block">
                        Annuler la commande
                      </strong>
                      <span className="text-[11px] text-[#64748b]">
                        Clôturer le dossier et avertir l'administration
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[#64748b] my-auto">
              <span className="material-symbols-outlined text-[36px] text-slate-400">
                check_circle
              </span>
              <p className="text-xs font-bold text-[#1e293b] mt-1">
                Aucune anomalie sélectionnée
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
