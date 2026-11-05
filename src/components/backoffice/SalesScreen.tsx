import { useCompanySpace } from '../../context/CompanySpace';
import React, { useState } from 'react';
import { useTms } from '../../context/TmsContext';
import { getSaleEligibilityError, getSaleGenerationState, getSaleKey, getSaleRemaining, getSalesDossiersToConvert } from '../../utils/salesWorkflow';
import type { CommercialSource, SalesApiSettings, SalesDossier } from '../../types/sales';
import { sameSource } from '../../utils/salesSynchronization';
import { SalesDialog, SalesField, SalesPill } from './SalesUI';

export const SalesScreen: React.FC = () => {
  const { sales, deliveries, setBackofficeTab } = useTms();
  const activeSource = sales.approvedSources?.some(source => sameSource(source, sales.settings));
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<'api' | 'history' | 'changes' | null>(null);
  const [detail, setDetail] = useState<SalesDossier | null>(null);
  const statuses = sales.settings.eligibleStatuses;
  const retrieved = getSalesDossiersToConvert(sales.dossiers, [], statuses);
  const eligible = getSalesDossiersToConvert(sales.dossiers, deliveries, statuses);
  const changes = sales.dossiers.filter((sale) => sale.reviewRequired);
  const generatedBlCount = new Set(deliveries.filter((delivery) => delivery.sourceSale).map((delivery) => delivery.orderId)).size;
  const filtered = eligible.filter((sale) =>
    `${sale.reference} ${sale.customerName}`.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr')));
  const selectable = filtered.map(getSaleKey);
  const allSelected = selectable.length > 0 && selectable.every((id) => sales.selectionIds.includes(id));
  const selected = eligible.filter((sale) => sales.selectionIds.includes(getSaleKey(sale)));
  const selectionValid = selected.length > 0 && selected.every((sale) => !getSaleEligibilityError(sale, deliveries, statuses));
  const toggle = (key: string) => sales.setSelectionIds(sales.selectionIds.includes(key) ? sales.selectionIds.filter((id) => id !== key) : [...sales.selectionIds, key]);
  const prepare = (sale?: SalesDossier) => {
    sales.setSelectionIds(sale ? [getSaleKey(sale)] : selected.map(getSaleKey));
    setBackofficeTab('sales-generate');
  };
  const lastError = sales.operations[0]?.status === 'Erreur' && sales.message === sales.operations[0]?.message;

  return <div className="bo-page @container gap-4" style={{ overflowY: 'auto' }}>
    <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div><h1>Dossiers de vente</h1><p className="mt-1 text-sm text-[#64748B]">{sales.settings.companyName} · Synchronisez les dossiers éligibles, puis générez leurs bons de livraison.</p></div>
      <div className="flex flex-wrap gap-2">
        <button className="bo-button-secondary" disabled={!sales.ready} onClick={() => setPanel('api')}><span className="material-symbols-outlined text-[18px]">settings_input_component</span>Connexion API</button>
        <button className="bo-button-secondary" onClick={() => setPanel('history')}><span className="material-symbols-outlined text-[18px]">history</span>Historique</button>
        {changes.length > 0 && <button className="bo-button-secondary text-[#9A3412]" onClick={() => setPanel('changes')}>Changements à vérifier ({changes.length})</button>}
        <button className="bo-button-primary" disabled={!activeSource || sales.importing || sales.busy} onClick={sales.retrieveDossiers}><span className={`material-symbols-outlined text-[18px] ${sales.importing ? 'animate-spin' : ''}`}>{sales.importing ? 'progress_activity' : 'sync'}</span>{sales.importing || sales.busy ? 'Synchronisation…' : 'Synchroniser maintenant'}</button>
      </div>
    </div>
    <div className="bo-panel flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
      <label className="flex items-center gap-2 text-sm font-medium text-[#334155]"><input type="checkbox" className="h-4 w-4 accent-[#0057A8]" checked={sales.settings.automatic} disabled={!activeSource || sales.busy} onChange={(event) => sales.setAutomatic(event.target.checked)} />Synchronisation automatique</label>
      <span className="text-xs text-[#64748B]">{sales.settings.automatic ? `Toutes les ${sales.settings.intervalSeconds} s · service local actif` : 'Mode manuel'}</span>
      <div className="text-xs text-[#64748B]" aria-live="polite"><p>Dernière réussite : <strong>{sales.lastSuccessAt ? new Date(sales.lastSuccessAt).toLocaleString('fr-FR') : 'Aucune'}</strong></p><p className="mt-1">Prochaine synchronisation : <strong>{sales.nextSyncAt ? new Date(sales.nextSyncAt).toLocaleTimeString('fr-FR') : sales.importing ? 'En cours' : 'Non programmée'}</strong></p></div>
      <p className="w-full text-xs text-[#0057A8]">{activeSource ? 'Source : ' + sales.settings.sourceName : sales.settings.url ? 'Autorisation de la source retirée. Ouvrez « Connexion API ».' : 'API commerciale à configurer. Ouvrez « Connexion API ».'}</p>
    </div>
    {sales.serviceError && <p role="alert" className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#B91C1C]">{sales.serviceError}</p>}
    <div className="grid shrink-0 grid-cols-3 gap-3">
      {[{ label: 'Dossiers récupérés', value: retrieved.length }, { label: 'À transformer en BL', value: eligible.length }, { label: 'BL générés', value: generatedBlCount }].map((stat) => <div key={stat.label} className="bo-panel px-4 py-3"><p className="text-xs text-[#64748B]">{stat.label}</p><p className="mt-1 text-2xl font-semibold text-[#1F2937]">{stat.value}</p></div>)}
    </div>
    {sales.message && <div role={lastError ? 'alert' : 'status'} className={`shrink-0 rounded-md border px-4 py-2.5 text-[13px] ${lastError ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]' : 'border-[#E2E8F0] bg-white text-[#475569]'}`}>{sales.message}</div>}
    <section className="bo-panel flex min-h-64 shrink-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3"><label className="flex items-center gap-2 text-[13px] font-medium text-[#475569]"><input type="checkbox" className="h-4 w-4 accent-[#0057A8]" aria-label="Sélectionner les dossiers éligibles visibles" checked={allSelected} disabled={!selectable.length} onChange={() => sales.setSelectionIds(allSelected ? sales.selectionIds.filter((id) => !selectable.includes(id)) : [...sales.selectionIds, ...selectable])} />Dossiers de vente</label><div className="flex w-full items-center gap-3 sm:w-auto"><input type="search" aria-label="Recherche" className="bo-input min-w-0 flex-1 sm:w-64" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Référence du dossier ou client…" /><span className="shrink-0 text-xs text-[#64748B]">{filtered.length} dossier(s)</span></div></div>
      <div className="scrollbar-soft min-h-0 flex-1 divide-y divide-[#E2E8F0] overflow-y-auto">
        {filtered.map((sale) => {
          const key = getSaleKey(sale), issue = getSaleEligibilityError(sale, deliveries, statuses), generation = getSaleGenerationState(sale, deliveries);
          const remaining = Object.values(getSaleRemaining(sale, deliveries)).reduce((sum, quantity) => sum + quantity, 0);
          const checked = sales.selectionIds.includes(key);
          return <article key={key} className={`px-4 py-4 ${checked ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]'}`}>
            <div className="flex flex-wrap items-center gap-3">
              <input type="checkbox" className="h-4 w-4 shrink-0 accent-[#0057A8]" aria-label={`Sélectionner ${sale.reference}`} title={issue || undefined} disabled={Boolean(issue)} checked={checked} onChange={() => toggle(key)} />
              <div className="min-w-36 flex-1"><p className="font-mono text-[13px] font-semibold text-[#0057A8]">{sale.reference}</p><p className="mt-1 text-sm font-medium text-[#1F2937]">{sale.customerName}</p></div>
              <div className="flex min-w-32 flex-wrap gap-1.5"><SalesPill tone={sale.commercialStatus === 'Payé' ? 'green' : sale.commercialStatus === 'Annulé' ? 'red' : 'neutral'}>{sale.commercialStatus}</SalesPill><SalesPill>{sale.collectionMode}</SalesPill></div>
              <div className="min-w-32 text-xs text-[#64748B]"><p>{sale.items.length} référence(s) · {remaining} unité(s) restante(s)</p><p className="mt-1">{sale.date.split('-').reverse().join('/')} · {sale.startTime} – {sale.endTime}</p></div>
              <SalesPill tone={generation === 'BL générés' ? 'green' : generation === 'Partiellement généré' ? 'orange' : 'blue'}>{generation}</SalesPill>
              <button className="bo-button-secondary h-8 px-3 text-xs" aria-label={`Détails ${sale.reference}`} onClick={() => setDetail(sale)}>Détails</button>
            </div>
            {issue && <p className="ml-7 mt-2 text-xs text-[#64748B]">{issue}</p>}
            {!issue && (!sale.address || !sale.phone) && <p className="ml-7 mt-2 text-xs text-[#9A3412]">Informations de destination à compléter avant de générer le BL.</p>}
          </article>;
        })}
        {!filtered.length && <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-5 text-center"><span className="material-symbols-outlined text-3xl text-[#94A3B8]">folder_open</span><p className="text-sm font-medium text-[#334155]">{eligible.length ? 'Aucun dossier ne correspond à la recherche.' : 'Aucun dossier à transformer en BL'}</p><p className="text-xs text-[#64748B]">{eligible.length ? 'Modifiez la recherche.' : retrieved.length ? 'Les quantités ont déjà été transformées. Consultez les BL dans « Ordres de livraison ».' : sales.settings.url ? 'Cliquez sur « Synchroniser maintenant » pour obtenir les dossiers éligibles.' : 'Les dossiers apparaîtront après la première synchronisation.'}</p></div>}
      </div>
    </section>
    <div className="sticky bottom-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 bg-[#F5F7FA] py-2"><span className="text-[13px] text-[#64748B]"><strong className="text-[#1F2937]">{selected.length}</strong> dossier(s) sélectionné(s)</span><div className="flex flex-wrap gap-2"><button className="bo-button-secondary" onClick={() => setBackofficeTab('orders')}>Voir les ordres de livraison</button><button className="bo-button-primary" disabled={!selectionValid} onClick={() => prepare()}><span className="material-symbols-outlined text-[18px]">note_add</span>Générer les BL ({selected.length})</button></div></div>

    {panel === 'api' && <SalesApiDialog onClose={() => setPanel(null)} />}
    {panel === 'history' && <SalesHistoryDialog onClose={() => setPanel(null)} />}
    {panel === 'changes' && <SalesDialog title="Changements à vérifier" subtitle="Les BL existants sont conservés et ne sont pas modifiés automatiquement." onClose={() => setPanel(null)}><div className="space-y-4">{changes.map((sale) => <article key={getSaleKey(sale)} className="rounded-md border border-[#FED7AA] bg-[#FFF7ED] p-3"><p className="font-mono text-sm font-semibold">{sale.reference}</p><p className="mt-1 text-sm">{sale.customerName} · {sale.commercialStatus}</p><p className="mt-2 text-sm text-[#9A3412]">{sale.reviewRequired}</p><button className="mt-3 text-sm font-medium text-[#0057A8]" onClick={() => { setPanel(null); setDetail(sale); }}>Consulter le dossier et les BL liés</button></article>)}</div></SalesDialog>}
    {detail && <SalesDetailsDialog sale={detail} onClose={() => setDetail(null)} onPrepare={() => prepare(detail)} />}
  </div>;
};

const SalesApiDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { admin, manage } = useCompanySpace();
  const { sales } = useTms();
  const [draft, setDraft] = useState({ ...sales.settings });
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const sources = sales.approvedSources ?? [];
  const approved = sources.some(source => sameSource(source, draft));
  const dirty = JSON.stringify(draft) !== JSON.stringify(sales.settings);
  const locked = sales.dossiers.length > 0 || sales.generatedBls.length > 0;
  const cannotSwitch = locked && !sameSource(draft, sales.settings);
  const sourceKey = (source: CommercialSource) => JSON.stringify([source.connectorId, source.url]);
  const sourceLabel = (source: CommercialSource) => (source.connectorId === 'seller' ? 'Seller' : 'API standard') + ' · ' + source.url;
  function edit(changes: Partial<SalesApiSettings>) {
    setDraft(current => ({ ...current, ...changes }));
    setError(''); setFeedback('');
  }
  function selectSource(source: CommercialSource) {
    edit({ ...source, sourceName: source.connectorId === 'seller' ? 'Seller' : 'API standard', automatic: false });
  }
  async function perform(action: () => Promise<unknown>, message: string) {
    setError(''); setFeedback('');
    try { await action(); setFeedback(message); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Opération impossible.'); }
  }
  function save(event: React.FormEvent) {
    event.preventDefault();
    void perform(async () => {
      const state = await sales.updateSettings(draft);
      setDraft(state.settings);
    }, 'Configuration enregistrée.');
  }
  function revoke(source: CommercialSource) {
    void perform(async () => {
      const state = await sales.revokeSource(source);
      if (sameSource(source, draft) && sameSource(source, state.settings)) setDraft(state.settings);
    }, 'Autorisation retirée.');
  }
  return <SalesDialog title="Connexion au système commercial" subtitle="Configuration API du système fournissant les dossiers de vente" onClose={onClose}>
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center justify-between gap-2"><span className="text-sm">Entreprise · <strong>{sales.settings.companyName}</strong></span>{admin && <button type="button" className="bo-button-secondary" onClick={manage}>Changer d’entreprise</button>}</div>
      <fieldset disabled={sales.busy} className="space-y-4">
        {admin ? <>
          <SalesField label="Système commercial"><select className="bo-input w-full" value={draft.connectorId} onChange={e => selectSource({ connectorId: e.target.value === 'seller' ? 'seller' : 'standard', url: '' })}><option value="seller">Seller</option><option value="standard">Autre logiciel (API standard)</option></select></SalesField>
          <SalesField label="URL du service API" hint={draft.connectorId === 'seller' ? 'Adresse de recherche se terminant par /seller/searchDossierVente.' : undefined}>
            <input type="url" className="bo-input w-full" value={draft.url} placeholder="https://" onChange={e => edit({ url: e.target.value, automatic: Boolean(e.target.value) && draft.automatic })}/>
          </SalesField>
          {draft.url && !approved && <button type="button" className="bo-button-secondary" onClick={() => perform(() => sales.authorizeSource({ connectorId: draft.connectorId, url: draft.url }), 'Source autorisée pour cette entreprise.')}>Autoriser cette source</button>}
          {sources.length > 0 && <details className="text-sm"><summary className="cursor-pointer">Sources autorisées ({sources.length})</summary>
            <ul className="mt-2 space-y-2">{sources.map(source => <li key={sourceKey(source)} className="flex items-center justify-between gap-2">
              <span className="min-w-0 break-all">{sourceLabel(source)}</span>
              <button type="button" className="bo-button-secondary shrink-0" aria-label={'Retirer l’autorisation de ' + sourceLabel(source)} onClick={() => revoke(source)}>Retirer</button>
            </li>)}</ul>
          </details>}
        </> : <SalesField label="Source commerciale autorisée" hint={locked ? 'Cette source est liée aux dossiers déjà importés.' : !sources.length ? 'Contactez l’administrateur pour autoriser une première source.' : undefined}>
          <select className="bo-input w-full" disabled={locked || !sources.length} value={approved ? sourceKey(draft) : ''} onChange={e => {
            const source = sources.find(item => sourceKey(item) === e.target.value);
            if (source) selectSource({ connectorId: source.connectorId, url: source.url });
          }}>
            <option value="" disabled>{locked && !approved ? 'Autorisation à renouveler' : 'Choisir une source'}</option>
            {sources.map(source => <option key={sourceKey(source)} value={sourceKey(source)}>{sourceLabel(source)}</option>)}
          </select>
        </SalesField>}
        {draft.connectorId === 'standard' && <SalesField label="Nom du logiciel"><input required className="bo-input w-full" value={draft.sourceName} onChange={e => edit({ sourceName: e.target.value })}/></SalesField>}
        <div className="grid gap-4 sm:grid-cols-2">
          <SalesField label="Mode de synchronisation"><select className="bo-input w-full" value={draft.automatic ? 'automatic' : 'manual'} onChange={e => edit({ automatic: e.target.value === 'automatic' })}><option value="automatic" disabled={!draft.url}>Automatique · interrogation API</option><option value="manual">Manuel</option></select></SalesField>
          {draft.automatic && <SalesField label="Fréquence (secondes)"><input required type="number" min="5" max="86400" className="bo-input w-full" value={draft.intervalSeconds} onChange={e => edit({ intervalSeconds: Number(e.target.value) })}/></SalesField>}
        </div>
        <SalesField label="Statuts commerciaux éligibles *" hint="Séparez les statuts par une virgule. Exemple : Payé, Confirmé, Crédit accordé."><input required className="bo-input w-full" value={draft.eligibleStatuses.join(', ')} onChange={e => edit({ eligibleStatuses: e.target.value.split(',').map(s => s.trim()) })}/></SalesField>
      </fieldset>
      {(error || sales.serviceError) && <p role="alert" className="text-sm text-[#B91C1C]">{error || sales.serviceError}</p>}
      {feedback && <p role="status" className="text-sm text-[#166534]">{feedback}</p>}
      {sales.connectionTest !== null && !dirty && <p role="status" className={sales.connectionTest ? 'text-sm text-[#166534]' : 'text-sm text-[#B91C1C]'}>{sales.operations.find(operation => operation.type === 'Test connexion')?.message}</p>}
      <div className="flex flex-wrap gap-2 border-t border-[#E2E8F0] pt-4">
        <button type="submit" className="bo-button-primary" disabled={sales.busy || cannotSwitch || (!admin && !approved)}>{admin && draft.url && !approved ? 'Autoriser et enregistrer' : 'Enregistrer'}</button>
        <button type="button" className="bo-button-secondary disabled:opacity-50" disabled={!approved || dirty || sales.busy} onClick={sales.testConnection}>Tester la connexion</button>
        <button type="button" className="bo-button-secondary" onClick={onClose}>Fermer</button>
      </div>
      {cannotSwitch ? <p className="text-xs text-[#64748B]">Les dossiers importés doivent conserver leur source actuelle.</p> : dirty && <p className="text-xs text-[#64748B]">Enregistrez les paramètres avant de tester la connexion.</p>}
    </form>
  </SalesDialog>;
};

const SalesHistoryDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { sales } = useTms();
  return <SalesDialog title="Historique des opérations" subtitle="Récupérations API, tests de connexion et générations de BL" onClose={onClose}>
    <div className="divide-y divide-[#E2E8F0]" aria-live="polite">{sales.operations.map((operation) => <article key={operation.id} className="py-4 first:pt-0"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-[#1F2937]">{operation.type}</p><SalesPill tone={operation.status === 'Réussi' ? 'green' : operation.status === 'Erreur' ? 'red' : 'blue'}>{operation.status}</SalesPill></div><p className="mt-1 text-xs text-[#64748B]">{new Date(operation.timestamp).toLocaleString('fr-FR')}{operation.trigger && ` · ${operation.trigger}`}</p><p className="mt-2 text-[13px] text-[#475569]">{operation.message}</p>{operation.references.length > 0 && <p className="mt-2 break-words font-mono text-xs text-[#0057A8]">{operation.references.join(' · ')}</p>}</article>)}{!sales.operations.length && <p className="py-8 text-center text-sm text-[#64748B]">Aucune opération. Commencez par récupérer les dossiers de vente.</p>}</div>
  </SalesDialog>;
};

const SalesDetailsDialog: React.FC<{ sale: SalesDossier; onClose: () => void; onPrepare: () => void }> = ({ sale, onClose, onPrepare }) => {
  const { deliveries, sales } = useTms();
  const remaining = getSaleRemaining(sale, deliveries), issue = getSaleEligibilityError(sale, deliveries, sales.settings.eligibleStatuses);
  const bls = [...new Set(deliveries.filter((delivery) => delivery.sourceSale?.dossierId === sale.id && delivery.sourceSale?.systemId === sale.systemId).map((delivery) => delivery.orderId))];
  return <SalesDialog title={sale.reference} subtitle={`${sale.systemName} · ${sale.customerName}`} onClose={onClose}>
    <div className="space-y-5"><div className="flex flex-wrap gap-2"><SalesPill tone={sale.commercialStatus === 'Payé' ? 'green' : 'neutral'}>{sale.commercialStatus}</SalesPill><SalesPill>{sale.collectionMode}</SalesPill><SalesPill tone="blue">{getSaleGenerationState(sale, deliveries)}</SalesPill></div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">{[{ label: 'Téléphone', value: sale.phone }, { label: 'Adresse', value: sale.address }, { label: 'Quartier / Ville', value: `${sale.district}, ${sale.city}` }, { label: 'Date et créneau', value: `${sale.date.split('-').reverse().join('/')} · ${sale.startTime} – ${sale.endTime}` }].map((field) => <div key={field.label}><dt className="text-xs text-[#64748B]">{field.label}</dt><dd className="mt-1 text-[#1F2937]">{field.value || 'À compléter avant génération'}</dd></div>)}</dl>
      <section><h3 className="mb-2 text-sm font-semibold">Articles du dossier</h3><div className="divide-y divide-[#E2E8F0]">{sale.items.map((line) => <div key={line.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><p className="font-medium">{line.name}</p><p className="mt-1 text-xs text-[#64748B]">{line.ref} · {line.unitWeightKg ? line.unitWeightKg + ' kg/unité' : 'Poids à compléter'} · {line.unitValue.toLocaleString('fr-FR')} MAD/unité</p></div><div className="text-right"><p>{line.quantity} commandée(s)</p><p className="mt-1 text-xs text-[#0057A8]">{remaining[line.id]} restante(s) à transformer</p></div></div>)}</div></section>
      {bls.length > 0 && <div><h3 className="text-sm font-semibold">BL liés à ce dossier</h3><p className="mt-2 break-words font-mono text-sm text-[#0057A8]">{bls.join(' · ')}</p></div>}
      {issue && <p className="rounded-md bg-[#F8FAFC] p-3 text-[13px] text-[#64748B]">{issue}</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-[#E2E8F0] pt-4"><button className="bo-button-secondary" onClick={onClose}>Fermer</button><button className="bo-button-primary" disabled={Boolean(issue)} onClick={onPrepare}>Préparer le BL</button></div>
    </div>
  </SalesDialog>;
};
