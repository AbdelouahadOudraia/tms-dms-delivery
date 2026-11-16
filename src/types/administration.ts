export type CompanyStatus = 'active' | 'disabled';
export const accountHistoryLimit = 20;
export type AccountStatus = 'active' | 'suspended';
export type AccountBlockReason = 'account_unavailable' | 'company_disabled' | 'account_suspended' | 'activation_pending' | 'email_missing' | 'email_unverified';
export type SecurityAction = 'login_succeeded' | 'login_refused' | 'suspended' | 'reactivated' | 'sessions_revoked' |
  'email_change_requested' | 'email_verified' | 'account_activated' | 'password_reset' | 'password_changed' |
  'email_rebound' | 'company_disabled' | 'company_reactivated' | 'company_registered';
export interface AdminAccount {
  login:string;companyId:string|null;companyName:string|null;companyStatus:CompanyStatus|null;
  role:'admin'|'company';email:string|null;emailVerified:boolean;pendingEmail:string|null;activationPending:boolean;
  status:AccountStatus;revision:number;lastLoginAt:string|null;
  access:{allowed:boolean;reasons:AccountBlockReason[]};
}
export interface AccountSecurityEvent {id:string;action:SecurityAction;actor:string;reason:string|null;at:string}
export interface AccountAccessDetails {account:AdminAccount;history:AccountSecurityEvent[]}

export interface AdminCompany {
  id: string;
  name: string;
  status: CompanyStatus;
  deletionRevision: number | null;
  createdAt: string | null;
  login: string | null;
  email: string | null;
  emailVerified: boolean;
  pendingEmail: string | null;
  activationPending: boolean;
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
  accounts: AdminAccount[];
  session: { login: string; expiresAt: string; email: string | null; emailVerified: boolean;pendingEmail:string|null };
}
