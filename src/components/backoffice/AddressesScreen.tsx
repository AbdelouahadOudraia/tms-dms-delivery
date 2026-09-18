import React, { useMemo, useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { FilterBar, FilterField, PageHeader, SectionHeader, SimpleModal } from '../common/BackofficeUI';
import { GoogleMapCard } from '../maps/GoogleMapCard';
import { StatusBadge } from '../common/StatusBadge';

export const AddressesScreen: React.FC = () => {
  const { addresses, zones, addAddress } = useTms();
  const [query, setQuery] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id || '');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [zone, setZone] = useState(zones[0]?.name || 'Casablanca Ouest');

  const filtered = useMemo(
    () => addresses.filter((address) => `${address.name} ${address.address} ${address.zone}`.toLowerCase().includes(query.toLowerCase())),
    [addresses, query]
  );
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) || addresses[0];

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const created = addAddress({ name: name.trim(), address: addressLine.trim(), city: 'Casablanca', zone, lat: 33.5731, lng: -7.5898, geocodingStatus: 'À vérifier' });
    setSelectedAddressId(created.id);
    setName('');
    setAddressLine('');
    setShowAdd(false);
  };

  return (
    <div className="bo-page">
      <PageHeader title="Adresses" subtitle="Référentiel des sites clients et statut de géocodage" actions={<button onClick={() => setShowAdd(true)} className="bo-button-primary"><span className="material-symbols-outlined text-[18px]">add</span>Ajouter une adresse</button>} />
      <FilterBar><FilterField label="Recherche" className="min-w-[320px]"><div className="relative"><span className="material-symbols-outlined absolute left-3 top-2 text-[18px] text-[#94A3B8]">search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Client, adresse ou zone" className="bo-input w-full pl-9" /></div></FilterField></FilterBar>
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        <section className="bo-panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <SectionHeader title="Référentiel clients" subtitle={`${filtered.length} adresse(s)`} />
          <div className="scrollbar-soft min-h-0 flex-1 overflow-auto"><table className="bo-table min-w-[900px]"><thead><tr><th>Client / site</th><th>Adresse</th><th>Ville</th><th>Zone</th><th>Latitude</th><th>Longitude</th><th>Géocodage</th></tr></thead><tbody>{filtered.map((address) => <tr key={address.id} onClick={() => setSelectedAddressId(address.id)} className={`cursor-pointer ${selectedAddressId === address.id ? '!bg-[#EFF6FF]' : ''}`}><td className="font-medium text-[#1F2937]">{address.name}</td><td>{address.address}</td><td>{address.city}</td><td>{address.zone}</td><td className="font-mono text-[13px]">{address.lat}</td><td className="font-mono text-[13px]">{address.lng}</td><td><StatusBadge status={address.geocodingStatus} size="sm" /></td></tr>)}</tbody></table></div>
        </section>
        <aside className="bo-panel hidden w-[340px] shrink-0 flex-col overflow-hidden xl:flex">
          <SectionHeader title="Aperçu adresse" subtitle={selectedAddress?.name} />
          <div className="p-4">
            <p className="text-sm leading-6 text-[#475569]">{selectedAddress?.address}</p>
            <p className="text-[13px] text-[#64748B]">{selectedAddress?.zone} · {selectedAddress?.city}</p>
            <GoogleMapCard
              query={`${selectedAddress?.address}, ${selectedAddress?.city}`}
              zoom={15}
              title={`Google Maps — ${selectedAddress?.name}`}
              className="mt-4 h-64"
              markers={
                selectedAddress
                  ? [
                      {
                        id: selectedAddress.id,
                        label: selectedAddress.name,
                        detail: selectedAddress.address,
                        kind: 'stop',
                        x: 50,
                        y: 50,
                      },
                    ]
                  : []
              }
              routePath={[]}
              markerSize="sm"
              showOpenLink={false}
              showMarkerLabels={false}
              showLegend={false}
            />
          </div>
        </aside>
      </div>
      {showAdd && <SimpleModal title="Ajouter une adresse" subtitle="La localisation sera marquée À vérifier" onClose={() => setShowAdd(false)}><form onSubmit={handleAdd} className="space-y-4 p-5"><label className="block text-[13px] font-medium text-[#475569]">Client / site<input value={name} onChange={(event) => setName(event.target.value)} className="bo-input mt-1.5 w-full" required /></label><label className="block text-[13px] font-medium text-[#475569]">Adresse<input value={addressLine} onChange={(event) => setAddressLine(event.target.value)} className="bo-input mt-1.5 w-full" required /></label><label className="block text-[13px] font-medium text-[#475569]">Zone<select value={zone} onChange={(event) => setZone(event.target.value)} className="bo-input mt-1.5 w-full">{zones.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label><div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4"><button type="button" onClick={() => setShowAdd(false)} className="bo-button-secondary">Annuler</button><button type="submit" className="bo-button-primary">Ajouter</button></div></form></SimpleModal>}
    </div>
  );
};
