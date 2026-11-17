import {existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

// An existing standard database must never be migrated merely because Vite reloads code.
export function requireAuthMigrationApproval(file:string) {
  if(!existsSync(file)) return;
  const db=new DatabaseSync(file,{readOnly:true});
  let needsMigration=false;
  try {
    db.exec('PRAGMA query_only=ON; PRAGMA temp_store=MEMORY');
    const tables=new Set(db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(row=>String(row.name)));
    if(!tables.size) return;
    const required=['accounts','company_emails','company_email_links','account_activation','email_security_events','auth_migrations',
      'account_access','account_security_events','account_email_changes','account_unblock_links','account_unblock_requests','account_unblock_notices'];
    needsMigration=required.some(table=>!tables.has(table));
    if(!needsMigration) {
      const columns=db.prepare("SELECT name FROM pragma_table_info('accounts')").all().map(row=>row.name);
      needsMigration=!columns.includes('email_login') || !columns.includes('session_version') ||
        !db.prepare("SELECT 1 FROM auth_migrations WHERE name='verified-email-v2'").get() ||
        !db.prepare("SELECT 1 FROM auth_migrations WHERE name='account-unblock-v1'").get() ||
        !db.prepare("SELECT 1 FROM pragma_table_info('account_unblock_requests') WHERE name='session_version'").get() ||
        !db.prepare("SELECT 1 FROM pragma_table_info('account_unblock_notices') WHERE name='lease_token'").get();
    }
  } finally {db.close();}
  if(needsMigration && process.env.TMS_ALLOW_AUTH_MIGRATION!=='true')
    throw new Error('Migration de la base habituelle bloquée. Une sauvegarde et une autorisation explicite sont nécessaires avant de définir TMS_ALLOW_AUTH_MIGRATION=true. Utilisez dev:auth-test pour un test isolé.');
}
