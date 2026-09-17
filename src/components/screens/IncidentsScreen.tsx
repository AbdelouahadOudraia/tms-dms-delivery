import React from 'react';
import { IncidentReport, ScreenType } from '../../types';

interface IncidentsScreenProps {
  incidents: IncidentReport[];
  onNavigate: (screen: ScreenType) => void;
  onOpenReportModal: () => void;
}

export const IncidentsScreen: React.FC<IncidentsScreenProps> = ({
  incidents,
  onNavigate,
  onOpenReportModal,
}) => {
  return (
    <div className="flex-1 w-full max-w-2xl mx-auto p-4 space-y-4 pb-24 animate-in fade-in duration-200">
      <div className="bg-white border border-[#c5c5d3] rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ba1a1a]">
              report_problem
            </span>
            <h2 className="text-[16px] font-bold text-[#131b2e]">
              Journal des Incidents & Assistance
            </h2>
          </div>
          <button
            onClick={onOpenReportModal}
            className="bg-[#ba1a1a] hover:bg-red-700 text-white text-[12px] font-bold px-3 py-1.5 rounded flex items-center gap-1 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add_alert</span>
            <span>Déclarer une anomalie</span>
          </button>
        </div>

        {/* Dispatcher Broadcast Message */}
        <div className="bg-[#FFFBEB] border border-[#FDE68A] p-3 rounded-md flex items-start gap-3">
          <span className="material-symbols-outlined text-[#D97706] text-[20px] mt-0.5">
            campaign
          </span>
          <div className="text-[12px] space-y-0.5">
            <span className="font-bold text-[#D97706] uppercase tracking-wider block">
              Message Dispatch Central (10:15)
            </span>
            <p className="text-[#131b2e]">
              Ralentissement signalé sur Boulevard Zerktouni suite à travaux de voirie.
              Privilégiez le front de mer / Corniche pour les stops 02 et 03.
            </p>
          </div>
        </div>

        {/* Direct Dispatch Hotline Action */}
        <div className="flex items-center justify-between bg-[#f2f3ff] border border-[#c5c5d3] p-3 rounded-md">
          <div>
            <span className="text-[11px] font-bold text-[#444651] uppercase block">
              Permanence Dispatch Chauffeurs
            </span>
            <span className="text-[14px] font-bold text-[#0057A8] font-code-tabular">
              05 22 00 11 22 (Ligne prioritaire)
            </span>
          </div>
          <a
            href="tel:0522001122"
            className="bg-[#0057A8] hover:bg-[#004280] text-white text-[12px] font-bold px-3 py-2 rounded flex items-center gap-1 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">phone_in_talk</span>
            <span>Appeler le régulateur</span>
          </a>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-3">
        <h3 className="text-[13px] font-bold text-[#444651] uppercase tracking-wider">
          Historique des signalements ({incidents.length})
        </h3>

        {incidents.length === 0 ? (
          <div className="bg-white border border-[#c5c5d3] rounded-lg p-6 text-center text-[#757682]">
            <span className="material-symbols-outlined text-[36px] text-[#059669]">
              check_circle
            </span>
            <p className="text-[14px] font-semibold mt-2 text-[#131b2e]">
              Aucun incident bloquant sur la tournée
            </p>
            <p className="text-[12px] text-[#444651] mt-1">
              Tous les colis sont acheminés selon le plan de transport prévu.
            </p>
          </div>
        ) : (
          incidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-white border border-[#c5c5d3] rounded-lg p-3.5 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-code-tabular text-[11px] bg-[#eaedff] text-[#0057A8] font-bold px-2 py-0.5 rounded border border-[#c5c5d3]">
                    {inc.id}
                  </span>
                  <span className="text-[14px] font-bold text-[#131b2e]">
                    {inc.type}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                    inc.status === 'Résolu'
                      ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]'
                      : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                  }`}
                >
                  {inc.status}
                </span>
              </div>

              <p className="text-[13px] text-[#444651]">{inc.details}</p>

              <div className="flex items-center justify-between text-[11px] text-[#757682] pt-2 border-t border-[#c5c5d3]/50 font-code-tabular">
                <span>Stop concerné : {inc.stopName}</span>
                <span>Signalé à {inc.reportedAt}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
