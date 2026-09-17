import React, { useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { StatusBadge } from '../common/StatusBadge';
import { Delivery } from '../../types';

export const OrdersScreen: React.FC = () => {
  const { deliveries, drivers, setSelectedDeliveryId, setBackofficeTab } = useTms();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [driverFilter, setDriverFilter] = useState('Tous');
  const [districtFilter, setDistrictFilter] = useState('Tous');
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Delivery | null>(null);

  const filteredDeliveries = deliveries.filter((d) => {
    const matchSearch =
      d.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'Tous' || d.status === statusFilter;
    const matchDriver = driverFilter === 'Tous' || d.driverName === driverFilter;
    const matchDistrict = districtFilter === 'Tous' || d.district === districtFilter;

    return matchSearch && matchStatus && matchDriver && matchDistrict;
  });

  const districts = Array.from(new Set(deliveries.map((d) => d.district)));

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden p-6 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Gestion des commandes</h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            Liste de l'ensemble des commandes expédiées, en cours de livraison ou en attente d'affectation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#64748b]">
            Total : <strong>{filteredDeliveries.length}</strong> commande(s)
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#94a3b8] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Rechercher commande, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#cbd5e1] text-xs font-medium text-[#1e293b] focus:border-[#0057A8] focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-[#cbd5e1] text-xs font-medium text-[#1e293b] focus:border-[#0057A8] focus:outline-none bg-white"
          >
            <option value="Tous">Tous les statuts</option>
            <option value="À planifier">À planifier</option>
            <option value="Affectée">Affectée</option>
            <option value="En route">En route</option>
            <option value="Livraison en cours">Livraison en cours</option>
            <option value="À valider">À valider</option>
            <option value="Validée">Validée</option>
            <option value="Échec">Échec</option>
            <option value="Rejetée">Rejetée</option>
          </select>
        </div>

        {/* Driver Filter */}
        <div>
          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-[#cbd5e1] text-xs font-medium text-[#1e293b] focus:border-[#0057A8] focus:outline-none bg-white"
          >
            <option value="Tous">Tous les chauffeurs</option>
            {drivers.map((drv) => (
              <option key={drv.id} value={drv.name}>
                {drv.name}
              </option>
            ))}
          </select>
        </div>

        {/* District Filter */}
        <div>
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-[#cbd5e1] text-xs font-medium text-[#1e293b] focus:border-[#0057A8] focus:outline-none bg-white"
          >
            <option value="Tous">Tous les quartiers (Casablanca)</option>
            {districts.map((dst) => (
              <option key={dst} value={dst}>
                {dst}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 bg-white rounded-2xl border border-[#e2e8f0] shadow-xs flex flex-col overflow-hidden">
        <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-soft">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[#64748b] border-b border-[#e2e8f0] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-semibold">N° Commande</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Téléphone</th>
                <th className="px-4 py-3 font-semibold">Adresse</th>
                <th className="px-4 py-3 font-semibold">Quartier / Ville</th>
                <th className="px-4 py-3 font-semibold">Créneau</th>
                <th className="px-4 py-3 font-semibold">Chauffeur</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredDeliveries.map((del) => (
                <tr key={del.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#0057A8]">
                    {del.orderId}
                  </td>
                  <td className="px-4 py-3 font-bold text-[#1e293b]">
                    {del.customerName}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#475569]">
                    {del.phone}
                  </td>
                  <td className="px-4 py-3 text-[#334155] max-w-[200px] truncate">
                    {del.address}
                  </td>
                  <td className="px-4 py-3 text-[#64748b]">
                    {del.district}, {del.city}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-[#1e293b]">
                    {del.timeSlot}
                  </td>
                  <td className="px-4 py-3 text-[#334155] font-medium">
                    {del.driverName || 'Non assigné'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={del.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedOrderForModal(del)}
                        className="px-2.5 py-1 rounded border border-[#cbd5e1] hover:bg-slate-100 text-[#0057A8] font-semibold text-[11px]"
                      >
                        Détails
                      </button>

                      {del.status === 'À valider' && (
                        <button
                          onClick={() => {
                            setSelectedDeliveryId(del.id);
                            setBackofficeTab('pending-validation');
                          }}
                          className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px]"
                        >
                          Valider e-POD
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedOrderForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="font-mono text-xs text-[#0057A8] font-bold">
                  {selectedOrderForModal.orderId}
                </span>
                <h3 className="text-base font-bold text-[#1e293b]">
                  Détail de la commande
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderForModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-[#64748b] block">Client</span>
                  <strong className="text-[#1e293b]">{selectedOrderForModal.customerName}</strong>
                </div>
                <div>
                  <span className="text-[#64748b] block">Téléphone</span>
                  <strong className="font-mono text-[#1e293b]">{selectedOrderForModal.phone}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-[#64748b] block">Adresse</span>
                  <strong className="text-[#1e293b]">{selectedOrderForModal.address}, {selectedOrderForModal.district}</strong>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#475569] mb-1.5 uppercase text-[10px] tracking-wider">
                  Articles commandés
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {selectedOrderForModal.items.map((it) => (
                    <div key={it.id} className="p-2.5 flex items-center justify-between bg-white text-xs">
                      <div>
                        <span className="font-bold text-[#1e293b] block">{it.name}</span>
                        <span className="text-[10px] text-[#64748b] font-mono">Réf: {it.ref}</span>
                      </div>
                      <span className="font-mono font-bold text-[#0057A8]">×{it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedOrderForModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#475569]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
