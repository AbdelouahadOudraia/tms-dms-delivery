import {existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

function uniqueNameIndexes(db:DatabaseSync) {
  return db.prepare("SELECT name FROM pragma_index_list('companies') WHERE \"unique\"=1").all()
    .filter(index=>{
      const columns=db.prepare('SELECT name FROM pragma_index_info(?)').all(String(index.name));
      return columns.length===1 && columns[0].name==='name';
    }).map(index=>String(index.name));
}

// Reloading development code must never migrate the real database without approval.
export function requireCompanyNameMigrationApproval(file:string) {
  if(!existsSync(file))return;
  const db=new DatabaseSync(file,{readOnly:true});
  let required=false;
  try {db.exec('PRAGMA query_only=ON; PRAGMA temp_store=MEMORY');required=uniqueNameIndexes(db).length>0;}
  finally {db.close();}
  if(required && process.env.TMS_ALLOW_COMPANY_NAME_MIGRATION!=='true')
    throw new Error('Migration des noms d’entreprise bloquée sur la base habituelle. Sauvegardez cette base et obtenez une autorisation explicite avant de définir TMS_ALLOW_COMPANY_NAME_MIGRATION=true. Utilisez le mode démo pour les essais.');
}

export function allowRepeatedCompanyNames(db:DatabaseSync) {
  if(!uniqueNameIndexes(db).length)return;
  const foreignKeys=Number(db.prepare('PRAGMA foreign_keys').get().foreign_keys);
  const legacyAlter=Number(db.prepare('PRAGMA legacy_alter_table').get().legacy_alter_table);
  db.exec('PRAGMA foreign_keys=OFF; PRAGMA legacy_alter_table=ON; BEGIN IMMEDIATE');
  try {
    const indexes=uniqueNameIndexes(db);
    if(indexes.length) {
      const original=String(db.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name='companies'").get().sql);
      const withoutUnique=original.replace(/\b(name\s+TEXT\s+NOT\s+NULL\s+COLLATE\s+NOCASE)\s+UNIQUE\b/i,'$1');
      const replacement=withoutUnique.replace(/^CREATE\s+TABLE\s+(?:"companies"|`companies`|\[companies\]|companies)(?=\s*\()/i,'CREATE TABLE "__companies_name_migration"');
      if(withoutUnique===original || replacement===withoutUnique)
        throw new Error('Schéma des entreprises inattendu : migration manuelle nécessaire, aucune donnée supprimée.');
      const objects=db.prepare("SELECT name,sql FROM sqlite_schema WHERE tbl_name='companies' AND type IN ('index','trigger') AND sql IS NOT NULL").all()
        .filter(object=>!indexes.includes(String(object.name)));
      // Copy every column, retaining IDs, dates, custom fields and all referencing rows.
      db.exec(replacement);
      db.exec('INSERT INTO "__companies_name_migration" SELECT * FROM companies; DROP TABLE companies; ALTER TABLE "__companies_name_migration" RENAME TO companies');
      for(const object of objects)db.exec(String(object.sql));
      if(db.prepare('PRAGMA foreign_key_check').all().length)
        throw new Error('Migration annulée : vérification des relations SQLite échouée.');
    }
    db.exec('COMMIT');
  } catch(error){db.exec('ROLLBACK');throw error;}
  finally {db.exec('PRAGMA legacy_alter_table='+legacyAlter+'; PRAGMA foreign_keys='+foreignKeys);}
}
