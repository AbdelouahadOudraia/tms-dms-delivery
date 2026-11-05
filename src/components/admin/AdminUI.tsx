import { useState, type ReactNode, type InputHTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { AdminCompany } from '../../types/administration';

export const adminLink = (page = '') => '#/admin' + (page ? '/' + page : '');
export const detailLink = (id: string) => adminLink('entreprise/' + encodeURIComponent(id));
export const formatDate = (date: string | null, time = true) => date
  ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', ...(time ? { timeStyle: 'short' } : {}) }).format(new Date(date))
  : 'Non renseignée';

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
      <h2 className="font-semibold text-[#17344d]">{title}</h2>{action}
    </div>{children}
  </section>;
}
export function ConnectionBadge({ connection: c }: { connection: AdminCompany['connection'] }) {
  const [label, color] = c.state === 'empty' ? ['À configurer', 'bg-slate-100 text-slate-700']
    : c.state === 'revoked' ? ['Autorisation retirée', 'bg-amber-50 text-amber-900']
    : c.test === false || c.failures > 0 ? ['En erreur', 'bg-red-50 text-red-800']
    : c.importing ? ['En synchronisation', 'bg-blue-50 text-blue-800'] : ['Configurée', 'bg-emerald-50 text-emerald-800'];
  return <span className={'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ' + color}><span className="size-1.5 rounded-full bg-current"/>{label}</span>;
}
export function Info({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs font-medium text-slate-600">{label}</dt><dd className="mt-1.5 break-words text-sm font-medium text-slate-900">{children}</dd></div>;
}
export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <label className="block text-sm font-medium text-slate-700">{label}
    <input {...props} className="bo-input mt-1.5 block h-10 w-full"/>
    {hint && <span className="mt-1.5 block text-xs font-normal text-slate-600">{hint}</span>}
  </label>;
}
export function DataList<T>({ title, items, keyOf, searchText, headings, cells, empty, action }: {
  title: string; items: T[]; keyOf(item: T): string; searchText(item: T): string; headings: string[];
  cells(item: T): ReactNode[]; empty: string; action?: ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const filtered = items.filter(item => normalize(searchText(item)).includes(normalize(query.trim())));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * 10, current * 10);
  return <Panel title={title} action={action}>
    <div className="relative m-4 max-w-md sm:mx-6"><Search size={16} aria-hidden="true" className="absolute left-3 top-3 text-slate-500"/>
      <input type="search" aria-label="Rechercher par nom ou identifiant" value={query} onChange={e => {setQuery(e.target.value);setPage(1);}}
        placeholder="Rechercher par nom ou identifiant" className="bo-input h-10 w-full pl-9"/></div>
    {rows.length ? <div className="overflow-x-auto"><table className="bo-table"><thead><tr>{headings.map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map(item => <tr key={keyOf(item)}>{cells(item).map((cell,i) => <td key={headings[i]}>{cell}</td>)}</tr>)}</tbody>
    </table></div> : <p className="p-6 text-sm text-slate-600">{query ? 'Aucun résultat pour cette recherche.' : empty}</p>}
    {filtered.length > 0 && <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:px-6">
      <span>{(current-1)*10+1}–{Math.min(current*10,filtered.length)} sur {filtered.length}</span>
      {pages > 1 && <div className="flex items-center gap-3"><button className="bo-button-secondary" aria-label="Page précédente" disabled={current===1} onClick={() => setPage(current-1)}><ChevronLeft size={15}/></button>
        <span>{current} / {pages}</span><button className="bo-button-secondary" aria-label="Page suivante" disabled={current===pages} onClick={() => setPage(current+1)}><ChevronRight size={15}/></button></div>}
    </div>}
  </Panel>;
}
