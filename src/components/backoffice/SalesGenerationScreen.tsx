import React, { useState } from 'react';
import { useTms } from '../../context/TmsContext';
import type { Delivery } from '../../types';
import type { SalesBlRequest } from '../../types/sales';
import { WAREHOUSES } from '../../data/logisticsReference';
import { getSaleKey, getSaleRemaining, prepareSalesBlRequest } from '../../utils/salesWorkflow';
import { SalesField, SalesPill, SalesSection } from './SalesUI';

export const SalesGenerationScreen: React.FC = () => {
  const { sales, deliveries, setBackofficeTab } = useTms();
  const selected = sales.dossiers.filter((sale) => sales.selectionIds.includes(getSaleKey(sale)));
  const [requests, setRequests] = useState<SalesBlRequest[]>(() => selected.map((sale) => prepareSalesBlRequest(sale, deliveries)));
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Delivery[]>([]);
  const [generating, setGenerating] = useState(false);
  const patch = (index: number, values: Partial<SalesBlRequest>) => setRequests((previous) => previous.map((request, position) => position === index ? { ...request, ...values } : request));
  const units = requests.reduce((sum: number, request: SalesBlRequest) => sum + Object.values(request.quantities).reduce((count, quantity) => count + (quantity || 0), 0), 0);
  const weight = requests.reduce((sum, request) => {
    const sale = sales.dossiers.find((item) => item.id === request.dossierId && item.systemId === request.systemId);
    return sum + (sale?.items.reduce((count, line) => count + (line.unitWeightKg ?? request.unitWeights?.[line.id] ?? 0) * (request.quantities[line.id] || 0), 0) || 0);
  }, 0);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (generating) return;
    const form = event.currentTarget;
    setGenerating(true);
    try { const result = await sales.generateBls(requests); setCreated(result); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de générer les BL.'); form.scrollTo({ top: 0, behavior: 'smooth' }); }
    finally { setGenerating(false); }
  };

  if (created.length) return <div className="bo-page gap-4">
    <div><h1>BL générés</h1><p className="mt-1 text-sm text-[#64748B]">Les dossiers de vente sont reliés à leurs nouveaux bons de livraison.</p></div>
    <div className="scrollbar-soft min-h-0 flex-1 space-y-4 overflow-y-auto">
      <div role="status" className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]">{created.length} BL généré(s). Ils sont disponibles dans « Ordres de livraison » au statut « À confirmer ».</div>
      <SalesSection title="Résultat de la génération"><div className="divide-y divide-[#E2E8F0]">{created.map((bl) => <div key={bl.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="font-mono text-sm font-semibold text-[#0057A8]">{bl.orderId}</p><p className="mt-1 text-sm text-[#475569]">{bl.customerName} · {bl.deliveryDate} · {bl.timeSlot}</p><p className="mt-1 text-xs text-[#64748B]">Dossier source : {bl.sourceSale?.dossierReference} · {bl.items.reduce((sum, line) => sum + line.quantity, 0)} unité(s) · {bl.packageCount} colis</p></div><SalesPill tone="blue">À confirmer</SalesPill></div>)}</div></SalesSection>
      <div className="flex flex-wrap gap-3"><button className="bo-button-primary" onClick={() => setBackofficeTab('orders')}>Voir les ordres de livraison</button><button className="bo-button-secondary" onClick={() => setBackofficeTab('sales')}>Retour aux dossiers de vente</button></div>
    </div>
  </div>;

  if (!requests.length) return <div className="bo-page gap-4"><h1>Générer les bons de livraison</h1><p className="text-sm text-[#64748B]">Sélectionnez d’abord les dossiers de vente à transformer.</p><div><button className="bo-button-primary" onClick={() => setBackofficeTab('sales')}>Choisir les dossiers</button></div></div>;

  return <div className="bo-page gap-4">
    <div className="shrink-0"><button className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-[#0057A8]" onClick={() => setBackofficeTab('sales')}><span className="material-symbols-outlined text-[18px]">arrow_back</span>Dossiers de vente</button><h1>Générer les bons de livraison</h1><p className="mt-1 text-sm text-[#64748B]">Vérifiez les quantités et complétez les informations de livraison avant la génération.</p></div>
    <form onSubmit={submit} className="@container scrollbar-soft min-h-0 flex-1 overflow-y-auto pr-1">
      <fieldset disabled={generating || sales.busy} className="grid min-w-0 items-start gap-4 @4xl:grid-cols-[minmax(0,1fr)_270px]">
        <div className="min-w-0 space-y-4">
          {error && <p role="alert" className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#B91C1C]">{error}</p>}
          {requests.map((request, index) => {
            const sale = sales.dossiers.find((item) => item.id === request.dossierId && item.systemId === request.systemId)!;
            const remaining = getSaleRemaining(sale, deliveries);
            const warehouse = WAREHOUSES.find((item) => item.id === request.warehouseId);
            const goodsValue = sale.items.reduce((sum, line) => sum + line.unitValue * (request.quantities[line.id] || 0), 0);
            return <SalesSection key={getSaleKey(sale)} title={`${sale.reference} · ${sale.customerName}`} subtitle={`${sale.systemName} · ${sale.commercialStatus} · ${sale.collectionMode}`}>
              <fieldset><legend className="mb-3 text-[13px] font-semibold text-[#1F2937]">Articles et quantités à livrer</legend><p className="mb-3 text-xs text-[#64748B]">Saisissez 0 pour laisser un article à générer plus tard. Les quantités déjà couvertes par un BL sont déduites.</p>
                <div className="divide-y divide-[#E2E8F0]">{sale.items.map((line) => <div key={line.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"><div className="min-w-32 flex-1"><p className="text-sm font-medium text-[#1F2937]">{line.name}</p><p className="mt-1 text-xs text-[#64748B]">{line.ref} · {line.unitWeightKg ? line.unitWeightKg + ' kg/unité' : 'Poids à compléter'} · {line.quantity} commandée(s)</p><p className="mt-1 text-xs text-[#0057A8]">{remaining[line.id]} unité(s) encore disponible(s) pour un BL</p></div>{line.unitWeightKg == null && (request.quantities[line.id] || 0) > 0 && <SalesField label={`Poids unitaire (kg) · ${line.ref}`} className="w-44"><input required type="number" min="0.001" step="any" className="bo-input w-full" value={request.unitWeights?.[line.id] || ''} onChange={e => patch(index, { unitWeights: { ...request.unitWeights, [line.id]: Number(e.target.value) } })} /></SalesField>}<SalesField label={`Quantité à livrer · ${line.ref}`} className="w-44"><input required type="number" min="0" max={remaining[line.id]} step="1" disabled={remaining[line.id] === 0} className="bo-input w-full disabled:bg-[#F8FAFC]" value={request.quantities[line.id] ?? 0} onChange={(event) => patch(index, { quantities: { ...request.quantities, [line.id]: Number(event.target.value) } })} /></SalesField></div>)}</div>
              </fieldset>
              <fieldset className="mt-5 border-t border-[#E2E8F0] pt-4"><legend className="text-[13px] font-semibold text-[#1F2937]">Destination & livraison</legend>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <SalesField label={`Téléphone * · ${sale.reference}`}><input required type="tel" className="bo-input w-full" value={request.phone} onChange={(event) => patch(index, { phone: event.target.value })} placeholder="06 00 00 00 00" /></SalesField>
                  <SalesField label={`Entrepôt * · ${sale.reference}`}><select required className="bo-input w-full" value={request.warehouseId} onChange={(event) => patch(index, { warehouseId: event.target.value, district: '' })}>{WAREHOUSES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></SalesField>
                  <SalesField label={`Adresse complète * · ${sale.reference}`} className="sm:col-span-2"><input required className="bo-input w-full" value={request.address} onChange={(event) => patch(index, { address: event.target.value })} placeholder="Rue, immeuble, étage, appartement…" /></SalesField>
                  <SalesField label={`Quartier * · ${sale.reference}`}><select required className="bo-input w-full" value={request.district} onChange={(event) => patch(index, { district: event.target.value })}><option value="">Choisir un quartier</option>{warehouse?.zones.map((zone) => <option key={zone}>{zone}</option>)}</select></SalesField>
                  <SalesField label={`Ville * · ${sale.reference}`}><input required className="bo-input w-full" value={request.city} onChange={(event) => patch(index, { city: event.target.value })} /></SalesField>
                  <SalesField label={`Date de livraison * · ${sale.reference}`}><input required type="date" className="bo-input w-full" value={request.date} onInput={(event) => patch(index, { date: event.currentTarget.value })} onChange={(event) => patch(index, { date: event.target.value })} /></SalesField>
                  <SalesField label={`Nombre de colis * · ${sale.reference}`} hint="Le nombre de colis est indépendant du nombre d’articles."><input required type="number" min="1" step="1" className="bo-input w-full" value={request.packageCount || ''} onChange={(event) => patch(index, { packageCount: Number(event.target.value) })} /></SalesField>
                  <SalesField label={`Début du créneau * · ${sale.reference}`}><input required type="time" className="bo-input w-full" value={request.startTime} onInput={(event) => patch(index, { startTime: event.currentTarget.value })} onChange={(event) => patch(index, { startTime: event.target.value })} /></SalesField>
                  <SalesField label={`Fin du créneau * · ${sale.reference}`}><input required type="time" className="bo-input w-full" value={request.endTime} onInput={(event) => patch(index, { endTime: event.currentTarget.value })} onChange={(event) => patch(index, { endTime: event.target.value })} /></SalesField>
                  <SalesField label={`Latitude * · ${sale.reference}`} hint="Coordonnées vérifiées pour la cartographie."><input required type="number" min="-90" max="90" step="any" className="bo-input w-full" value={request.latitude} onChange={(event) => patch(index, { latitude: event.target.value })} /></SalesField>
                  <SalesField label={`Longitude * · ${sale.reference}`}><input required type="number" min="-180" max="180" step="any" className="bo-input w-full" value={request.longitude} onChange={(event) => patch(index, { longitude: event.target.value })} /></SalesField>
                  <SalesField label={`Véhicule requis * · ${sale.reference}`}><select className="bo-input w-full" value={request.requiredVehicle} onChange={(event) => patch(index, { requiredVehicle: event.target.value as SalesBlRequest['requiredVehicle'] })}>{['Fourgon', '3.5T', 'Camion'].map((type) => <option key={type}>{type}</option>)}</select></SalesField>
                  <div><p className="mb-1.5 text-[13px] font-medium text-[#475569]">Valeur des articles sélectionnés</p><p className="py-2 font-mono text-sm text-[#334155]">{goodsValue.toLocaleString('fr-FR')} MAD</p></div>
                  <SalesField label={`Instructions · ${sale.reference}`} className="sm:col-span-2"><textarea className="bo-input h-auto min-h-20 w-full py-2" value={request.instructions} onChange={(event) => patch(index, { instructions: event.target.value })} /></SalesField>
                </div>
              </fieldset>
            </SalesSection>;
          })}
        </div>
        <aside className="min-w-0 @4xl:sticky @4xl:top-0"><SalesSection title="Résumé de génération"><dl className="space-y-4 text-sm"><div><dt className="text-xs text-[#64748B]">Dossiers sélectionnés</dt><dd className="mt-1 font-semibold">{requests.length}</dd></div><div><dt className="text-xs text-[#64748B]">Unités à livrer</dt><dd className="mt-1">{units}</dd></div><div><dt className="text-xs text-[#64748B]">Poids total sélectionné</dt><dd className="mt-1 font-mono">{weight.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} kg</dd></div><div><dt className="text-xs text-[#64748B]">Statut des futurs BL</dt><dd className="mt-2"><SalesPill tone="blue">À confirmer</SalesPill></dd></div></dl><p className="mt-4 text-xs leading-5 text-[#64748B]">Un BL sera généré par dossier sélectionné, avec une référence unique et le lien vers le dossier source.</p><div className="mt-4 space-y-2 border-t border-[#E2E8F0] pt-4"><button type="submit" className="bo-button-primary w-full"><span className="material-symbols-outlined text-[18px]">note_add</span>Générer {requests.length} BL</button><button type="button" className="bo-button-secondary w-full" onClick={() => setBackofficeTab('sales')}>Retour aux dossiers</button></div></SalesSection></aside>
      </fieldset>
    </form>
  </div>;
};
