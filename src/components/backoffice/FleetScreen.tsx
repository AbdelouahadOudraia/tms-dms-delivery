import React from 'react';
import { useTms } from '../../context/TmsContext';

interface FleetScreenProps {
  defaultTab?: 'drivers' | 'vehicles';
}

export const FleetScreen: React.FC<FleetScreenProps> = ({ defaultTab = 'drivers' }) => {
  const { drivers, vehicles } = useTms();
  const subTab = defaultTab === 'vehicles' ? 'vehicules' : 'chauffeurs';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5F6F7] overflow-hidden p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1D2229]">
            {subTab === 'chauffeurs' ? 'Gestion des Chauffeurs' : 'Parc des Véhicules'}
          </h1>
          <p className="text-xs text-[#5B6470] mt-0.5">
            Ressources de transport, permis de conduire, immatriculations et affectations opérationnelles.
          </p>
        </div>

      </div>

      {/* Content */}
      {subTab === 'chauffeurs' ? (
        <div className="flex-1 bg-white rounded-2xl border border-[#E3E5E8] shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E3E5E8] bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-[#5B6470] uppercase tracking-wider">
              Effectif des chauffeurs-livreurs
            </span>
            <span className="text-xs text-[#0057A8] font-semibold">
              3 chauffeurs actuellement en tournée
            </span>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-soft">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F5F6F7] text-[#5B6470] border-b border-[#E3E5E8] sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nom & Prénom</th>
                  <th className="px-4 py-3 font-semibold">Téléphone</th>
                  <th className="px-4 py-3 font-semibold">Permis</th>
                  <th className="px-4 py-3 font-semibold">Tournée active</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F6F7]">
                {drivers.map((drv) => {
                  let statusBadgeClass = 'bg-[#F5F6F7] text-[#5B6470]';
                  if (drv.status === 'En tournée') statusBadgeClass = 'bg-[#EAF5EE] text-[#176B3A] border border-[#BEE3CE]';
                  if (drv.status === 'Disponible') statusBadgeClass = 'bg-[#F5F6F7] text-[#1D2229] border border-[#E3E5E8]';
                  if (drv.status === 'Repos') statusBadgeClass = 'bg-[#FEF4EC] text-[#B8561B] border border-[#FBD9C3]';

                  return (
                    <tr key={drv.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#0057A8] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            {drv.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <div>
                            <strong className="text-sm text-[#1D2229] block">{drv.name}</strong>
                            <span className="font-mono text-[10px] text-[#5B6470]">{drv.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#5B6470]">{drv.phone}</td>
                      <td className="px-4 py-3.5 text-[#5B6470]">{drv.license}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-[#0057A8]">
                        {drv.currentTourId || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusBadgeClass}`}>
                          {drv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <a
                          href={`tel:${drv.phone.replace(/\s+/g, '')}`}
                          className="px-3 py-1 rounded-lg border border-[#E3E5E8] hover:bg-slate-50 text-[#0057A8] font-bold text-xs inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">call</span>
                          <span>Appeler</span>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-2xl border border-[#E3E5E8] shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E3E5E8] bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-[#5B6470] uppercase tracking-wider">
              Parc des véhicules utilitaires
            </span>
            <span className="text-xs text-[#5B6470]">Flotte fourgons frigorifiques & hayon élévateur</span>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-soft">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F5F6F7] text-[#5B6470] border-b border-[#E3E5E8] sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-semibold">Immatriculation</th>
                  <th className="px-4 py-3 font-semibold">Modèle</th>
                  <th className="px-4 py-3 font-semibold">Capacité de charge</th>
                  <th className="px-4 py-3 font-semibold">Chauffeur assigné</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F6F7]">
                {vehicles.map((vh) => {
                  let vhStatusClass = 'bg-[#F5F6F7] text-[#5B6470]';
                  if (vh.status === 'En service') vhStatusClass = 'bg-[#EAF5EE] text-[#176B3A] border border-[#BEE3CE]';
                  if (vh.status === 'Disponible') vhStatusClass = 'bg-[#F5F6F7] text-[#1D2229] border border-[#E3E5E8]';
                  if (vh.status === 'Maintenance') vhStatusClass = 'bg-[#FEF4EC] text-[#B8561B] border border-[#FBD9C3]';

                  const assignedDriver = drivers.find((d) => d.id === vh.assignedDriverId);

                  return (
                    <tr key={vh.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3.5 font-mono font-bold text-[#0057A8] text-sm">
                        {vh.id}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-[#1D2229]">{vh.model}</td>
                      <td className="px-4 py-3.5 font-mono text-[#5B6470]">{vh.capacity}</td>
                      <td className="px-4 py-3.5">
                        {assignedDriver ? (
                          <span className="font-medium text-[#1D2229]">{assignedDriver.name}</span>
                        ) : (
                          <span className="text-[#5B6470] italic">Non assigné</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${vhStatusClass}`}>
                          {vh.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
