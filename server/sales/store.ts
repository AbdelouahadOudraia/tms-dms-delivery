import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SalesWorkspace } from '../../src/types/sales';
import { createSalesWorkspace } from '../../src/utils/salesSynchronization';

export class SalesStore {
  private db: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA busy_timeout=5000');
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS sales_workspaces (company_id TEXT PRIMARY KEY, state_json TEXT NOT NULL)');
  }
  companyIds(): string[] { return this.db.prepare('SELECT company_id FROM sales_workspaces').all().map(row => String(row.company_id)); }
  read(companyId: string): SalesWorkspace {
    const row = this.db.prepare('SELECT state_json FROM sales_workspaces WHERE company_id = ?').get(companyId) as { state_json: string } | undefined;
    return row ? JSON.parse(row.state_json) : createSalesWorkspace(companyId);
  }
  transaction(companyId: string, update: (state: SalesWorkspace) => SalesWorkspace): SalesWorkspace {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const next = update(this.read(companyId));
      if (next.companyId !== companyId) throw new Error('L’entreprise du traitement est invalide.');
      this.db.prepare('INSERT INTO sales_workspaces(company_id, state_json) VALUES (?, ?) ON CONFLICT(company_id) DO UPDATE SET state_json = excluded.state_json').run(companyId, JSON.stringify(next));
      this.db.exec('COMMIT');
      return next;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}
