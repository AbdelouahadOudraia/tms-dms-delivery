export interface AdminCompany {
  id: string;
  name: string;
  createdAt: string | null;
  login: string | null;
  connection: {
    kind: 'seller' | 'standard';
    state: 'configured' | 'revoked' | 'empty';
    automatic: boolean;
    test: boolean | null;
    lastTest: { at: string; ok: boolean } | null;
    lastSyncAt: string | null;
    lastSuccessAt: string | null;
    failures: number;
    importing: boolean;
    error: string | null;
  };
}

export interface AdminOverview {
  companies: AdminCompany[];
  accounts: { login: string; companyId: string | null; role: 'admin' | 'company' }[];
  session: { login: string; expiresAt: string };
}
