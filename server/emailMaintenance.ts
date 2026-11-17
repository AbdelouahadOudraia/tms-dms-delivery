import 'dotenv/config';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {userInfo} from 'node:os';
import {createInterface} from 'node:readline/promises';
import {pathToFileURL} from 'node:url';
import {CompanyDirectory} from './sales/companies';
import {configureMail} from './sales/mail';
import {testDatabasePath} from './sales/testDatabase';
import {requireAuthMigrationApproval} from './sales/authMigration';

// Server-operator maintenance only. Never imported by an HTTP route.
export async function rebindEmail(root:string,testMode:boolean,login:string,email:string,ticket:string,actor:string) {
  const prefix=testMode?'TMS_TEST_':'TMS_';
  if(process.env[prefix+'ALLOW_EMAIL_REBIND']!=='true') throw new Error('Maintenance e-mail non autorisée dans cet environnement.');
  if(!/^[a-z0-9][a-z0-9-]{1,63}$/.test(login) || !/^[A-Za-z0-9_-]{3,64}$/.test(ticket) || !actor || actor.length>100)
    throw new Error('Compte ou référence de dossier de maintenance invalide.');
  const file=testMode?testDatabasePath(root):path.join(root,'.data','sales-live.sqlite');
  if(!existsSync(file)) throw new Error('Base absente. Aucune base ne sera créée par cette procédure.');
  if(!testMode)requireAuthMigrationApproval(file);
  const mail=configureMail(testMode);
  if(!mail) throw new Error('Configurez le SMTP et l’URL publique avant la maintenance.');
  try {await mail.check();} catch {throw new Error('Service SMTP indisponible. Aucun changement effectué.');}
  const directory=new CompanyDirectory(file,testMode);
  try {
    const link=directory.rebindEmail(login,email,actor,ticket);
    try {await mail.send(link.address,link.token,link.purpose,link.login);}
    catch {directory.emailRecovery.deliveryFailed(link.token);throw new Error('Message refusé par SMTP. Le compte reste bloqué jusqu’à vérification ; traiter le dossier de maintenance.');}
  } finally {directory.close();}
}

async function main() {
  if(!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Utilisez uniquement un terminal privé et interactif sur le serveur autorisé.');
  const args=process.argv.slice(2);
  if(args.length>1 || args.length===1 && args[0]!=='--tenant-test') throw new Error('Option de maintenance invalide.');
  const prompt=createInterface({input:process.stdin,output:process.stdout});
  try {
    const confirmation=await prompt.question('Identité contrôlée, double accord consigné, sauvegarde récupérable et serveur arrêté ? Saisir AUTORISATION VALIDEE : ');
    if(confirmation!=='AUTORISATION VALIDEE') throw new Error('Maintenance annulée.');
    const login=(await prompt.question('Identifiant interne du compte concerné : ')).trim();
    const email=(await prompt.question('Nouvelle adresse e-mail contrôlée : ')).trim();
    const ticket=(await prompt.question('Référence du dossier approuvé (sans données personnelles) : ')).trim();
    await rebindEmail(process.cwd(),args[0]==='--tenant-test',login,email,ticket,userInfo().username);
    process.stdout.write('Le serveur SMTP a accepté le message. L’adresse doit être vérifiée avant tout accès. Le mot de passe n’a pas été changé.\n');
  } finally {prompt.close();}
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error=>{process.stderr.write(error instanceof Error?error.message+'\n':'Maintenance impossible.\n');process.exitCode=1;});
}
