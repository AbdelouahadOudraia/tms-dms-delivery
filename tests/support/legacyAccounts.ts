import {join} from 'node:path';
import {CompanyDirectory} from '../../server/sales/companies';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync} from 'node:crypto';

export function verifiedFixture(directory:CompanyDirectory,login:string,address=login+'@fixture.test') {
  directory.emailRecovery.setAccountAddress(login,address);
  const link=directory.emailRecovery.issue(login,'verify');
  if(!link || !directory.emailRecovery.consume(link.token,'verify')) throw new Error('Échec de préparation de l’adresse historique de test.');
}

// Seed historical accounts directly for unrelated regression tests. No public setup bypass.
export function legacyAdmin(root:string,password:string,testMode=false) {
  const directory=new CompanyDirectory(join(root,'.data',testMode?'tenant-test.sqlite':'sales-live.sqlite'),testMode);
  try {directory.setup(password);verifiedFixture(directory,'admin');} finally {directory.close();}
}
export function legacyCompany(root:string,name:string,login:string,password:string,testMode=false) {
  const directory=new CompanyDirectory(join(root,'.data',testMode?'tenant-test.sqlite':'sales-live.sqlite'),testMode);
  try {const result=directory.create(name,login,password);verifiedFixture(directory,login);return result;} finally {directory.close();}
}

export function legacyAccess(root:string,login:string,password:string,testMode=false) {
  const file=join(root,'.data',testMode?'tenant-test.sqlite':'sales-live.sqlite');
  const db=new DatabaseSync(file),salt=randomBytes(16).toString('hex');
  try {db.prepare('INSERT INTO accounts(login,password,company) VALUES(?,?,?)').run(login,salt+':'+scryptSync(password,salt,32).toString('hex'),login);} finally {db.close();}
  const directory=new CompanyDirectory(file,testMode);
  try {verifiedFixture(directory,login);} finally {directory.close();}
}
