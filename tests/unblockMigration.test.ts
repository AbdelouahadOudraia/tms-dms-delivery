import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {CompanyDirectory} from '../server/sales/companies';
import {demoDatabase} from '../server/sales/demoDatabase';
import {requireAuthMigrationApproval} from '../server/sales/authMigration';

test('déblocage : migration additive préserve les données et refuse les preuves historiques sans version',t=>{
  const parent=resolve(tmpdir()),root=mkdtempSync(join(parent,'tms-unblock-migration-')),previous=process.env.NODE_ENV;
  process.env.NODE_ENV='development';const file=demoDatabase(root);let directory:CompanyDirectory;
  t.after(()=>{directory?.close();if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;
    if(dirname(resolve(root))===parent&&basename(root).startsWith('tms-unblock-migration-'))rmSync(root,{recursive:true,force:true});});
  directory=new CompanyDirectory(file,true,true);directory.setup('migration-admin-password');
  directory.create('Entreprise historique','migration','migration-company-password');
  for(const [login,email]of [['admin','admin@demo.test'],['migration','migration@demo.test']]) {
    directory.emailRecovery.setAccountAddress(login,email);
    assert.equal(directory.emailRecovery.consume(directory.emailRecovery.issue(login,'verify').token,'verify'),true);
  }
  directory.saveTransport('migration',0,{marker:'business-preserved'});directory.close();directory=null;
  const old=new DatabaseSync(file);
  let accounts:unknown[],transport:unknown[],request:Record<string,unknown>;
  try {
    old.exec("UPDATE account_access SET status='suspended',revision=1 WHERE login='migration'");
    const version=old.prepare("SELECT session_version FROM accounts WHERE login='migration'").get().session_version;
    old.prepare("INSERT INTO account_unblock_requests(id,login,address,access_revision,session_version,status,created_at) VALUES('legacy-request','migration','migration@demo.test',1,?,'pending','2026-01-01T10:00:00Z')").run(version);
    old.prepare("INSERT INTO account_unblock_notices(id,request_id,kind,recipient,subject,body,available_at) VALUES('legacy-notice','legacy-request','admin','admin@demo.test','Sujet préservé','Texte préservé',0)").run();
    old.exec("ALTER TABLE account_unblock_requests DROP COLUMN session_version; ALTER TABLE account_unblock_notices DROP COLUMN lease_token; DELETE FROM auth_migrations WHERE name='account-unblock-v1'");
    accounts=old.prepare('SELECT * FROM accounts ORDER BY login').all();transport=old.prepare('SELECT * FROM transport').all();
    request=old.prepare('SELECT * FROM account_unblock_requests').get();
  } finally {old.close();}
  assert.throws(()=>requireAuthMigrationApproval(file),/Migration/);
  directory=new CompanyDirectory(file,true,true);
  assert.doesNotThrow(()=>requireAuthMigrationApproval(file));
  const db=new DatabaseSync(file,{readOnly:true});
  try {
    assert.deepEqual(db.prepare('SELECT * FROM accounts ORDER BY login').all(),accounts);
    assert.deepEqual(db.prepare('SELECT * FROM transport').all(),transport);
    assert.deepEqual({...db.prepare('SELECT * FROM account_unblock_requests').get()},{...request,session_version:null});
    assert.equal(db.prepare("SELECT body FROM account_unblock_notices WHERE id='legacy-notice'").get().body,'Texte préservé');
    const token=directory.login('admin@demo.test','migration-admin-password');
    assert.equal(directory.listUnblockRequests(token)[0].identityCurrent,false);
    assert.throws(()=>directory.decideUnblock(token,'legacy-request','accepted',1),/identité|blocage/);
    assert.equal(directory.listUnblockRequests(token)[0].status,'pending');
    assert.equal(directory.accountDetails(token,'migration').account.status,'suspended');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  } finally {db.close();}
});
