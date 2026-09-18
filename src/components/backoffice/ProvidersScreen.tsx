import React, { useState } from 'react';
import { PageHeader, SectionHeader } from '../common/BackofficeUI';
import { StatusBadge } from '../common/StatusBadge';

const providers = [
  { id: 'PREST-001', name: 'Casa Express Logistique', contact: 'Nadia El Idrissi', phone: '05 22 40 18 62', vehicles: 8, status: 'Actif' },
  { id: 'PREST-002', name: 'Atlas Last Mile', contact: 'Mehdi Bennis', phone: '05 22 31 44 90', vehicles: 5, status: 'Actif' },
  { id: 'PREST-003', name: 'Rapid Colis Maroc', contact: 'Salma Amrani', phone: '05 22 27 63 11', vehicles: 3, status: 'À vérifier' },
];

export const ProvidersScreen: React.FC = () => {
  const [selectedId, setSelectedId] = useState(providers[0].id);
  const selected = providers.find((provider) => provider.id === selectedId) || providers[0];

  return (
    <div className="bo-page">
      <PageHeader title="Prestataires" subtitle="Partenaires transport et capacité externe disponible" />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] gap-4 overflow-hidden">
        <section className="bo-panel flex min-h-0 flex-col overflow-hidden">
          <SectionHeader title="Prestataires référencés" subtitle={`${providers.length} partenaire(s)`} />
          <div className="scrollbar-soft min-h-0 flex-1 overflow-auto">
            <table className="bo-table min-w-[760px]">
              <thead><tr><th>Prestataire</th><th>Contact</th><th>Téléphone</th><th>Véhicules</th><th>Statut</th></tr></thead>
              <tbody>{providers.map((provider) => (
                <tr key={provider.id} onClick={() => setSelectedId(provider.id)} className={`cursor-pointer ${selectedId === provider.id ? '!bg-[#EFF6FF]' : ''}`}>
                  <td><span className="block font-medium text-[#1F2937]">{provider.name}</span><span className="font-mono text-xs text-[#64748B]">{provider.id}</span></td>
                  <td>{provider.contact}</td>
                  <td className="whitespace-nowrap font-mono">{provider.phone}</td>
                  <td className="font-mono">{provider.vehicles}</td>
                  <td><StatusBadge status={provider.status} size="sm" /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
        <aside className="bo-panel overflow-hidden">
          <SectionHeader title="Fiche prestataire" subtitle={selected.id} />
          <div className="space-y-4 p-5 text-sm">
            <div><p className="text-[13px] text-[#64748B]">Société</p><p className="mt-1 font-semibold text-[#1F2937]">{selected.name}</p></div>
            <div><p className="text-[13px] text-[#64748B]">Contact opérationnel</p><p className="mt-1 font-medium text-[#1F2937]">{selected.contact}</p></div>
            <div><p className="text-[13px] text-[#64748B]">Capacité déclarée</p><p className="mt-1 font-mono text-[#1F2937]">{selected.vehicles} véhicules</p></div>
            <a href={`tel:${selected.phone.replace(/\s+/g, '')}`} className="bo-button-secondary w-full"><span className="material-symbols-outlined text-[18px]">call</span>Appeler le contact</a>
          </div>
        </aside>
      </div>
    </div>
  );
};
