import React, { useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { MoreButton, PageHeader, SectionHeader, SimpleModal } from '../common/BackofficeUI';
import { GoogleMapCard } from '../maps/GoogleMapCard';

export const ZonesScreen: React.FC = () => {
  const { zones, addZone } = useTms();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('Casablanca-Settat');
  const selected = zones.find((zone) => zone.id === selectedId);

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    addZone({ name: name.trim(), region: region.trim(), addressesCount: 0, activeToursCount: 0 });
    setName('');
    setShowAdd(false);
  };

  return <div className="bo-page">
    <PageHeader title="Zones de livraison" subtitle="Organisation des secteurs de livraison de Casablanca et du Grand Casablanca" actions={<button onClick={() => setShowAdd(true)} className="bo-button-primary"><span className="material-symbols-outlined text-[18px]">add</span>Ajouter une zone</button>} />
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="bo-panel flex min-h-0 flex-col overflow-hidden"><SectionHeader title="Zones opérationnelles" subtitle={`${zones.length} zone(s) configurée(s)`} /><div className="scrollbar-soft min-h-0 flex-1 overflow-auto"><table className="bo-table"><thead><tr><th>Nom</th><th>Région / ville</th><th>Adresses</th><th>Tournées actives</th><th className="text-right">Actions</th></tr></thead><tbody>{zones.map((zone) => <tr key={zone.id}><td className="font-medium text-[#1F2937]">{zone.name}</td><td>{zone.region}</td><td className="font-mono">{zone.addressesCount}</td><td className="font-mono text-[#0057A8]">{zone.activeToursCount}</td><td className="text-right"><MoreButton onClick={() => setSelectedId(zone.id)} /></td></tr>)}</tbody></table></div></section>
      <aside className="bo-panel overflow-hidden">
        <SectionHeader title="Aperçu cartographique" subtitle="Casablanca" />
        <div className="p-4">
          <p className="mb-4 text-[13px] leading-5 text-[#64748B]">Visualisation des zones de livraison sur Google Maps.</p>
          <GoogleMapCard
            query="Casablanca, Maroc"
            zoom={12}
            title="Google Maps — zones de livraison Casablanca"
            className="h-[360px]"
            markers={[
              { id: 'zone-ouest', label: 'Ouest', detail: 'Maarif, Ain Diab, Hay Hassani', kind: 'stop', x: 28, y: 54 },
              { id: 'zone-centre', label: 'Centre', detail: 'Sidi Belyout, Belvédère', kind: 'success', x: 48, y: 48 },
              { id: 'zone-est', label: 'Est', detail: 'Ain Sebaa, Sidi Moumen', kind: 'driver', x: 72, y: 42 },
              { id: 'zone-sud', label: 'Sud', detail: 'Californie, Bouskoura', kind: 'attention', x: 58, y: 72 },
            ]}
            routePath={[]}
            markerSize="sm"
            showOpenLink={false}
            showLegend={false}
          />
        </div>
      </aside>
    </div>
    {showAdd && <SimpleModal title="Ajouter une zone" subtitle="Créer un nouveau secteur opérationnel" onClose={() => setShowAdd(false)}><form onSubmit={handleAdd} className="space-y-4 p-5"><label className="block text-[13px] font-medium text-[#475569]">Nom de la zone<input value={name} onChange={(event) => setName(event.target.value)} className="bo-input mt-1.5 w-full" required /></label><label className="block text-[13px] font-medium text-[#475569]">Région / ville<input value={region} onChange={(event) => setRegion(event.target.value)} className="bo-input mt-1.5 w-full" required /></label><div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4"><button type="button" onClick={() => setShowAdd(false)} className="bo-button-secondary">Annuler</button><button type="submit" className="bo-button-primary">Ajouter</button></div></form></SimpleModal>}
    {selected && <SimpleModal title={selected.name} subtitle={selected.id} onClose={() => setSelectedId(null)}><div className="grid grid-cols-2 gap-4 p-5 text-sm"><div><p className="text-[#64748B]">Région</p><p className="mt-1 font-medium">{selected.region}</p></div><div><p className="text-[#64748B]">Adresses</p><p className="mt-1 font-mono">{selected.addressesCount}</p></div><div><p className="text-[#64748B]">Tournées actives</p><p className="mt-1 font-mono text-[#0057A8]">{selected.activeToursCount}</p></div></div></SimpleModal>}
  </div>;
};
