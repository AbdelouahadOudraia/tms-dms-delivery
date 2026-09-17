import React from 'react';
import { ScreenType } from '../../types';

interface ProfileScreenProps {
  onNavigate: (screen: ScreenType) => void;
  deliveredCount: number;
  totalCount: number;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onNavigate,
  deliveredCount,
  totalCount,
}) => {
  return (
    <div className="flex-1 w-full max-w-2xl mx-auto p-4 space-y-4 pb-24 animate-in fade-in duration-200">
      {/* Driver Identity Card */}
      <div className="bg-white border border-[#c5c5d3] rounded-lg p-4 shadow-xs flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#004280] text-white flex items-center justify-center text-[24px] font-bold shadow">
          YA
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-bold text-[#131b2e]">
              Youssef El Amrani
            </h2>
            <span className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-[10px] font-bold px-1.5 py-0.5 rounded">
              Actif
            </span>
          </div>
          <p className="text-[12px] text-[#444651]">
            Chauffeur-Livreur Poids Lourds & Messagerie
          </p>
          <div className="flex items-center gap-2 mt-1 text-[11px] font-code-tabular text-[#757682]">
            <span>Matricule : CH-4491</span>
            <span>•</span>
            <span>Permis C/EC certifié</span>
          </div>
        </div>
      </div>

      {/* Vehicle & Tour Assignment */}
      <div className="bg-white border border-[#c5c5d3] rounded-lg p-4 shadow-xs space-y-3">
        <h3 className="text-[13px] font-bold text-[#131b2e] uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0057A8] text-[18px]">
            local_shipping
          </span>
          <span>Véhicule & Tournée Assignée</span>
        </h3>

        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="bg-[#f2f3ff] p-2.5 rounded border border-[#c5c5d3]">
            <span className="text-[#444651] block text-[11px]">Immatriculation</span>
            <span className="font-bold text-[#0057A8] font-code-tabular text-[14px]">
              12345-A-6
            </span>
          </div>
          <div className="bg-[#f2f3ff] p-2.5 rounded border border-[#c5c5d3]">
            <span className="text-[#444651] block text-[11px]">Modèle</span>
            <span className="font-bold text-[#131b2e]">Renault Master 14m³</span>
          </div>
          <div className="bg-[#f2f3ff] p-2.5 rounded border border-[#c5c5d3]">
            <span className="text-[#444651] block text-[11px]">Tournée ID</span>
            <span className="font-bold text-[#0057A8] font-code-tabular text-[14px]">
              TR-2026-058
            </span>
          </div>
          <div className="bg-[#f2f3ff] p-2.5 rounded border border-[#c5c5d3]">
            <span className="text-[#444651] block text-[11px]">Progression</span>
            <span className="font-bold text-[#059669] font-code-tabular text-[14px]">
              {deliveredCount} / {totalCount} terminées
            </span>
          </div>
        </div>
      </div>

      {/* Fleet Telemetry & Battery */}
      <div className="bg-white border border-[#c5c5d3] rounded-lg p-4 shadow-xs space-y-3">
        <h3 className="text-[13px] font-bold text-[#131b2e] uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-[#1976D2] text-[18px]">
            sensors
          </span>
          <span>Télémétrie Terminal Embarqué</span>
        </h3>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="border border-[#c5c5d3] p-2 rounded">
            <span className="text-[10px] text-[#444651] block uppercase">Batterie</span>
            <span className="text-[14px] font-bold text-[#059669] font-code-tabular">
              94% (En charge)
            </span>
          </div>
          <div className="border border-[#c5c5d3] p-2 rounded">
            <span className="text-[10px] text-[#444651] block uppercase">Réseau</span>
            <span className="text-[14px] font-bold text-[#0057A8] font-code-tabular">
              4G LTE • 4/4
            </span>
          </div>
          <div className="border border-[#c5c5d3] p-2 rounded">
            <span className="text-[10px] text-[#444651] block uppercase">Stockage e-POD</span>
            <span className="text-[14px] font-bold text-[#131b2e] font-code-tabular">
              100% Synchro
            </span>
          </div>
        </div>
      </div>

      {/* KPI Performance */}
      <div className="bg-white border border-[#c5c5d3] rounded-lg p-4 shadow-xs space-y-2.5">
        <h3 className="text-[13px] font-bold text-[#131b2e] uppercase tracking-wider">
          Performance Opérationnelle (Mois en cours)
        </h3>
        <div className="flex justify-between items-center py-1.5 border-b border-[#eaedff]">
          <span className="text-[13px] text-[#444651]">Respect des créneaux SLA</span>
          <span className="text-[14px] font-bold text-[#059669] font-code-tabular">
            98.4%
          </span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-[#eaedff]">
          <span className="text-[13px] text-[#444651]">Taux de complétion 1er passage</span>
          <span className="text-[14px] font-bold text-[#0057A8] font-code-tabular">
            99.1%
          </span>
        </div>
        <div className="flex justify-between items-center py-1.5">
          <span className="text-[13px] text-[#444651]">Temps d'arrêt moyen par stop</span>
          <span className="text-[14px] font-bold text-[#131b2e] font-code-tabular">
            6 min 20s
          </span>
        </div>
      </div>

      {/* Action to switch back to tour */}
      <button
        onClick={() => onNavigate('dashboard')}
        className="w-full min-h-[48px] bg-[#0057A8] hover:bg-[#004280] text-white font-bold text-[14px] rounded flex items-center justify-center gap-2 shadow"
      >
        <span className="material-symbols-outlined text-[18px]">
          format_list_bulleted
        </span>
        <span>Reprendre la tournée active</span>
      </button>
    </div>
  );
};
