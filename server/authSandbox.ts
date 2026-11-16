import 'dotenv/config';
import {mkdirSync,mkdtempSync,lstatSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'vite';

export function createAuthSandbox(project:string) {
  if(process.env.NODE_ENV==='production') throw new Error('Le bac à sable d’authentification est réservé au développement.');
  const data=path.join(project,'.data'),parent=path.join(data,'auth-sandboxes');
  for(const dir of [data,parent])if(lstatSync(dir,{throwIfNoEntry:false})?.isSymbolicLink()) throw new Error('Le bac à sable doit rester dans un répertoire local distinct.');
  mkdirSync(parent,{recursive:true});
  return mkdtempSync(path.join(parent,'auth-'));
}
async function main() {
  const project=process.cwd(),sandbox=createAuthSandbox(project);
  process.env.NODE_ENV='development';
  process.chdir(sandbox);
  const server=await createServer({root:project,configFile:path.join(project,'vite.config.ts'),mode:'tenant-test',
    server:{host:'127.0.0.1',port:3010,strictPort:true},logLevel:'info'});
  const close=async()=>{await server.close();};
  process.once('SIGINT',()=>void close());process.once('SIGTERM',()=>void close());
  try {
    await server.listen();
    process.stdout.write('Authentification isolée : http://127.0.0.1:3010\nBase : '+path.join(sandbox,'.data','tenant-test.sqlite')+'\nChaque lancement utilise un nouvel espace. Les bases existantes sont conservées.\n');
  } catch(error){await close();throw error;}
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(error=>{process.stderr.write(error instanceof Error?error.message+'\n':'Démarrage impossible.\n');process.exitCode=1;});
