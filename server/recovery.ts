import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CompanyDirectory } from './sales/companies';

function issueCode() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Utilisez un terminal privé et interactif du serveur, sans redirection.');
  }
  const [login, ...extra] = process.argv.slice(2);
  if (!login || extra.length) throw new Error('Usage : npm run auth:recovery -- <identifiant>');
  const file = resolve('.data', 'sales-live.sqlite');
  if (!existsSync(file)) throw new Error('Base absente. Ouvrez le terminal dans le dossier de l’installation TMS.');
  const directory = new CompanyDirectory(file);
  try {
    const code = directory.issueRecoveryCode(login);
    process.stdout.write('Code à usage unique valable 15 minutes (à transmettre en privé) :\n' + code + '\n');
  } finally {
    directory.close();
  }
}

try {
  issueCode();
} catch (error) {
  process.stderr.write((error instanceof Error ? error.message : 'Génération du code impossible.') + '\n');
  process.exitCode = 1;
}
