import type { Delivery, Tour, Driver, Vehicle, DeliveryAddress, DeliveryZone, Incident } from '../types';
import type { WorkflowSettings } from './TmsContext';
import type { CompanyStatus } from '../types/administration';
import {loginErrorMessages} from '../types/authentication';

export interface Company { id: string; name: string; demo?: boolean; status?: CompanyStatus }
export interface TransportState {
  deliveries: Delivery[]; tours: Tour[]; drivers: Driver[]; vehicles: Vehicle[];
  addresses: DeliveryAddress[]; zones: DeliveryZone[]; incidents: Incident[]; workflowSettings: WorkflowSettings;
}
export interface TransportSnapshot { revision: number; data: TransportState | null }
export const companyPath = (id: string) => '/companies/' + encodeURIComponent(id);
export const sessionKey = 'tms.access';
export const sessionExpiredMessage = 'Votre session a expiré. Reconnectez-vous pour accéder à votre espace.';
export const networkMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.';
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = sessionStorage.getItem(sessionKey);
  const publicAuth = path === '/login' || path.startsWith('/company-email/') || path === '/setup';
  const response = await fetch('/api/sales' + path, { method, cache: 'no-store', headers: {
    ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
  }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (response.status === 401 && !publicAuth && token && sessionStorage.getItem(sessionKey) === token) {
    sessionStorage.removeItem(sessionKey); window.dispatchEvent(new Event('tms-session-expired'));
    throw new Error(sessionExpiredMessage);
  }
  if (publicAuth || path === '/access') {
    if (path!=='/setup' && [502,503,504].includes(response.status)) throw new Error('Le serveur TMS est indisponible. Réessayez plus tard.');
    if (path!=='/setup' && response.status >= 500) throw new Error('Une erreur technique est survenue. Réessayez plus tard.');
    if (path === '/login' && response.status === 401) throw new Error(loginErrorMessages.invalidCredentials);
  }
  let result;
  try { result = await response.json(); } catch { throw new Error('Le serveur TMS est indisponible.'); }
  if(path==='/login' && response.status===403 && result.code==='COMPANY_DISABLED')
    throw new Error(loginErrorMessages.companyDisabled);
  if(path==='/login' && response.status===403 && result.code==='ACCOUNT_SUSPENDED')
    throw new Error(loginErrorMessages.accountSuspended);
  if (!response.ok) throw new Error(result.error || 'Opération refusée.');
  return result as T;
}
