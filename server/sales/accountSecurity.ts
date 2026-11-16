import type {DatabaseSync} from 'node:sqlite';
import type {AdminAccount,AccountSecurityEvent,SecurityAction} from '../../src/types/administration';
import {accountHistoryLimit} from '../../src/types/administration';

export class AccountAccessError extends Error {
  constructor(readonly status:number,message:string){super(message);this.name='AccountAccessError';}
}

export function initializeAccountSecurity(db:DatabaseSync) {
  db.exec('BEGIN IMMEDIATE');
  try {db.exec(`
    CREATE TABLE IF NOT EXISTS account_access (
      login TEXT PRIMARY KEY REFERENCES accounts(login) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
      revision INTEGER NOT NULL DEFAULT 0,last_login_at TEXT
    );
    CREATE TABLE IF NOT EXISTS account_security_events (
      id INTEGER PRIMARY KEY,login TEXT NOT NULL REFERENCES accounts(login) ON DELETE CASCADE,
      action TEXT NOT NULL,actor TEXT NOT NULL,reason TEXT,created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS account_security_history ON account_security_events(login,id DESC);
    CREATE TRIGGER IF NOT EXISTS initialize_account_access AFTER INSERT ON accounts
      BEGIN INSERT INTO account_access(login) VALUES(NEW.login); END;
    INSERT OR IGNORE INTO account_access(login) SELECT login FROM accounts;`);
    db.exec('COMMIT');
  } catch(error){db.exec('ROLLBACK');throw error;}
}

// Only controlled action/reason codes are recorded. Never accept an HTTP body or a secret here.
export function recordSecurityEvent(db:DatabaseSync,login:string,action:SecurityAction,actor:string,reason:string|null=null) {
  db.prepare('INSERT INTO account_security_events(login,action,actor,reason,created_at) VALUES(?,?,?,?,?)')
    .run(login,action,actor,reason,new Date().toISOString());
}

export function readAccounts(db:DatabaseSync):AdminAccount[] {
  return db.prepare(`SELECT a.login,a.company,c.name,c.status AS company_status,
    e.address,e.verified_at,e.mailbox,ch.address AS pending_email,x.status,x.revision,x.last_login_at,
    EXISTS(SELECT 1 FROM account_activation p WHERE p.login=a.login) AS pending
    FROM accounts a LEFT JOIN company_directory c ON c.id=a.company
    LEFT JOIN company_emails e ON e.login=a.login LEFT JOIN account_access x ON x.login=a.login
    LEFT JOIN account_email_changes ch ON ch.login=a.login
    ORDER BY a.company IS NOT NULL,a.login`).all().map(row=>{
      const reasons:AdminAccount['access']['reasons']=[];
      const companyId=row.company==null?null:String(row.company),status=row.status==='suspended'?'suspended':'active';
      const emailVerified=Boolean(row.verified_at && row.mailbox);
      if(!row.status || companyId && !row.name || !companyId && row.login!=='admin')reasons.push('account_unavailable');
      if(row.company_status==='disabled')reasons.push('company_disabled');
      if(status==='suspended')reasons.push('account_suspended');
      if(row.pending)reasons.push('activation_pending');
      if(!row.address)reasons.push('email_missing');else if(!emailVerified)reasons.push('email_unverified');
      return {login:String(row.login),companyId,companyName:row.name==null?null:String(row.name),
        companyStatus:row.company_status==null?null:row.company_status as 'active'|'disabled',
        role:companyId?'company':'admin',email:row.address==null?null:String(row.address),emailVerified,
        pendingEmail:row.pending_email==null?null:String(row.pending_email),activationPending:Boolean(row.pending),
        status,revision:Number(row.revision??0),lastLoginAt:row.last_login_at==null?null:String(row.last_login_at),
        access:{allowed:reasons.length===0,reasons}};
    });
}

export function readSecurityHistory(db:DatabaseSync,login:string):AccountSecurityEvent[] {
  return db.prepare(`SELECT 'account-'||id AS id,action,actor,reason,created_at,id AS sequence
      FROM account_security_events WHERE login=?
    UNION ALL SELECT 'email-'||id,'email_rebound',actor,NULL,created_at,id FROM email_security_events WHERE login=?
    ORDER BY created_at DESC,sequence DESC LIMIT ?`).all(login,login,accountHistoryLimit).map(row=>({
      id:String(row.id),action:String(row.action) as SecurityAction,actor:String(row.actor),
      reason:row.reason==null?null:String(row.reason),at:String(row.created_at),
    }));
}
