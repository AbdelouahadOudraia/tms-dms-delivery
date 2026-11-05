import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readAdminOverview } from './adminOverview';

export interface Company { id: string; name: string; demo?: boolean }
export interface Account { role: 'admin' | 'company'; companyId: string | null }

export const validNewPassword = (password: unknown): password is string =>
  typeof password === 'string' && password.length >= 10 && password.length <= 200;

function hash(password: string) {
  if (!validNewPassword(password))
    throw new Error('Choisissez un mot de passe de 10 à 200 caractères.');
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 32).toString('hex');
}

function matchesPassword(password: unknown, record: string) {
  if (typeof password !== 'string' || password.length > 200) return false;
  const [salt, digest] = record.split(':');
  return timingSafeEqual(scryptSync(password, salt, 32), Buffer.from(digest, 'hex'));
}

export class CompanyDirectory {
  private db: DatabaseSync;
  private sessions = new Map<string, { account: Account; passwordRecord: string; expires: number }>();
  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS companies(id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, demo INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS accounts(login TEXT PRIMARY KEY, password TEXT NOT NULL, company TEXT UNIQUE);
      CREATE TABLE IF NOT EXISTS password_recovery(login TEXT PRIMARY KEY, digest TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TRIGGER IF NOT EXISTS invalidate_password_recovery AFTER UPDATE OF password ON accounts
      BEGIN DELETE FROM password_recovery WHERE login=NEW.login; END;
      CREATE TABLE IF NOT EXISTS transport(company TEXT PRIMARY KEY, revision INTEGER NOT NULL, data TEXT NOT NULL);`);
    if (!this.db.prepare("SELECT 1 FROM pragma_table_info('companies') WHERE name='demo'").get()) {
      this.db.exec('ALTER TABLE companies ADD COLUMN demo INTEGER NOT NULL DEFAULT 0');
    }
    if (!this.db.prepare("SELECT 1 FROM pragma_table_info('companies') WHERE name='created_at'").get()) {
      this.db.exec('ALTER TABLE companies ADD COLUMN created_at TEXT');
    }
  }
  companies(account?: Account): Company[] {
    const rows = account?.role === 'company'
      ? this.db.prepare('SELECT id,name,demo FROM companies WHERE id=?').all(account.companyId)
      : this.db.prepare('SELECT id,name,demo FROM companies ORDER BY name').all();
    return rows.map(r => ({ id: String(r.id), name: String(r.name), demo: Boolean(r.demo) }));
  }
  registerExisting(company: Company) {
    this.db.prepare('INSERT OR IGNORE INTO companies(id,name,demo) VALUES(?,?,?)').run(company.id, company.name, company.id === 'electroplanet' ? 1 : 0);
  }
  setupNeeded() { return !this.db.prepare('SELECT 1 FROM accounts WHERE login=?').get('admin'); }
  setup(password: string) {
    if (!this.setupNeeded()) throw new Error('Le compte administrateur existe déjà.');
    this.db.prepare('INSERT INTO accounts(login,password,company) VALUES(?,?,NULL)').run('admin', hash(password));
  }
  // Called only by the local server operator's command. There is no HTTP issuer.
  issueRecoveryCode(login: string) {
    const code = randomBytes(32).toString('base64url');
    const digest = createHash('sha256').update(code).digest('hex');
    const result = this.db.prepare(`INSERT OR REPLACE INTO password_recovery(login,digest,expires_at)
      SELECT login,?,? FROM accounts WHERE login=?`).run(digest, Date.now() + 15 * 60_000, login);
    if (!result.changes) throw new Error('Compte introuvable dans cette installation.');
    return code;
  }
  redeemRecoveryCode(login: string, code: string, password: string) {
    if (typeof login !== 'string' || typeof code !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(code)) return false;
    const digest = createHash('sha256').update(code).digest('hex');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const ticket = this.db.prepare('SELECT 1 FROM password_recovery WHERE login=? AND digest=? AND expires_at>?')
        .get(login, digest, Date.now());
      // Updating the password also consumes the ticket, in the same transaction.
      const updated = ticket && this.db.prepare('UPDATE accounts SET password=? WHERE login=?').run(hash(password), login);
      this.db.exec('COMMIT');
      return Boolean(updated?.changes);
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  setPassword(company: string, password: string) {
    if (company === 'admin') throw new Error('Identifiant réservé.');
    this.db.prepare('INSERT INTO accounts(login,password,company) VALUES(?,?,?) ON CONFLICT(login) DO UPDATE SET password=excluded.password')
      .run(company, hash(password), company);
    for (const [key, session] of this.sessions) if (session.account.companyId === company) this.sessions.delete(key);
  }
  create(name: string, login: string, password: string): Company {
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || typeof login !== 'string' ||
      !/^[a-z0-9][a-z0-9-]{1,63}$/.test(login) || login === 'admin') throw new Error('Vérifiez le nom et l’identifiant de l’entreprise.');
    if (this.db.prepare('SELECT 1 FROM companies WHERE id=? UNION ALL SELECT 1 FROM accounts WHERE login=?').get(login, login))
      throw new Error('Cet identifiant est déjà utilisé.');
    if (this.db.prepare('SELECT 1 FROM companies WHERE name=?').get(name.trim())) throw new Error('Ce nom d’entreprise est déjà utilisé.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO companies(id,name,created_at) VALUES(?,?,?)').run(login, name.trim(), new Date().toISOString());
      this.setPassword(login, password);
      this.db.exec('COMMIT');
    } catch (err) { this.db.exec('ROLLBACK'); throw err; }
    return { id: login, name: name.trim() };
  }
  rename(id: string, name: unknown) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) throw new Error('Saisissez un nom de 1 à 100 caractères.');
    const value = name.trim();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.db.prepare('SELECT 1 FROM companies WHERE name=? AND id<>?').get(value, id)) throw new Error('Ce nom d’entreprise est déjà utilisé.');
      if (!this.db.prepare('UPDATE companies SET name=? WHERE id=?').run(value, id).changes) throw new Error('Entreprise introuvable.');
      this.db.prepare("UPDATE sales_workspaces SET state_json=json_set(state_json,'$.settings.companyName',?) WHERE company_id=?").run(value, id);
      this.db.exec('COMMIT');
      return { id, name: value };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  adminOverview(token: string) {
    const session = this.sessions.get(token);
    if (this.account(token)?.role !== 'admin') throw new Error('Accès refusé.');
    return readAdminOverview(this.db, session.expires);
  }
  changeAdminPassword(current: unknown, replacement: unknown) {
    if (!validNewPassword(replacement)) throw new Error('Choisissez un mot de passe de 10 à 200 caractères.');
    const row = this.db.prepare("SELECT password FROM accounts WHERE login='admin' AND company IS NULL").get();
    if (!row || !matchesPassword(current, String(row.password))) throw new Error('Mot de passe actuel incorrect.');
    if (current === replacement) throw new Error('Choisissez un mot de passe différent du mot de passe actuel.');
    if (!this.db.prepare("UPDATE accounts SET password=? WHERE login='admin' AND password=?").run(hash(replacement),row.password).changes)
      throw new Error('Le compte a changé. Reconnectez-vous.');
    for (const [key, session] of this.sessions) if (session.account.role === 'admin') this.sessions.delete(key);
  }
  login(login: string, password: string) {
    if (typeof login !== 'string' || typeof password !== 'string' || password.length > 200) return null;
    const row = this.db.prepare('SELECT password,company FROM accounts WHERE login=?').get(login);
    if (!row) return null;
    if (!matchesPassword(password, String(row.password))) return null;
    const token = randomBytes(32).toString('hex');
    const account: Account = row.company == null ? { role: 'admin', companyId: null } : { role: 'company', companyId: String(row.company) };
    for (const [key, value] of this.sessions) if (value.expires <= Date.now()) this.sessions.delete(key);
    this.sessions.set(token, { account, passwordRecord: String(row.password), expires: Date.now() + 8 * 3600000 });
    return token;
  }
  account(token: string) {
    const session = this.sessions.get(token);
    if (!session) return null;
    // A password change in another process using this database also revokes the session.
    if (session.expires <= Date.now() || !this.db.prepare('SELECT 1 FROM accounts WHERE login=? AND password=?')
      .get(session.account.companyId ?? 'admin', session.passwordRecord)) {
      this.sessions.delete(token);
      return null;
    }
    return session.account;
  }
  logout(token: string) { this.sessions.delete(token); }
  transport(id: string) {
    const row = this.db.prepare('SELECT revision,data FROM transport WHERE company=?').get(id);
    return row ? { revision: Number(row.revision), data: JSON.parse(String(row.data)) } : { revision: 0, data: null };
  }
  saveTransport(id: string, revision: number, data: object) {
    const result = revision === 0
      ? this.db.prepare('INSERT OR IGNORE INTO transport VALUES(?,1,?)').run(id, JSON.stringify(data))
      : this.db.prepare('UPDATE transport SET revision=revision+1,data=? WHERE company=? AND revision=?').run(JSON.stringify(data), id, revision);
    return !!result.changes;
  }
  close() { this.sessions.clear(); this.db.close(); }
}
