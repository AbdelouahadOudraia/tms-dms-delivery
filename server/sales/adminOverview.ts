import type { DatabaseSync } from 'node:sqlite';
import type { AdminCompany, AdminOverview } from '../../src/types/administration';
import {readAccounts} from './accountSecurity';

export function readAdminOverview(db: DatabaseSync, expires: number, testDeletionEnabled: boolean): AdminOverview {
  const accounts=readAccounts(db);
  // Project operational metadata in SQLite. Customer records, proofs and credentials stay out of the response.
  const rows = db.prepare(`SELECT c.id, c.name, c.created_at, c.status, c.status_revision, a.login, e.address, e.verified_at,e.mailbox,
    EXISTS(SELECT 1 FROM account_activation p WHERE p.login=a.login) AS pending,
    json_extract(s.state_json,'$.settings.connectorId') AS kind,
    CASE WHEN coalesce(json_extract(s.state_json,'$.settings.url'),'')='' THEN 'empty'
      WHEN EXISTS (SELECT 1 FROM json_each(s.state_json,'$.approvedSources') p
        WHERE json_extract(p.value,'$.url')=json_extract(s.state_json,'$.settings.url')
          AND json_extract(p.value,'$.connectorId')=json_extract(s.state_json,'$.settings.connectorId')) THEN 'configured'
      ELSE 'revoked' END AS state,
    json_extract(s.state_json,'$.settings.automatic') AS automatic,
    json_extract(s.state_json,'$.connectionTest') AS test,
    (SELECT json_object('at',json_extract(op.value,'$.timestamp'),'status',json_extract(op.value,'$.status'))
      FROM json_each(s.state_json,'$.operations') op WHERE json_extract(op.value,'$.type')='Test connexion'
      ORDER BY CAST(op.key AS INTEGER) LIMIT 1) AS last_test,
    json_extract(s.state_json,'$.lastSyncAt') AS last_sync,
    json_extract(s.state_json,'$.lastSuccessAt') AS last_success,
    json_extract(s.state_json,'$.consecutiveFailures') AS failures,
    json_extract(s.state_json,'$.importing') AS importing,
    (SELECT json_extract(op.value,'$.message') FROM json_each(s.state_json,'$.operations') op
      WHERE json_extract(op.value,'$.type')='Récupération' AND json_extract(op.value,'$.status')='Erreur'
      ORDER BY CAST(op.key AS INTEGER) LIMIT 1) AS sync_error
    FROM company_directory c LEFT JOIN accounts a ON a.company=c.id
    LEFT JOIN company_emails e ON e.login=a.login
    LEFT JOIN sales_workspaces s ON s.company_id=c.id ORDER BY c.name COLLATE NOCASE`).all();
  const companies = rows.map((r): AdminCompany => {
    const failures = Number(r.failures ?? 0);
    const lastTest = r.last_test ? JSON.parse(String(r.last_test)) : null;
    const http = /\bHTTP ([1-5]\d\d)\b/.exec(String(r.sync_error ?? ''));
    return {
      id: String(r.id), name: String(r.name), createdAt: r.created_at as string | null, login: r.login as string | null,
      status: r.status as AdminCompany['status'],
      email: r.address as string | null, emailVerified: r.verified_at != null && r.mailbox != null,activationPending:Boolean(r.pending),
      pendingEmail:accounts.find(account=>account.login===r.login)?.pendingEmail??null,
      deletionRevision: testDeletionEnabled && r.status === 'disabled' && r.id !== 'admin' ? Number(r.status_revision) : null,
      connection: {
        kind: r.kind === 'seller' ? 'seller' : 'standard', state: r.state as AdminCompany['connection']['state'],
        automatic: Boolean(r.automatic), test: r.test == null ? null : Boolean(r.test),
        lastTest: lastTest?.at && Number.isFinite(Date.parse(lastTest.at)) ? { at: lastTest.at, ok: lastTest.status === 'Réussi' } : null,
        lastSyncAt: r.last_sync as string | null, lastSuccessAt: r.last_success as string | null,
        failures, importing: Boolean(r.importing),
        error: failures ? (http ? 'Erreur HTTP ' + http[1] : 'Échec de synchronisation') : null,
      },
    };
  });
  const email=db.prepare("SELECT address,verified_at,mailbox FROM company_emails WHERE login='admin'").get();
  return { companies, accounts, session: { login: 'admin', expiresAt: new Date(expires).toISOString(),
    email:email ? String(email.address) : null,emailVerified:Boolean(email?.verified_at && email.mailbox),
    pendingEmail:accounts.find(account=>account.login==='admin')?.pendingEmail??null } };
}
