import {createHash,randomBytes,randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {AccountAccessError,recordSecurityEvent} from './accountSecurity';
import {loginErrorMessages} from '../../src/types/authentication';
import type {UnblockRequest,UnblockDecision} from '../../src/types/administration';

const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
type Identity={login:string;address:string;version:number;revision:number};
export type UnblockNotice={id:string;lease:string;recipient:string;subject:string;body:string};

export class UnblockRequests {
  constructor(private db:DatabaseSync,private identity:(email:unknown,password:unknown)=>Identity|null) {
    db.exec('BEGIN IMMEDIATE');
    try {db.exec(`CREATE TABLE IF NOT EXISTS account_unblock_links (
      login TEXT PRIMARY KEY REFERENCES accounts(login) ON DELETE CASCADE,address TEXT NOT NULL,
      digest TEXT NOT NULL UNIQUE,session_version INTEGER NOT NULL,access_revision INTEGER NOT NULL,
      issued_at INTEGER NOT NULL,expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS account_unblock_requests (
      id TEXT PRIMARY KEY,login TEXT NOT NULL REFERENCES accounts(login) ON DELETE CASCADE,address TEXT NOT NULL,
      access_revision INTEGER NOT NULL,session_version INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','accepted','rejected')),
      created_at TEXT NOT NULL,decided_at TEXT,decided_by TEXT);
      CREATE UNIQUE INDEX IF NOT EXISTS one_pending_unblock ON account_unblock_requests(login) WHERE status='pending';
      CREATE TABLE IF NOT EXISTS account_unblock_notices (
      id TEXT PRIMARY KEY,request_id TEXT NOT NULL REFERENCES account_unblock_requests(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK(kind IN ('admin','decision')),recipient TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','error')),attempts INTEGER NOT NULL DEFAULT 0,
      available_at INTEGER NOT NULL,lease_until INTEGER NOT NULL DEFAULT 0,lease_token TEXT,last_error TEXT,
      UNIQUE(request_id,kind));
      CREATE TRIGGER IF NOT EXISTS invalidate_unblock_credentials AFTER UPDATE OF password,session_version ON accounts
      BEGIN DELETE FROM account_unblock_links WHERE login=NEW.login; END;
      CREATE TRIGGER IF NOT EXISTS invalidate_unblock_address AFTER UPDATE OF address,verified_at ON company_emails
      WHEN OLD.address IS NOT NEW.address OR OLD.verified_at IS NOT NEW.verified_at
      BEGIN DELETE FROM account_unblock_links WHERE login=NEW.login; END;`);
      // A previous draft may have stored requests without their credential epoch.
      // Preserve them, but leave that epoch NULL so they cannot be auto-approved.
      if(!db.prepare("SELECT 1 FROM pragma_table_info('account_unblock_requests') WHERE name='session_version'").get())
        db.exec('ALTER TABLE account_unblock_requests ADD COLUMN session_version INTEGER');
      if(!db.prepare("SELECT 1 FROM pragma_table_info('account_unblock_notices') WHERE name='lease_token'").get())
        db.exec('ALTER TABLE account_unblock_notices ADD COLUMN lease_token TEXT');
      db.prepare("INSERT OR IGNORE INTO auth_migrations(name,applied_at) VALUES('account-unblock-v1',?)").run(new Date(Date.now()).toISOString());
      db.exec('COMMIT');
    } catch(error){db.exec('ROLLBACK');throw error;}
  }
  issue(email:unknown,password:unknown) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const identity=this.identity(email,password);
      if(!identity)throw new AccountAccessError(401,loginErrorMessages.invalidCredentials);
      const pending=this.db.prepare("SELECT 1 FROM account_unblock_requests WHERE login=? AND status='pending'").get(identity.login);
      if(pending){this.db.exec('COMMIT');return {state:'pending' as const};}
      const now=Date.now();
      const recent=this.db.prepare('SELECT created_at FROM account_unblock_requests WHERE login=? ORDER BY created_at DESC LIMIT 1').get(identity.login);
      if(recent&&now-Date.parse(String(recent.created_at))<600000)throw new AccountAccessError(429,'Une demande a déjà été traitée récemment. Réessayez dans dix minutes.');
      const token=randomBytes(32).toString('base64url');
      const issued=this.db.prepare(`INSERT INTO account_unblock_links VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(login) DO UPDATE SET address=excluded.address,digest=excluded.digest,session_version=excluded.session_version,
          access_revision=excluded.access_revision,issued_at=excluded.issued_at,expires_at=excluded.expires_at
        WHERE account_unblock_links.issued_at<=excluded.issued_at-60000 OR account_unblock_links.expires_at<=excluded.issued_at
        RETURNING login`).get(identity.login,identity.address,digest(token),identity.version,identity.revision,now,now+900000);
      this.db.exec('COMMIT');
      return {state:'verification_required' as const,...(issued?{ticket:{address:identity.address,token}}:{})};
    } catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  deliveryFailed(token:string){this.db.prepare('UPDATE account_unblock_links SET expires_at=0 WHERE digest=?').run(digest(token));}
  confirm(token:unknown) {
    if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw new AccountAccessError(400,'Lien invalide, expiré ou déjà utilisé.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row=this.db.prepare(`SELECT l.login,l.address,l.access_revision,l.session_version FROM account_unblock_links l
        JOIN accounts a ON a.login=l.login JOIN account_access x ON x.login=a.login
        JOIN company_emails e ON e.login=a.login JOIN company_directory c ON c.id=a.company
        WHERE l.digest=? AND l.expires_at>? AND x.status='suspended' AND e.verified_at IS NOT NULL AND e.mailbox IS NOT NULL
        AND l.address=e.address AND l.session_version=a.session_version AND l.access_revision=x.revision
        AND NOT EXISTS(SELECT 1 FROM account_activation p WHERE p.login=a.login)`).get(digest(token),Date.now());
      if(!row)throw new AccountAccessError(400,'Lien invalide, expiré ou déjà utilisé.');
      this.db.prepare('DELETE FROM account_unblock_links WHERE login=?').run(row.login);
      const id=randomUUID(),at=new Date(Date.now()).toISOString();
      this.db.prepare("INSERT INTO account_unblock_requests(id,login,address,access_revision,session_version,status,created_at) VALUES(?,?,?,?,?,'pending',?)").run(id,row.login,row.address,row.access_revision,row.session_version,at);
      recordSecurityEvent(this.db,String(row.login),'unblock_requested',String(row.login));
      const admin=this.db.prepare("SELECT address FROM company_emails WHERE login='admin' AND verified_at IS NOT NULL AND mailbox IS NOT NULL").get();
      this.queue(id,'admin',admin?String(admin.address):'','Nouvelle demande de déblocage',`Une demande vérifiée de déblocage du compte ${row.login} attend votre décision dans Comptes et accès. Aucune action n’a débloqué le compte.`);
      this.db.exec('COMMIT');return {state:'pending' as const};
    } catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  list():UnblockRequest[] {
    return this.db.prepare(`SELECT r.*,c.id AS company_id,c.name,c.status AS company_status,x.status AS account_status,x.revision,
      r.session_version=a.session_version AND r.address=e.address AND e.verified_at IS NOT NULL AND e.mailbox IS NOT NULL AND r.access_revision=x.revision AS identity_current,
      n.status AS notification_status FROM account_unblock_requests r JOIN accounts a ON a.login=r.login
      JOIN company_directory c ON c.id=a.company JOIN account_access x ON x.login=a.login
      JOIN company_emails e ON e.login=a.login
      LEFT JOIN account_unblock_notices n ON n.request_id=r.id AND n.kind='decision'
      ORDER BY r.status='pending' DESC,r.created_at DESC,r.id`).all().map(row=>({id:String(row.id),login:String(row.login),
        companyId:String(row.company_id),companyName:String(row.name),email:String(row.address),
        status:row.status as UnblockRequest['status'],createdAt:String(row.created_at),decidedAt:row.decided_at==null?null:String(row.decided_at),
        decidedBy:row.decided_by==null?null:String(row.decided_by),accountRevision:Number(row.revision),
        companyStatus:row.company_status as UnblockRequest['companyStatus'],accountStatus:row.account_status as UnblockRequest['accountStatus'],
        notificationStatus:row.notification_status==null?null:row.notification_status as UnblockRequest['notificationStatus'],identityCurrent:Boolean(row.identity_current)}));
  }
  decide(id:string,decision:UnblockDecision,revision:unknown,actor:string,authorize:()=>boolean,unblock:(login:string,revision:number,actor:string)=>boolean) {
    if(!['accepted','rejected'].includes(decision)||!Number.isSafeInteger(revision)||Number(revision)<0)throw new AccountAccessError(400,'Vérifiez la décision et actualisez la demande.');
    this.db.exec('BEGIN IMMEDIATE');
    let login='';
    try {
      if(!authorize())throw new AccountAccessError(403,'Accès réservé à l’administrateur plateforme.');
      const row=this.db.prepare(`SELECT r.*,x.status AS account_status,x.revision,e.address AS current_address,e.verified_at,e.mailbox,a.session_version AS current_version
        FROM account_unblock_requests r JOIN account_access x ON x.login=r.login JOIN accounts a ON a.login=r.login JOIN company_emails e ON e.login=r.login WHERE r.id=?`).get(id);
      if(!row)throw new AccountAccessError(404,'Demande introuvable.');
      if(row.status!=='pending'||row.revision!==revision)throw new AccountAccessError(409,'Cette demande ou ce compte a changé. Vérifiez les informations actualisées.');
      login=String(row.login);
      if(decision==='accepted') {
        if(row.account_status!=='suspended'||row.access_revision!==row.revision||row.session_version!==row.current_version||row.address!==row.current_address||!row.verified_at||!row.mailbox)
          throw new AccountAccessError(409,'L’identité ou le blocage a changé. Refusez cette demande et demandez une nouvelle vérification.');
        unblock(login,Number(revision),actor);
      }
      this.complete(String(row.id),login,String(row.current_address),decision,actor);
      this.db.exec('COMMIT');return login;
    } catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  completeManual(login:string,actor:string) {
    const row=this.db.prepare("SELECT r.id,e.address FROM account_unblock_requests r JOIN company_emails e ON e.login=r.login WHERE r.login=? AND r.status='pending'").get(login);
    if(row)this.complete(String(row.id),login,String(row.address),'accepted',actor);
  }
  private complete(id:string,login:string,address:string,decision:UnblockDecision,actor:string) {
    this.db.prepare('UPDATE account_unblock_requests SET status=?,decided_at=?,decided_by=? WHERE id=?').run(decision,new Date(Date.now()).toISOString(),actor,id);
    recordSecurityEvent(this.db,login,decision==='accepted'?'unblock_accepted':'unblock_rejected',actor);
    this.db.prepare('DELETE FROM account_unblock_links WHERE login=?').run(login);
    this.queue(id,'decision',address,decision==='accepted'?'Demande de déblocage acceptée':'Demande de déblocage refusée',decision==='accepted'
      ? 'Votre demande de déblocage a été acceptée par l’administrateur de la plateforme. Le compte a été débloqué lors de cette décision. Une nouvelle connexion est nécessaire. Les restrictions ultérieures du compte ou de l’entreprise restent applicables ; une entreprise désactivée reste inaccessible.'
      : 'Votre demande de déblocage a été refusée par l’administrateur de la plateforme. Cette décision ne débloque pas le compte. Contactez l’administrateur pour plus d’informations.');
  }
  private queue(request:string,kind:'admin'|'decision',recipient:string,subject:string,body:string){
    this.db.prepare('INSERT INTO account_unblock_notices(id,request_id,kind,recipient,subject,body,available_at) VALUES(?,?,?,?,?,?,?)')
      .run(randomUUID(),request,kind,recipient,subject,body,Date.now());
  }
  claimNotice():UnblockNotice|null {
    const now=Date.now();
    const lease=randomUUID();
    const row=this.db.prepare(`UPDATE account_unblock_notices SET lease_until=?,lease_token=?,attempts=attempts+1 WHERE id=(
      SELECT id FROM account_unblock_notices WHERE status<>'sent' AND available_at<=? AND lease_until<=? ORDER BY available_at,id LIMIT 1)
      RETURNING id,recipient,subject,body`).get(now+60000,lease,now,now);
    return row?{id:String(row.id),lease,recipient:String(row.recipient),subject:String(row.subject),body:String(row.body)}:null;
  }
  noticeDelivered(id:string,lease:string,success:boolean) {
    this.db.prepare(`UPDATE account_unblock_notices SET status=?,lease_until=0,lease_token=NULL,last_error=?,available_at=? WHERE id=? AND lease_token=?`)
      .run(success?'sent':'error',success?null:'Envoi indisponible. Nouvelle tentative automatique prévue.',Date.now()+60000,id,lease);
  }
  resolveNoticeRecipient(id:string,lease:string) {
    return this.db.prepare(`UPDATE account_unblock_notices SET recipient=coalesce((SELECT e.address FROM account_unblock_requests r
      JOIN company_emails e ON e.login=CASE WHEN account_unblock_notices.kind='admin' THEN 'admin' ELSE r.login END
      WHERE r.id=account_unblock_notices.request_id AND e.verified_at IS NOT NULL AND e.mailbox IS NOT NULL),'')
      WHERE id=? AND lease_token=? RETURNING recipient`).get(id,lease)?.recipient;
  }
  noticeIsCurrent(id:string,lease:string) {
    return Boolean(this.db.prepare(`SELECT 1 FROM account_unblock_notices n JOIN account_unblock_requests r ON r.id=n.request_id
      JOIN company_emails e ON e.login=CASE WHEN n.kind='admin' THEN 'admin' ELSE r.login END
      WHERE n.id=? AND n.lease_token=? AND n.lease_until>? AND e.address=n.recipient AND e.verified_at IS NOT NULL AND e.mailbox IS NOT NULL`).get(id,lease,Date.now()));
  }
}
