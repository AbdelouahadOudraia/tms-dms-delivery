import { useLayoutEffect, useRef } from 'react';
import { useCompanySpace } from '../context/CompanySpace';
import { api, companyPath, type TransportState } from '../context/companyApi';

export function useTransportSave(data: TransportState) {
  const { company, initial, flush, report } = useCompanySpace();
  const state = useRef({ revision: initial.revision, saved: '', pending: '', running: null as Promise<void> | null, started: false });
  useLayoutEffect(() => {
    const job = state.current;
    job.pending = JSON.stringify(data);
    if (!job.started) { job.saved = job.pending; job.started = true; }
    function save(): Promise<void> {
      if (job.running) return job.running;
      if (job.saved === job.pending) return Promise.resolve();
      job.running = (async () => {
        while (job.saved !== job.pending) {
          const pending = job.pending;
          const result = await api<{revision: number}>(companyPath(company.id) + '/transport', 'PUT', { revision: job.revision, data: JSON.parse(pending) });
          job.revision = result.revision; job.saved = pending;
        }
      })().finally(() => { job.running = null; });
      return job.running;
    }
    flush.current = save;
    void save().catch(e => report(e.message));
    const beforeUnload = (e: BeforeUnloadEvent) => { if (job.pending !== job.saved) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { window.removeEventListener('beforeunload', beforeUnload); flush.current = async () => {}; };
  }, [data, company.id, flush, report]);
}
