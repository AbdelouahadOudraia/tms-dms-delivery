import {lstatSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';

export const DEMO_APPLICATION_ID=0x544d5344;
function demoFile(root:string) {
  if(process.env.NODE_ENV!=='development') throw new Error('La démonstration est réservée au développement local.');
  const data=path.resolve(root,'.data'),dir=path.join(data,'demo');
  for(const folder of [data,dir]) if(lstatSync(folder,{throwIfNoEntry:false})?.isSymbolicLink())
    throw new Error('Le stockage démo doit être un répertoire local distinct.');
  const file=path.join(dir,'demo.sqlite');
  for(const suffix of ['','-wal','-shm','-journal']) {
    const stat=lstatSync(file+suffix,{throwIfNoEntry:false});
    if(stat && (!stat.isFile() || stat.nlink!==1)) throw new Error('La base démo ne doit pas être partagée ou redirigée.');
  }
  return file;
}
export function demoDatabase(root:string) {
  const file=demoFile(root);mkdirSync(path.dirname(file),{recursive:true});
  const db=new DatabaseSync(file);
  try {
    db.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
    const id=db.prepare('PRAGMA application_id').get().application_id;
    if(id!==DEMO_APPLICATION_ID) {
      if(id!==0 || db.prepare('SELECT 1 FROM sqlite_schema LIMIT 1').get()) throw new Error('Ce fichier ne provient pas du mode démo.');
      db.exec('PRAGMA application_id='+DEMO_APPLICATION_ID);
    }
    db.exec('COMMIT');
  } finally {db.close();}
  return file;
}
export function assertDemoDatabase(file:string) {
  const root=path.dirname(path.dirname(path.dirname(path.resolve(file))));
  if(path.resolve(file)!==demoFile(root)) throw new Error('Base de démonstration isolée requise.');
  const db=new DatabaseSync(file,{readOnly:true});
  try {if(db.prepare('PRAGMA application_id').get().application_id!==DEMO_APPLICATION_ID) throw new Error('Marqueur de démonstration invalide.');}
  finally {db.close();}
}
