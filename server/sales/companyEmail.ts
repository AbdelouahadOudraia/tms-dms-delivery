import {createHash, randomBytes} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {recordSecurityEvent} from './accountSecurity';

export type EmailPurpose = 'verify' | 'reset' | 'activate';
export const validAddress = (address: string) => address.length <= 254 &&
  /^[A-Za-z0-9_+%-]+(?:[.][A-Za-z0-9_+%-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:[.][A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(address);
// Gmail aliases must not associate the same mailbox with several accounts.
export function emailKey(value: unknown): string | null {
  if (typeof value !== 'string' || !validAddress(value.trim())) return null;
  const [local,domain] = value.trim().toLowerCase().split('@');
  if (!['gmail.com','googlemail.com'].includes(domain)) return local+'@'+domain;
  const canonical = local.split('+')[0].replace(/\./g,'');
  return /^[a-z0-9]+$/.test(canonical) ? canonical+'@gmail.com' : null;
}
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const lifetime = 15 * 60_000;

// Historical table names are retained; the service supports both account types.
export class CompanyEmailRecovery {
  constructor(private db: DatabaseSync, private hashPassword: (password: string) => string) {
    db.exec(`CREATE TABLE IF NOT EXISTS company_emails (
        login TEXT PRIMARY KEY REFERENCES accounts(login) ON DELETE CASCADE,
        address TEXT NOT NULL, verified_at TEXT
      );
      CREATE TABLE IF NOT EXISTS company_email_links (
        login TEXT NOT NULL REFERENCES company_emails(login) ON DELETE CASCADE,
        purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')), address TEXT NOT NULL,
        digest TEXT NOT NULL UNIQUE, issued_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
        PRIMARY KEY(login,purpose)
      );
      CREATE TABLE IF NOT EXISTS account_activation (
        login TEXT PRIMARY KEY REFERENCES accounts(login) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS email_security_events (
        id INTEGER PRIMARY KEY,login TEXT REFERENCES accounts(login) ON DELETE CASCADE,
        actor TEXT NOT NULL,ticket TEXT NOT NULL,created_at TEXT NOT NULL
      );
      CREATE TRIGGER IF NOT EXISTS email_links_on_address_change AFTER UPDATE OF address ON company_emails
        WHEN OLD.address <> NEW.address BEGIN DELETE FROM company_email_links WHERE login=NEW.login; END;
      CREATE TRIGGER IF NOT EXISTS email_links_on_password_change AFTER UPDATE OF password ON accounts
        BEGIN DELETE FROM company_email_links WHERE login=NEW.login; END;
      CREATE TRIGGER IF NOT EXISTS email_links_on_suspension AFTER INSERT ON company_status_events
        WHEN NEW.status='disabled' BEGIN DELETE FROM company_email_links
        WHERE login IN (SELECT login FROM accounts WHERE company=NEW.company_id); END;`);
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec('CREATE TABLE IF NOT EXISTS auth_migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL)');
      if (!db.prepare("SELECT 1 FROM pragma_table_info('accounts') WHERE name='email_login'").get())
        db.exec('ALTER TABLE accounts ADD COLUMN email_login INTEGER NOT NULL DEFAULT 0');
      if (!db.prepare("SELECT 1 FROM pragma_table_info('accounts') WHERE name='session_version'").get())
        db.exec('ALTER TABLE accounts ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0');
      if (!db.prepare("SELECT 1 FROM pragma_table_info('company_emails') WHERE name='mailbox'").get())
        db.exec('ALTER TABLE company_emails ADD COLUMN mailbox TEXT');
      if (!db.prepare("SELECT 1 FROM auth_migrations WHERE name='verified-email-v2'").get()) {
        const rows=db.prepare('SELECT login,address FROM company_emails').all();
        const counts=new Map<string,number>();
        for (const row of rows) {const key=emailKey(row.address);if(key) counts.set(key,(counts.get(key)||0)+1);}
        // Preserve ambiguous historical addresses; require their owner to resolve and verify them.
        db.exec('UPDATE company_emails SET mailbox=NULL');
        for (const row of rows) {
          const key=emailKey(row.address);
          if(key && counts.get(key)===1) db.prepare('UPDATE company_emails SET mailbox=? WHERE login=?').run(key,row.login);
        }
        db.exec('DELETE FROM password_recovery');
        db.prepare("INSERT INTO auth_migrations VALUES('verified-email-v2',?)").run(new Date().toISOString());
      }
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS company_email_mailbox ON company_emails(mailbox) WHERE mailbox IS NOT NULL; COMMIT');
    } catch(error){db.exec('ROLLBACK');throw error;}
    db.exec(`CREATE TABLE IF NOT EXISTS account_email_changes (
      login TEXT PRIMARY KEY REFERENCES accounts(login) ON DELETE CASCADE,address TEXT NOT NULL,mailbox TEXT NOT NULL UNIQUE
    );
    CREATE TRIGGER IF NOT EXISTS reserve_pending_email_insert BEFORE INSERT ON account_email_changes
      WHEN EXISTS(SELECT 1 FROM company_emails WHERE mailbox=NEW.mailbox AND login<>NEW.login)
      BEGIN SELECT RAISE(ABORT,'Adresse déjà réservée'); END;
    CREATE TRIGGER IF NOT EXISTS reserve_pending_email_update BEFORE UPDATE ON account_email_changes
      WHEN EXISTS(SELECT 1 FROM company_emails WHERE mailbox=NEW.mailbox AND login<>NEW.login)
      BEGIN SELECT RAISE(ABORT,'Adresse déjà réservée'); END;
    CREATE TRIGGER IF NOT EXISTS reserve_current_email_insert BEFORE INSERT ON company_emails
      WHEN EXISTS(SELECT 1 FROM account_email_changes WHERE mailbox=NEW.mailbox AND login<>NEW.login)
      BEGIN SELECT RAISE(ABORT,'Adresse déjà réservée'); END;
    CREATE TRIGGER IF NOT EXISTS reserve_current_email_update BEFORE UPDATE ON company_emails
      WHEN EXISTS(SELECT 1 FROM account_email_changes WHERE mailbox=NEW.mailbox AND login<>NEW.login)
      BEGIN SELECT RAISE(ABORT,'Adresse déjà réservée'); END;`);
  }
  accountLogin(identifier:string) {
    const key=emailKey(identifier);
    const row=key && this.db.prepare('SELECT login FROM company_emails WHERE mailbox=? AND verified_at IS NOT NULL').get(key);
    return row ? String(row.login) : null;
  }

  profile(login: string) {
    const row=this.db.prepare('SELECT address,verified_at,mailbox FROM company_emails WHERE login=?').get(login);
    const pending=this.db.prepare('SELECT address FROM account_email_changes WHERE login=?').get(login);
    return {email:row ? String(row.address) : null,emailVerified:Boolean(row?.verified_at && row.mailbox),pendingEmail:pending?String(pending.address):null};
  }
  setAccountAddress(login: string, value: unknown) {
    const mailbox=emailKey(value);
    if (!mailbox) throw new Error('Saisissez une adresse e-mail valide.');
    if (this.db.prepare('SELECT 1 FROM company_emails WHERE mailbox=? AND login<>? UNION ALL SELECT 1 FROM account_email_changes WHERE mailbox=? AND login<>?').get(mailbox,login,mailbox,login))
      throw new Error('Cette adresse e-mail est déjà associée à un autre compte.');
    const address=String(value).trim().toLowerCase();
    const result=this.db.prepare(`INSERT INTO company_emails(login,address,mailbox)
      SELECT login,?,? FROM accounts WHERE login=?
      ON CONFLICT(login) DO UPDATE SET address=excluded.address,mailbox=excluded.mailbox,
        verified_at=CASE WHEN company_emails.address=excluded.address THEN company_emails.verified_at ELSE NULL END`)
      .run(address,mailbox,login);
    if (!result.changes) throw new Error('Compte indisponible.');
    this.db.prepare('DELETE FROM account_email_changes WHERE login=?').run(login);
  }
  requestAccountAddress(login:string,value:unknown,actor:string) {
    const mailbox=emailKey(value);
    if(!mailbox)throw new Error('Saisissez une adresse e-mail valide.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if(this.db.prepare('SELECT 1 FROM company_emails WHERE mailbox=? AND login<>? UNION ALL SELECT 1 FROM account_email_changes WHERE mailbox=? AND login<>?').get(mailbox,login,mailbox,login))
        throw new Error('Cette adresse e-mail est déjà associée à un autre compte.');
      const current=this.profile(login),address=String(value).trim().toLowerCase();
      if(current.emailVerified && address===current.email)throw new Error('Cette adresse est déjà vérifiée. Saisissez une nouvelle adresse.');
      if(current.emailVerified && address!==current.email) {
        this.db.prepare('INSERT INTO account_email_changes(login,address,mailbox) VALUES(?,?,?) ON CONFLICT(login) DO UPDATE SET address=excluded.address,mailbox=excluded.mailbox').run(login,address,mailbox);
      } else this.setAccountAddress(login,value);
      this.db.prepare('DELETE FROM company_email_links WHERE login=?').run(login);
      recordSecurityEvent(this.db,login,'email_change_requested',actor);
      this.db.exec('COMMIT');
    } catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  setAddress(company: string, value: unknown,actor='admin') {
    const row=this.db.prepare(`SELECT a.login FROM accounts a JOIN company_directory c ON c.id=a.company
      WHERE c.id=? AND c.status='active'`).get(company);
    if (!row) throw new Error('Un compte entreprise actif est nécessaire.');
    this.requestAccountAddress(String(row.login),value,actor);
  }
  // Verification uses an authorized internal account key; recovery accepts an e-mail address.
  // A blocked identity can recover its password without recovering access. Only
  // reset accepts that status; verified mail, activation and tenant guards remain.
  issue(identifier: string, purpose: EmailPurpose) {
    const now=Date.now(), token=randomBytes(32).toString('base64url');
    const selector=purpose==='reset' ? 'e.mailbox=? AND e.verified_at IS NOT NULL AND p.login IS NULL'
      : purpose==='activate' ? 'a.login=? AND a.company IS NOT NULL AND p.login IS NOT NULL'
      : 'a.login=? AND (e.verified_at IS NULL OR ch.login IS NOT NULL) AND (p.login IS NULL OR a.company IS NULL)';
    const key=purpose==='reset' ? emailKey(identifier) : identifier;
    if (!key) return null;
    const row=this.db.prepare(`INSERT INTO company_email_links(login,purpose,address,digest,issued_at,expires_at)
      SELECT a.login,?,CASE WHEN ?='verify' THEN coalesce(ch.address,e.address) ELSE e.address END,?,?,? FROM company_emails e JOIN accounts a ON a.login=e.login
      LEFT JOIN company_directory c ON c.id=a.company LEFT JOIN account_activation p ON p.login=a.login
      LEFT JOIN account_email_changes ch ON ch.login=a.login
      JOIN account_access x ON x.login=a.login AND (x.status='active' OR ?='reset' AND x.status='suspended')
      WHERE (a.login='admin' AND a.company IS NULL OR c.status='active') AND e.mailbox IS NOT NULL AND ${selector}
      ON CONFLICT(login,purpose) DO UPDATE SET address=excluded.address,digest=excluded.digest,
        issued_at=excluded.issued_at,expires_at=excluded.expires_at
        WHERE company_email_links.issued_at<=excluded.issued_at-60000
      RETURNING address,login`).get(purpose==='activate'?'verify':purpose,purpose,digest(token),now,now+lifetime,purpose,key);
    return row ? {address:String(row.address),login:String(row.login),token} : null;
  }
  deliveryFailed(token: string) {
    this.db.prepare('UPDATE company_email_links SET expires_at=0 WHERE digest=?').run(digest(token));
  }
  consume(token: unknown, purpose: EmailPurpose, password?: string) {
    if (typeof token!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row=this.db.prepare(`SELECT l.login,a.company,p.login AS pending,
        CASE WHEN l.address=ch.address THEN ch.address END AS new_address,ch.mailbox AS new_mailbox FROM company_email_links l
        JOIN company_emails e ON e.login=l.login AND e.mailbox IS NOT NULL
        LEFT JOIN account_email_changes ch ON ch.login=l.login
        JOIN accounts a ON a.login=e.login LEFT JOIN company_directory c ON c.id=a.company
        JOIN account_access x ON x.login=a.login AND (x.status='active' OR ?='reset' AND x.status='suspended')
        LEFT JOIN account_activation p ON p.login=a.login
        WHERE l.digest=? AND l.purpose=? AND l.expires_at>?
        AND (l.address=e.address OR l.purpose='verify' AND l.address=ch.address)
        AND (a.login='admin' AND a.company IS NULL OR c.status='active')
        AND (l.purpose='verify' OR e.verified_at IS NOT NULL)`)
        .get(purpose,digest(token),purpose==='activate'?'verify':purpose,Date.now());
      const companyInvitation=Boolean(row?.pending && row.company!=null);
      const eligible=row && (purpose==='activate' ? companyInvitation : purpose==='verify' ? !companyInvitation : !row.pending);
      if (eligible) {
        // Changing the password never changes account_access or the tenant status.
        if (purpose!=='verify') this.db.prepare('UPDATE accounts SET password=? WHERE login=?').run(this.hashPassword(password),row.login);
        if (purpose!=='reset') {
          this.db.prepare('UPDATE company_emails SET address=coalesce(?,address),mailbox=coalesce(?,mailbox),verified_at=? WHERE login=?')
            .run(row.new_address??null,row.new_address?row.new_mailbox:null,new Date().toISOString(),row.login);
          this.db.prepare('DELETE FROM account_activation WHERE login=?').run(row.login);
        }
        this.db.prepare('UPDATE accounts SET session_version=session_version+1 WHERE login=?').run(row.login);
        this.db.prepare('DELETE FROM account_email_changes WHERE login=?').run(row.login);
        recordSecurityEvent(this.db,String(row.login),purpose==='reset'?'password_reset':purpose==='activate'?'account_activated':'email_verified',String(row.login));
        this.db.prepare('DELETE FROM company_email_links WHERE login=?').run(row.login);
        this.db.prepare('DELETE FROM password_recovery WHERE login=?').run(row.login);
      }
      this.db.exec('COMMIT');
      return Boolean(eligible);
    } catch (error) {this.db.exec('ROLLBACK');throw error;}
  }
}
