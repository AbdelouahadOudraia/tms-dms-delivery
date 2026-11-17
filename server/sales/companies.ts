import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readAdminOverview } from './adminOverview';
import type { CompanyStatus,AccountStatus,AccountAccessDetails } from '../../src/types/administration';
import {initializeAccountSecurity,recordSecurityEvent,readAccounts,readSecurityHistory,AccountAccessError} from './accountSecurity';
import type { SalesWorkspace } from '../../src/types/sales';
import { getNextSalesSyncAt } from '../../src/utils/salesSynchronization';
import { TEST_APPLICATION_ID } from './testDatabase';
import { CompanyEmailRecovery } from './companyEmail';
import {assertDemoDatabase,DEMO_APPLICATION_ID} from './demoDatabase';
import {allowRepeatedCompanyNames,requireCompanyNameMigrationApproval} from './companySchema';
import {loginErrorMessages} from '../../src/types/authentication';
import {UnblockRequests} from './unblockRequests';
import type {UnblockDecision} from '../../src/types/administration';

export interface Company { id: string; name: string; demo?: boolean }
export interface RegisteredCompany extends Company { status: CompanyStatus; statusRevision: number }
export interface Account { role: 'admin' | 'company'; companyId: string | null }

export class CompanyDisabledError extends Error {
  constructor() {super(loginErrorMessages.companyDisabled);this.name='CompanyDisabledError';}
}
export class AccountSuspendedError extends Error {
  constructor(){super(loginErrorMessages.accountSuspended);this.name='AccountSuspendedError';}
}

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
  readonly emailRecovery: CompanyEmailRecovery;
  readonly unblockRequests:UnblockRequests;
  private db: DatabaseSync;
  private sessions = new Map<string, { account: Account; login:string;verified:boolean;version:number;passwordRecord: string; revision: number; expires: number }>();
  constructor(file: string, private localTest = false, private demoMode=false) {
    if(demoMode) assertDemoDatabase(file);
    if(!localTest)requireCompanyNameMigrationApproval(file);
    this.db = new DatabaseSync(file);
    if (localTest && !this.isTestDatabase()) {
      this.db.close();
      throw new Error('Base de développement isolée requise.');
    }
    this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS companies(id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE, demo INTEGER NOT NULL DEFAULT 0);
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
    try {allowRepeatedCompanyNames(this.db);} catch(error){this.db.close();throw error;}
    // The latest audit event determines both access and the validity of older sessions.
    this.db.exec(`CREATE TABLE IF NOT EXISTS company_status_events (
        id INTEGER PRIMARY KEY ${localTest ? 'AUTOINCREMENT' : ''}, company_id TEXT NOT NULL REFERENCES companies(id),
        status TEXT NOT NULL CHECK(status IN ('active','disabled')), actor TEXT NOT NULL, changed_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS company_status_history ON company_status_events(company_id, id DESC);
      CREATE VIEW IF NOT EXISTS company_directory AS
        SELECT c.*, coalesce(e.status,'active') AS status, coalesce(e.id,0) AS status_revision
        FROM companies c LEFT JOIN company_status_events e ON e.id=(
          SELECT id FROM company_status_events WHERE company_id=c.id ORDER BY id DESC LIMIT 1
        );`);
    if (localTest) this.db.exec(`CREATE TABLE IF NOT EXISTS test_company_deletions (
      id INTEGER PRIMARY KEY, company_id TEXT NOT NULL, actor TEXT NOT NULL, deleted_at TEXT NOT NULL)`);
    try {
      initializeAccountSecurity(this.db);
      this.emailRecovery = new CompanyEmailRecovery(this.db, hash);
      this.unblockRequests=new UnblockRequests(this.db,(email,password)=>{
        if(typeof email!=='string')return null;
        const login=this.emailRecovery.accountLogin(email),row=login&&this.accountRecord(login);
        if(!row||!row.company||row.pending||!matchesPassword(password,String(row.password))||row.access_status!=='suspended')return null;
        const profile=this.emailRecovery.profile(login);
        return profile.emailVerified?{login,address:profile.email,version:Number(row.session_version),revision:Number(this.db.prepare('SELECT revision FROM account_access WHERE login=?').get(login).revision)}:null;
      });
    } catch(error){this.db.close();throw error;}
  }
  private isTestDatabase() {
    return process.env.NODE_ENV === 'development' && this.db.prepare('PRAGMA application_id').get().application_id === (this.demoMode?DEMO_APPLICATION_ID:TEST_APPLICATION_ID);
  }
  companies(account?: Account): RegisteredCompany[] {
    const rows = account?.role === 'company'
      ? this.db.prepare("SELECT * FROM company_directory WHERE id=? AND status='active'").all(account.companyId)
      : this.db.prepare('SELECT * FROM company_directory ORDER BY name').all();
    return rows.map(r => ({ id: String(r.id), name: String(r.name), demo: Boolean(r.demo),
      status: r.status as CompanyStatus, statusRevision: Number(r.status_revision) }));
  }
  isActive(id: string, revision: number) {
    return Boolean(this.db.prepare("SELECT 1 FROM company_directory WHERE id=? AND status='active' AND status_revision=?").get(id,revision));
  }
  setStatus(id: string, status: CompanyStatus) {
    if (status !== 'active' && status !== 'disabled') throw new Error('Statut d’entreprise invalide.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous = this.db.prepare('SELECT status FROM company_directory WHERE id=?').get(id);
      if (!previous) throw new Error('Entreprise introuvable.');
      if (previous.status !== status) {
        const now = new Date();
        this.db.prepare("INSERT INTO company_status_events(company_id,status,actor,changed_at) VALUES(?,?,'admin',?)")
          .run(id, status, now.toISOString());
        const row = this.db.prepare('SELECT state_json FROM sales_workspaces WHERE company_id=?').get(id);
        if (row) {
          const state: SalesWorkspace = JSON.parse(String(row.state_json));
          state.nextSyncAt = status === 'active' ? getNextSalesSyncAt(state.settings, state.consecutiveFailures, now.getTime()) : null;
          state.importing = false;
          if (status === 'disabled') {
            for (const operation of state.operations) {
              if (operation.status === 'En cours') {
                operation.status = 'Erreur';
                operation.message = 'Synchronisation interrompue par la désactivation de l’entreprise.';
              }
            }
          }
          this.db.prepare('UPDATE sales_workspaces SET state_json=? WHERE company_id=?').run(JSON.stringify(state), id);
        }
        if (status === 'disabled') {
          this.db.prepare('DELETE FROM password_recovery WHERE login IN (SELECT login FROM accounts WHERE company=?)').run(id);
        }
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    if (status === 'disabled') {
      for (const [key, session] of this.sessions) if (session.account.companyId === id) this.sessions.delete(key);
    }
  }
  registerExisting(company: Company) {
    this.db.prepare('INSERT OR IGNORE INTO companies(id,name,demo) VALUES(?,?,?)').run(company.id, company.name, company.id === 'electroplanet' ? 1 : 0);
  }
  setupNeeded() { return !this.db.prepare('SELECT 1 FROM accounts WHERE login=?').get('admin'); }
  setupPending() { return Boolean(this.db.prepare("SELECT 1 FROM account_activation WHERE login='admin'").get()); }
  beginEmailSetup(email: unknown, password: string) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.setupNeeded()) {
        this.setup(password);
        this.db.prepare("INSERT INTO account_activation(login) VALUES('admin')").run();
        this.db.prepare("UPDATE accounts SET email_login=1 WHERE login='admin'").run();
        this.emailRecovery.setAccountAddress('admin',email);
      } else {
        const row=this.db.prepare("SELECT a.password,e.address FROM accounts a JOIN account_activation p ON p.login=a.login JOIN company_emails e ON e.login=a.login WHERE a.login='admin'").get();
        if (!row || typeof email!=='string' || row.address!==email.trim().toLowerCase() || !matchesPassword(password,String(row.password)))
          throw new Error('Initialisation déjà engagée ou compte administrateur existant.');
      }
      this.db.exec('COMMIT');
    } catch (error) {this.db.exec('ROLLBACK');throw error;}
  }
  setup(password: string) {
    if (!this.setupNeeded()) throw new Error('Le compte administrateur existe déjà.');
    const created = this.db.prepare(`INSERT INTO accounts(login,password,company)
      SELECT 'admin',?,NULL WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE login='admin')`).run(hash(password));
    if (!created.changes) throw new Error('Le compte administrateur existe déjà.');
  }
  private setPassword(company: string, password: string) {
    if (company === 'admin') throw new Error('Identifiant réservé.');
    const updated = this.db.prepare(`INSERT INTO accounts(login,password,company)
      SELECT ?,?,id FROM company_directory WHERE id=? AND status='active'
      ON CONFLICT(login) DO UPDATE SET password=excluded.password WHERE accounts.company=excluded.company`)
      .run(company, hash(password), company);
    if (!updated.changes) throw new Error('Espace entreprise indisponible.');
    for (const [key, session] of this.sessions) if (session.account.companyId === company) this.sessions.delete(key);
  }
  create(name: string, login: string | undefined, password: string, email?: unknown): RegisteredCompany {
    if (typeof name !== 'string' || !name.trim() || name.length > 100)
      throw new Error('Saisissez un nom d’entreprise de 1 à 100 caractères.');
    // Explicit IDs remain available only for internal legacy imports; HTTP creation always generates one.
    if (login!==undefined && (typeof login!=='string' || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(login) || login==='admin'))
      throw new Error('Identifiant technique d’entreprise invalide.');
    let statusRevision = 0;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const exists=(id:string)=>Boolean(this.db.prepare('SELECT 1 FROM companies WHERE id=? UNION ALL SELECT 1 FROM accounts WHERE login=?').get(id,id));
      if(login===undefined) {
        const base=name.trim().toLowerCase().replace(/œ/g,'oe').replace(/æ/g,'ae').replace(/ß/g,'ss')
          .normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64).replace(/-+$/,'') || 'entreprise';
        login=base;
        for(let suffix=2;login==='admin' || exists(login);suffix++) {
          const ending='-'+suffix;
          login=base.slice(0,64-ending.length).replace(/-+$/,'')+ending;
        }
      } else if(exists(login)) throw new Error('Cet identifiant est déjà utilisé.');
      this.db.prepare('INSERT INTO companies(id,name,created_at) VALUES(?,?,?)').run(login, name.trim(), new Date().toISOString());
      // A recreated test space must never inherit a deleted space's worker or confirmation.
      if (this.localTest) statusRevision = Number(this.db.prepare(
        "INSERT INTO company_status_events(company_id,status,actor,changed_at) VALUES(?,'active','admin',?)"
      ).run(login,new Date().toISOString()).lastInsertRowid);
      this.setPassword(login, password);
      if (email !== undefined) {
        this.db.prepare('INSERT INTO account_activation(login) VALUES(?)').run(login);
        this.db.prepare('UPDATE accounts SET email_login=1 WHERE login=?').run(login);
        this.emailRecovery.setAccountAddress(login,email);
      }
      this.db.exec('COMMIT');
    } catch (err) { this.db.exec('ROLLBACK'); throw err; }
    return { id: login, name: name.trim(), status: 'active', statusRevision };
  }
  inviteExistingCompany(company:string,email:unknown) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if(company==='admin' || this.db.prepare('SELECT 1 FROM accounts WHERE company=? OR login=?').get(company,company))
        throw new Error('Cet espace possède déjà un compte. Actualisez sa fiche avant de renvoyer l’invitation.');
      this.setPassword(company,randomBytes(32).toString('base64url'));
      this.db.prepare('UPDATE accounts SET email_login=1 WHERE login=?').run(company);
      this.db.prepare('INSERT INTO account_activation(login) VALUES(?)').run(company);
      this.emailRecovery.setAccountAddress(company,email);
      this.db.exec('COMMIT');
    } catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  deleteTestCompany(token: string, id: string, confirmationName: unknown, revision: unknown) {
    if (!this.localTest || !this.isTestDatabase()) throw new Error('Suppression réservée à la base locale de test.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (id === 'admin' || this.account(token)?.role !== 'admin') throw new Error('Suppression refusée.');
      const company = this.db.prepare('SELECT name,status,status_revision FROM company_directory WHERE id=?').get(id);
      if (!company || company.status !== 'disabled' || company.status_revision !== revision)
        throw new Error('Vérifiez que cette entreprise est toujours désactivée, puis actualisez sa fiche.');
      if (company.name !== confirmationName) throw new Error('Le nom saisi doit correspondre exactement au nom de l’entreprise.');
      this.db.prepare('DELETE FROM password_recovery WHERE login IN (SELECT login FROM accounts WHERE company=?)').run(id);
      this.db.prepare('DELETE FROM accounts WHERE company=?').run(id);
      this.db.prepare('DELETE FROM sales_workspaces WHERE company_id=?').run(id);
      this.db.prepare('DELETE FROM transport WHERE company=?').run(id);
      this.db.prepare('DELETE FROM company_status_events WHERE company_id=?').run(id);
      this.db.prepare('DELETE FROM companies WHERE id=?').run(id);
      this.db.prepare("INSERT INTO test_company_deletions(company_id,actor,deleted_at) VALUES(?,'admin',?)")
        .run(id, new Date().toISOString());
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    for (const [key, session] of this.sessions) if (session.account.companyId === id) this.sessions.delete(key);
  }
  rename(id: string, name: unknown) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) throw new Error('Saisissez un nom de 1 à 100 caractères.');
    const value = name.trim();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (!this.db.prepare('UPDATE companies SET name=? WHERE id=?').run(value, id).changes) throw new Error('Entreprise introuvable.');
      this.db.prepare("UPDATE sales_workspaces SET state_json=json_set(state_json,'$.settings.companyName',?) WHERE company_id=?").run(value, id);
      this.db.exec('COMMIT');
      return { id, name: value };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  adminOverview(token: string) {
    const session = this.sessions.get(token);
    if (this.account(token)?.role !== 'admin') throw new Error('Accès refusé.');
    return readAdminOverview(this.db, session.expires, this.localTest && this.isTestDatabase());
  }
  accountDetails(token:string,login:string):AccountAccessDetails {
    if(this.account(token)?.role!=='admin')throw new AccountAccessError(403,'Accès réservé à l’administrateur plateforme.');
    const account=readAccounts(this.db).find(item=>item.login===login);
    if(!account)throw new AccountAccessError(404,'Compte introuvable.');
    return {account,history:readSecurityHistory(this.db,login)};
  }
  manageAccountAccess(token:string,login:string,action:AccountStatus|'revoke',revision:unknown) {
    if(!['active','suspended','revoke'].includes(action) || !Number.isSafeInteger(revision) || Number(revision)<0)
      throw new AccountAccessError(400,'Vérifiez l’action et actualisez la fiche du compte.');
    let changed=false;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if(this.account(token)?.role!=='admin')throw new AccountAccessError(403,'Accès réservé à l’administrateur plateforme.');
      changed=this.applyAccountAccess(login,action,Number(revision),this.ownLogin(token));
      if(action==='active')this.unblockRequests.completeManual(login,this.ownLogin(token));
      this.db.exec('COMMIT');
    } catch(error){this.db.exec('ROLLBACK');throw error;}
    if(changed)for(const [key,session] of this.sessions)if(session.login===login)this.sessions.delete(key);
    return this.accountDetails(token,login);
  }
  private applyAccountAccess(login:string,action:AccountStatus|'revoke',revision:number,actor:string) {
      let changed=false;
      const target=this.db.prepare('SELECT a.company,x.status,x.revision FROM accounts a JOIN account_access x ON x.login=a.login WHERE a.login=?').get(login);
      if(!target)throw new AccountAccessError(404,'Compte introuvable.');
      if(target.company==null || login===actor)throw new AccountAccessError(400,'Cette action est réservée aux comptes entreprise.');
      if(target.revision!==revision)throw new AccountAccessError(409,'Cet accès a été modifié. Actualisez sa fiche avant de recommencer.');
      if(action==='revoke' || target.status!==action) {
        changed=true;
        this.db.prepare('UPDATE account_access SET status=?,revision=revision+1 WHERE login=?').run(action==='revoke'?target.status:action,login);
        this.db.prepare('UPDATE accounts SET session_version=session_version+1 WHERE login=?').run(login);
        if(action==='suspended') {
          this.db.prepare('DELETE FROM company_email_links WHERE login=?').run(login);
          this.db.prepare('DELETE FROM password_recovery WHERE login=?').run(login);
        }
        recordSecurityEvent(this.db,login,action==='revoke'?'sessions_revoked':action==='suspended'?'suspended':'reactivated',actor);
      }
      return changed;
  }
  decideUnblock(token:string,id:string,decision:UnblockDecision,revision:unknown) {
    if(this.account(token)?.role!=='admin')throw new AccountAccessError(403,'Accès réservé à l’administrateur plateforme.');
    const login=this.unblockRequests.decide(id,decision,revision,this.ownLogin(token),()=>this.account(token)?.role==='admin',
      (target,currentRevision,actor)=>this.applyAccountAccess(target,'active',currentRevision,actor));
    if(decision==='accepted')for(const [key,session]of this.sessions)if(session.login===login)this.sessions.delete(key);
    return this.unblockRequests.list().find(request=>request.id===id);
  }
  listUnblockRequests(token:string) {
    if(this.account(token)?.role!=='admin')throw new AccountAccessError(403,'Accès réservé à l’administrateur plateforme.');
    return this.unblockRequests.list();
  }
  changeAdminPassword(current: unknown, replacement: unknown) {
    if (!validNewPassword(replacement)) throw new Error('Choisissez un mot de passe de 10 à 200 caractères.');
    const row = this.db.prepare("SELECT password FROM accounts WHERE login='admin' AND company IS NULL").get();
    if (!row || !matchesPassword(current, String(row.password))) throw new Error('Mot de passe actuel incorrect.');
    if (current === replacement) throw new Error('Choisissez un mot de passe différent du mot de passe actuel.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (!this.db.prepare("UPDATE accounts SET password=? WHERE login='admin' AND password=?").run(hash(replacement),row.password).changes)
        throw new Error('Le compte a changé. Reconnectez-vous.');
      recordSecurityEvent(this.db,'admin','password_changed','admin');
      this.db.exec('COMMIT');
    } catch(error){this.db.exec('ROLLBACK');throw error;}
    for (const [key, session] of this.sessions) if (session.account.role === 'admin') this.sessions.delete(key);
  }
  login(login: string, password: string) {
    if (typeof login !== 'string' || login.length>254 || typeof password !== 'string' || password.length > 200) return null;
    const internal=this.emailRecovery.accountLogin(login);
    if (!internal) return null;
    let token:string|null=null,denial:Error|null=null;
    // Serialize with suspension/revocation so no session can be issued from stale access metadata.
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row=this.accountRecord(internal);
      if(!row || this.emailRecovery.accountLogin(login)!==internal || !this.emailRecovery.profile(internal).emailVerified || !matchesPassword(password,String(row.password))) {
        if(row)recordSecurityEvent(this.db,internal,'login_refused','unauthenticated','incorrect_credentials');
      } else if(row.pending || row.status==='disabled' || row.access_status==='suspended') {
        const reason=row.pending?'activation_pending':row.status==='disabled'?'company_disabled':'account_suspended';
        recordSecurityEvent(this.db,internal,'login_refused',internal,reason);
        if(!row.pending)denial=row.status==='disabled'?new CompanyDisabledError():new AccountSuspendedError();
      } else {
        const account:Account=row.company==null?{role:'admin',companyId:null}:{role:'company',companyId:String(row.company)};
        token=randomBytes(32).toString('hex');
        this.db.prepare('UPDATE account_access SET last_login_at=? WHERE login=?').run(new Date().toISOString(),internal);
        recordSecurityEvent(this.db,internal,'login_succeeded',internal);
        for(const [key,value]of this.sessions)if(value.expires<=Date.now())this.sessions.delete(key);
        this.sessions.set(token,{account,login:internal,verified:true,version:Number(row.session_version),passwordRecord:String(row.password),revision:Number(row.revision),expires:Date.now()+8*3600000});
      }
      this.db.exec('COMMIT');
    } catch(error){this.db.exec('ROLLBACK');if(token)this.sessions.delete(token);throw error;}
    if(denial)throw denial;
    return token;
  }
  private accountRecord(login: string) {
    return this.db.prepare(`SELECT a.password,a.company,a.email_login,a.session_version,c.status,x.status AS access_status,
      EXISTS(SELECT 1 FROM account_activation p WHERE p.login=a.login) AS pending,coalesce(c.status_revision,0) AS revision
      FROM accounts a LEFT JOIN company_directory c ON a.company=c.id
      JOIN account_access x ON x.login=a.login
      WHERE a.login=? AND (a.login='admin' AND a.company IS NULL OR c.status IN ('active','disabled'))
      `).get(login);
  }
  private activeAccount(login: string) {
    const row=this.accountRecord(login);
    return row && !row.pending && row.access_status==='active' && (row.company==null || row.status==='active') ? row : undefined;
  }
  account(token: string) {
    const session = this.sessions.get(token);
    if (!session) return null;
    // A password change in another process using this database also revokes the session.
    const row = this.activeAccount(session.login);
    if (session.expires <= Date.now() || !row || row.password !== session.passwordRecord || row.revision !== session.revision ||
      !this.emailRecovery.profile(session.login).emailVerified || Number(row.session_version)!==session.version) {
      this.sessions.delete(token);
      return null;
    }
    return session.account;
  }
  logout(token: string) { this.sessions.delete(token); }
  resetDemo() {
    if(!this.demoMode || !this.localTest || !this.isTestDatabase()) throw new Error('Réinitialisation réservée à la base de démonstration.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      // Preserve schema/migration metadata and monotonic lifecycle IDs for in-flight worker checks.
      this.db.exec(`DELETE FROM password_recovery; DELETE FROM accounts; DELETE FROM sales_workspaces;
        DELETE FROM transport; DELETE FROM company_status_events; DELETE FROM companies; DELETE FROM test_company_deletions;`);
      this.db.exec('COMMIT');this.sessions.clear();
    } catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  emailStatus(token:string) {
    if(!this.account(token)) return null;
    return this.emailRecovery.profile(this.sessions.get(token).login);
  }
  ownLogin(token:string) {
    if(!this.account(token)) throw new Error('Session expirée. Reconnectez-vous.');
    return this.sessions.get(token).login;
  }
  confirmPassword(token:string,password:unknown) {
    const login=this.ownLogin(token),row=this.activeAccount(login);
    if(!row || !matchesPassword(password,String(row.password))) throw new Error('Mot de passe actuel incorrect.');
    return login;
  }
  rebindEmail(login:string,email:unknown,actor:string,ticket:string) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row=this.db.prepare(`SELECT a.company,EXISTS(SELECT 1 FROM account_activation p WHERE p.login=a.login) AS pending
        FROM accounts a LEFT JOIN company_directory c ON c.id=a.company
        WHERE a.login=? AND (a.login='admin' AND a.company IS NULL OR c.status='active')`).get(login);
      if(!row) throw new Error('Compte indisponible ou entreprise désactivée.');
      this.emailRecovery.setAccountAddress(login,email);
      this.db.prepare('UPDATE company_emails SET verified_at=NULL WHERE login=?').run(login);
      this.db.prepare('UPDATE accounts SET session_version=session_version+1 WHERE login=?').run(login);
      this.db.prepare('DELETE FROM company_email_links WHERE login=?').run(login);
      this.db.prepare('INSERT INTO email_security_events(login,actor,ticket,created_at) VALUES(?,?,?,?)').run(login,actor,ticket,new Date().toISOString());
      const purpose=row.company!=null && row.pending ? 'activate' as const : 'verify' as const;
      const link=this.emailRecovery.issue(login,purpose);
      if(!link) throw new Error('Lien de vérification indisponible.');
      this.db.exec('COMMIT');return {...link,purpose};
    } catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  transport(id: string) {
    const row = this.db.prepare('SELECT revision,data FROM transport WHERE company=?').get(id);
    return row ? { revision: Number(row.revision), data: JSON.parse(String(row.data)) } : { revision: 0, data: null };
  }
  saveTransport(id: string, revision: number, data: object, accessRevision?: number) {
    const activeSpace = "SELECT id FROM company_directory WHERE id=? AND status='active' AND (? IS NULL OR status_revision=?)";
    const current = accessRevision ?? null;
    const result = revision === 0
      ? this.db.prepare(`INSERT OR IGNORE INTO transport(company,revision,data) SELECT ?,1,? WHERE EXISTS(${activeSpace})`)
        .run(id, JSON.stringify(data), id, current, current)
      : this.db.prepare(`UPDATE transport SET revision=revision+1,data=? WHERE company=? AND revision=? AND EXISTS(${activeSpace})`)
        .run(JSON.stringify(data), id, revision, id, current, current);
    return !!result.changes;
  }
  close() { this.sessions.clear(); this.db.close(); }
}
