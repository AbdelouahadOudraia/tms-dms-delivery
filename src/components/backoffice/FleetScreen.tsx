import React, { useMemo, useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { FilterBar, FilterField, MoreButton, PageHeader, SectionHeader, SimpleModal } from '../common/BackofficeUI';
import { StatusBadge } from '../common/StatusBadge';
import { Driver, Vehicle } from '../../types';

interface FleetScreenProps {
  defaultTab?: 'drivers' | 'vehicles';
}

export const FleetScreen: React.FC<FleetScreenProps> = ({ defaultTab = 'drivers' }) => {
  const { drivers, vehicles, addDriver, addVehicle } = useTms();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Tous');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('Permis C');
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [capacity, setCapacity] = useState('12m³');
  const isDrivers = defaultTab === 'drivers';

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    if (isDrivers) {
      if (!name.trim() || !phone.trim()) return;
      addDriver({ name: name.trim(), phone: phone.trim(), license, status: 'Disponible', rating: 5 });
      setName('');
      setPhone('');
    } else {
      if (!plate.trim() || !model.trim()) return;
      addVehicle({ id: plate.trim().toUpperCase(), model: model.trim(), capacity, status: 'Disponible' });
      setPlate('');
      setModel('');
    }
    setShowAdd(false);
  };

  const filteredDrivers = useMemo(() => drivers.filter((driver) => {
    const matchesQuery = `${driver.name} ${driver.phone} ${driver.id}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === 'Tous' || driver.status === status);
  }), [drivers, query, status]);

  const filteredVehicles = useMemo(() => vehicles.filter((vehicle) => {
    const matchesQuery = `${vehicle.id} ${vehicle.model}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === 'Tous' || vehicle.status === status);
  }), [vehicles, query, status]);

  return (
    <div className="bo-page">
      <PageHeader
        title={isDrivers ? 'Gestion des chauffeurs' : 'Parc des véhicules'}
        subtitle={isDrivers ? `${drivers.length} chauffeurs · affectations et disponibilité opérationnelle` : `${vehicles.length} véhicules · capacité, affectation et disponibilité`}
        actions={<button onClick={() => setShowAdd(true)} className="bo-button-primary"><span className="material-symbols-outlined text-[18px]">add</span>{isDrivers ? 'Ajouter un chauffeur' : 'Ajouter un véhicule'}</button>}
      />

      <FilterBar>
        <FilterField label="Recherche" className="min-w-[260px]">
          <div className="relative"><span className="material-symbols-outlined absolute left-3 top-2 text-[18px] text-[#94A3B8]">search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isDrivers ? 'Nom, téléphone ou identifiant' : 'Immatriculation ou modèle'} className="bo-input w-full pl-9" /></div>
        </FilterField>
        <FilterField label="Statut">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="bo-input w-full">
            <option>Tous</option>
            {(isDrivers ? ['En tournée', 'Disponible', 'Repos'] : ['En service', 'Disponible', 'Maintenance']).map((value) => <option key={value}>{value}</option>)}
          </select>
        </FilterField>
        {isDrivers && <FilterField label="Type"><select className="bo-input w-full"><option>Tous</option><option>Interne</option><option>Prestataire</option></select></FilterField>}
      </FilterBar>

      <section className="bo-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <SectionHeader title={isDrivers ? 'Chauffeurs-livreurs' : 'Véhicules utilitaires'} subtitle={isDrivers ? `${filteredDrivers.length} résultat(s)` : `${filteredVehicles.length} résultat(s)`} />
        <div className="scrollbar-soft min-h-0 flex-1 overflow-auto">
          {isDrivers ? (
            <table className="bo-table min-w-[880px]">
              <thead><tr><th>Chauffeur</th><th>Téléphone</th><th>Type</th><th>Permis</th><th>Tournée active</th><th>Statut</th><th className="text-right">Actions</th></tr></thead>
              <tbody>{filteredDrivers.map((driver) => <tr key={driver.id}>
                <td><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-xs font-semibold text-[#0057A8]">{driver.name.split(' ').map((name) => name[0]).join('').slice(0, 2)}</span><div><span className="block font-medium text-[#1F2937]">{driver.name}</span><span className="font-mono text-xs text-[#64748B]">{driver.id}</span></div></div></td>
                <td className="font-mono">{driver.phone}</td><td>Interne</td><td>{driver.license}</td><td className="font-mono text-[#0057A8]">{driver.currentTourId || '—'}</td><td><StatusBadge status={driver.status} size="sm" /></td>
                <td className="text-right"><div className="flex justify-end gap-1"><a href={`tel:${driver.phone.replace(/\s+/g, '')}`} title="Appeler" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0057A8]"><span className="material-symbols-outlined text-[18px]">call</span></a><MoreButton onClick={() => setSelectedDriver(driver)} /></div></td>
              </tr>)}</tbody>
            </table>
          ) : (
            <table className="bo-table min-w-[760px]">
              <thead><tr><th>Immatriculation</th><th>Modèle</th><th>Capacité</th><th>Chauffeur assigné</th><th>Statut</th><th className="text-right">Actions</th></tr></thead>
              <tbody>{filteredVehicles.map((vehicle) => {
                const assignedDriver = drivers.find((driver) => driver.id === vehicle.assignedDriverId);
                return <tr key={vehicle.id}><td className="font-mono font-medium text-[#0057A8]">{vehicle.id}</td><td className="font-medium text-[#1F2937]">{vehicle.model}</td><td>{vehicle.capacity}</td><td>{assignedDriver?.name || <span className="text-[#64748B]">Non assigné</span>}</td><td><StatusBadge status={vehicle.status} size="sm" /></td><td className="text-right"><MoreButton onClick={() => setSelectedVehicle(vehicle)} /></td></tr>;
              })}</tbody>
            </table>
          )}
        </div>
      </section>

      {showAdd && (
        <SimpleModal title={isDrivers ? 'Ajouter un chauffeur' : 'Ajouter un véhicule'} subtitle="Enregistrement local dans les données de démonstration" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4 p-5">
            {isDrivers ? (
              <>
                <label className="block text-[13px] font-medium text-[#475569]">Nom complet<input value={name} onChange={(event) => setName(event.target.value)} className="bo-input mt-1.5 w-full" required /></label>
                <label className="block text-[13px] font-medium text-[#475569]">Téléphone<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="06 00 00 00 00" className="bo-input mt-1.5 w-full" required /></label>
                <label className="block text-[13px] font-medium text-[#475569]">Permis<select value={license} onChange={(event) => setLicense(event.target.value)} className="bo-input mt-1.5 w-full"><option>Permis C</option><option>Permis C/EC</option><option>Permis B</option></select></label>
              </>
            ) : (
              <>
                <label className="block text-[13px] font-medium text-[#475569]">Immatriculation<input value={plate} onChange={(event) => setPlate(event.target.value)} placeholder="12345-A-6" className="bo-input mt-1.5 w-full font-mono" required /></label>
                <label className="block text-[13px] font-medium text-[#475569]">Modèle<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="Renault Master" className="bo-input mt-1.5 w-full" required /></label>
                <label className="block text-[13px] font-medium text-[#475569]">Capacité<input value={capacity} onChange={(event) => setCapacity(event.target.value)} className="bo-input mt-1.5 w-full" required /></label>
              </>
            )}
            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4"><button type="button" onClick={() => setShowAdd(false)} className="bo-button-secondary">Annuler</button><button type="submit" className="bo-button-primary">Enregistrer</button></div>
          </form>
        </SimpleModal>
      )}

      {(selectedDriver || selectedVehicle) && (
        <SimpleModal title={selectedDriver?.name || selectedVehicle?.model || 'Détail'} subtitle={selectedDriver?.id || selectedVehicle?.id} onClose={() => { setSelectedDriver(null); setSelectedVehicle(null); }}>
          <div className="grid grid-cols-2 gap-4 p-5 text-sm">
            {selectedDriver ? <><div><p className="text-[#64748B]">Téléphone</p><p className="mt-1 font-mono">{selectedDriver.phone}</p></div><div><p className="text-[#64748B]">Permis</p><p className="mt-1">{selectedDriver.license}</p></div><div><p className="text-[#64748B]">Tournée</p><p className="mt-1 font-mono">{selectedDriver.currentTourId || 'Aucune'}</p></div><div><p className="text-[#64748B]">Statut</p><div className="mt-1"><StatusBadge status={selectedDriver.status} /></div></div></> : <><div><p className="text-[#64748B]">Immatriculation</p><p className="mt-1 font-mono">{selectedVehicle?.id}</p></div><div><p className="text-[#64748B]">Capacité</p><p className="mt-1">{selectedVehicle?.capacity}</p></div><div><p className="text-[#64748B]">Statut</p><div className="mt-1"><StatusBadge status={selectedVehicle?.status || ''} /></div></div></>}
          </div>
        </SimpleModal>
      )}
    </div>
  );
};
