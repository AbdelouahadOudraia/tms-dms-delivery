import React, { useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { SimpleModal } from '../common/BackofficeUI';
import type { Delivery } from '../../types';

export const OrdersScreen: React.FC = () => {
  const { deliveries, confirmDeliveryOrder, setBackofficeTab } = useTms();

  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('Tous');
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  const unassignedDeliveries = deliveries.filter((delivery) => !delivery.tourId && !delivery.driverId);

  const filteredDeliveries = unassignedDeliveries.filter((d) => {
    const matchSearch =
      d.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDistrict = districtFilter === 'Tous' || d.district === districtFilter;

    return matchSearch && matchDistrict;
  });

  const districts = Array.from(new Set(unassignedDeliveries.map((d) => d.district)));
  const readyForPlanningCount = deliveries.filter(
    (delivery) => delivery.status === 'À planifier' && !delivery.tourId
  ).length;
  const formatBlNumber = (orderId: string) => orderId.replace(/^CMD-/, 'BL-');

  const handleConfirmOrder = (deliveryId: string, orderId: string) => {
    confirmDeliveryOrder(deliveryId);
    setConfirmationMessage(`${formatBlNumber(orderId)} confirmé et disponible pour la création de tournée.`);
    setTimeout(() => setConfirmationMessage(null), 3500);
  };

  return (
    <div className="bo-page gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Ordres de livraison</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Liste des BL non affectés à une tournée ou à un chauffeur.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] text-[#64748B]">
            Total : <strong>{filteredDeliveries.length}</strong> commande(s)
          </span>
          {readyForPlanningCount > 0 && (
            <button
              type="button"
              onClick={() => setBackofficeTab('tour-create')}
              className="bo-button-primary"
            >
              <span className="material-symbols-outlined text-[18px]">alt_route</span>
              <span>Créer une tournée ({readyForPlanningCount})</span>
            </button>
          )}
        </div>
      </div>

      {confirmationMessage && (
        <div className="flex h-10 shrink-0 items-center justify-between rounded-md bg-[#F0FDF4] px-3 text-[13px] font-medium text-[#166534]">
          <span>{confirmationMessage}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setBackofficeTab('tour-create')}
              className="font-bold text-[#0057A8] hover:underline"
            >
              Créer une tournée
            </button>
            <button onClick={() => setConfirmationMessage(null)} className="opacity-80 hover:opacity-100">✕</button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bo-panel grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {/* Search */}
        <label className="text-[13px] font-medium text-[#475569]">
          <span className="mb-1.5 block">Recherche</span>
          <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#94a3b8] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Rechercher commande, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bo-input w-full pl-9"
          />
          </div>
        </label>

        {/* District Filter */}
        <label className="text-[13px] font-medium text-[#475569]"><span className="mb-1.5 block">Quartier</span>
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bo-input w-full"
          >
            <option value="Tous">Tous les quartiers (Casablanca)</option>
            {districts.map((dst) => (
              <option key={dst} value={dst}>
                {dst}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Orders Table */}
      <div className="bo-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-soft">
          <table className="bo-table min-w-[900px]">
            <thead className="bg-slate-50 text-[#64748b] border-b border-[#e2e8f0] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-semibold">N° BL</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Téléphone</th>
                <th className="px-4 py-3 font-semibold">Adresse</th>
                <th className="px-4 py-3 font-semibold">Quartier / Ville</th>
                <th className="px-4 py-3 font-semibold">Créneau</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredDeliveries.map((del) => {
                const confirmable = del.status === 'À confirmer';
                const alreadyConfirmed = del.status === 'À planifier' || del.status === 'Planifiée';

                return (
                  <tr key={del.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-[#0057A8]">
                      {formatBlNumber(del.orderId)}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1e293b]">
                      {del.customerName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[#475569]">
                      {del.phone}
                    </td>
                    <td className="px-4 py-3 text-[#334155] max-w-[200px] truncate">
                      {del.address}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#64748b]">
                      {del.district}, {del.city}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-[#1e293b]">
                      {del.timeSlot}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedDelivery(del)}
                          title="Voir les détails du BL"
                          className="rounded border border-[#cbd5e1] px-2.5 py-1 text-xs font-semibold text-[#0057A8] hover:bg-slate-100"
                        >
                          Détails
                        </button>
                        <button
                          type="button"
                          disabled={!confirmable}
                          onClick={() => handleConfirmOrder(del.id, del.orderId)}
                          title={confirmable ? 'Confirmer ce BL' : alreadyConfirmed ? 'BL déjà confirmé' : 'BL déjà traité ou affecté'}
                          className={`rounded border px-2.5 py-1 text-xs font-semibold ${
                            confirmable
                              ? 'border-[#cbd5e1] text-[#0057A8] hover:bg-slate-100'
                              : 'cursor-not-allowed border-[#E2E8F0] bg-[#F8FAFC] text-[#94A3B8]'
                          }`}
                        >
                          {alreadyConfirmed ? 'Confirmé' : 'Confirmer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDelivery && (
        <SimpleModal
          title={`Détails ${formatBlNumber(selectedDelivery.orderId)}`}
          subtitle="Informations de l'ordre de livraison"
          onClose={() => setSelectedDelivery(null)}
        >
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="text-[12px] font-medium text-[#64748B]">Client</p>
                <p className="mt-1 font-bold text-[#1e293b]">{selectedDelivery.customerName}</p>
              </div>
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="text-[12px] font-medium text-[#64748B]">Téléphone</p>
                <p className="mt-1 font-mono font-semibold text-[#1e293b]">{selectedDelivery.phone}</p>
              </div>
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="text-[12px] font-medium text-[#64748B]">Créneau</p>
                <p className="mt-1 font-mono font-semibold text-[#1e293b]">{selectedDelivery.timeSlot}</p>
              </div>
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="text-[12px] font-medium text-[#64748B]">Statut</p>
                <p className="mt-1 font-semibold text-[#1e293b]">{selectedDelivery.status}</p>
              </div>
            </div>

            <div className="rounded-md border border-[#E2E8F0] p-3">
              <p className="text-[12px] font-medium text-[#64748B]">Adresse</p>
              <p className="mt-1 text-sm font-medium text-[#1e293b]">{selectedDelivery.address}</p>
              <p className="mt-1 text-[13px] text-[#64748B]">
                {selectedDelivery.district}, {selectedDelivery.city}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-[#E2E8F0] p-3">
                <p className="text-[12px] font-medium text-[#64748B]">Tournée</p>
                <p className="mt-1 font-mono font-semibold text-[#1e293b]">
                  {selectedDelivery.tourId || 'Non affectée'}
                </p>
              </div>
              <div className="rounded-md border border-[#E2E8F0] p-3">
                <p className="text-[12px] font-medium text-[#64748B]">Chauffeur</p>
                <p className="mt-1 font-semibold text-[#1e293b]">
                  {selectedDelivery.driverName || 'Non affecté'}
                </p>
              </div>
            </div>

            <div className="rounded-md border border-[#E2E8F0]">
              <div className="border-b border-[#E2E8F0] px-3 py-2 text-[13px] font-bold text-[#1e293b]">
                Articles
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {selectedDelivery.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div>
                      <p className="font-semibold text-[#1e293b]">{item.name}</p>
                      <p className="text-[12px] text-[#64748B]">{item.ref} · {item.category}</p>
                    </div>
                    <div className="text-right font-mono text-[13px] text-[#475569]">
                      x{item.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedDelivery.instructions && (
              <div className="rounded-md border border-[#FED7AA] bg-[#FFF7ED] p-3">
                <p className="text-[12px] font-bold text-[#C2410C]">Consignes de livraison</p>
                <p className="mt-1 text-sm text-[#475569]">{selectedDelivery.instructions}</p>
              </div>
            )}

            <div className="flex justify-end border-t border-[#E2E8F0] pt-4">
              <button
                type="button"
                onClick={() => setSelectedDelivery(null)}
                className="bo-button-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </SimpleModal>
      )}
    </div>
  );
};
