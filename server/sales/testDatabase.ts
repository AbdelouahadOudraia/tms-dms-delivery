import { lstatSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// SQLite application_id identifies databases created specifically for the local test environment.
export const TEST_APPLICATION_ID = 0x544d5354;

export function testDatabasePath(root: string) {
  const dir = path.resolve(root, '.data');
  if (lstatSync(dir, {throwIfNoEntry:false})?.isSymbolicLink()) throw new Error('Le répertoire de test doit être un répertoire local distinct.');
  const file = path.join(dir, 'tenant-test.sqlite');
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const stat = lstatSync(file + suffix, {throwIfNoEntry:false});
    if (stat && (!stat.isFile() || stat.nlink !== 1)) throw new Error('Un fichier de la base de test est partagé ou redirigé.');
  }
  return file;
}

export function localTestDatabase(root: string) {
  if (process.env.NODE_ENV !== 'development') throw new Error('La base de test exige le mode développement.');
  const file = testDatabasePath(root);
  mkdirSync(path.dirname(file), {recursive:true});
  const db = new DatabaseSync(file);
  try {
    db.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
    const id = db.prepare('PRAGMA application_id').get().application_id;
    if (id !== TEST_APPLICATION_ID) {
      if (id !== 0 || db.prepare('SELECT 1 FROM sqlite_schema LIMIT 1').get())
        throw new Error('Ce fichier contient une base existante qui ne provient pas du mode de test.');
      db.exec(`PRAGMA application_id=${TEST_APPLICATION_ID}`);
    }
    db.exec('COMMIT');
  } finally {
    // SQLite rolls back an unfinished transaction when this connection closes.
    db.close();
  }
  return file;
}
