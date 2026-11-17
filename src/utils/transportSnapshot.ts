import type {TransportSnapshot,TransportState} from '../context/companyApi';

export const serializeTransport=(data:TransportState)=>JSON.stringify({deliveries:data.deliveries,tours:data.tours,drivers:data.drivers,vehicles:data.vehicles,incidents:data.incidents,addresses:data.addresses,zones:data.zones,workflowSettings:data.workflowSettings});

export function adoptTransportSnapshot(local:{revision:number;saved:string;pending:string;running:unknown},remote:TransportSnapshot):TransportState|null {
  if(local.running || local.saved!==local.pending || remote.revision<=local.revision || !remote.data)return null;
  const data=remote.data;
  if(!['deliveries','tours','drivers','vehicles','incidents','addresses','zones'].every(key=>Array.isArray(data[key])) || !data.workflowSettings || typeof data.workflowSettings!=='object')return null;
  const serialized=serializeTransport(data),changed=serialized!==local.saved;
  local.revision=remote.revision;local.saved=local.pending=serialized;
  return changed?data:null;
}
