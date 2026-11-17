import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRefreshTask,watchesResource} from '../src/utils/autoRefresh';
import {adoptTransportSnapshot,serializeTransport} from '../src/utils/transportSnapshot';
import type {TransportState} from '../src/context/companyApi';

function clock() {
  let now=0,id=0;const timers=new Map<number,{at:number;fn:()=>void}>();
  return {now:()=>now,schedule:(fn:()=>void,delay:number)=>{const key=++id;timers.set(key,{at:now+delay,fn});return key;},cancel:(key:unknown)=>{timers.delete(Number(key));},
    async advance(ms:number){const end=now+ms;while(true){const next=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await Promise.resolve();await Promise.resolve();}now=end;},count:()=>timers.size};
}

test('actualisation : demandes regroupées, une lecture en vol, annulation et nettoyage',async()=>{
  const time=clock();let calls=0,signal:AbortSignal,complete:()=>void;
  const task=createRefreshTask(async current=>{calls++;signal=current;await new Promise<void>(resolve=>{complete=resolve;});},{...time,available:()=>true});
  task.request();await time.advance(0);assert.equal(calls,1);
  for(let i=0;i<20;i++)task.request(true);
  assert.equal(signal.aborted,true);await time.advance(5000);assert.equal(calls,1);
  complete();await Promise.resolve();await Promise.resolve();await time.advance(0);assert.equal(calls,2);
  task.dispose();assert.equal(signal.aborted,true);complete();await Promise.resolve();await Promise.resolve();
  await time.advance(60000);assert.equal(calls,2);assert.equal(time.count(),0);
});

test('actualisation : pause hors ligne/arrière-plan/saisie, reprise et délai entre lectures',async()=>{
  const time=clock();let available=false,calls=0;
  const task=createRefreshTask(async()=>{calls++;},{...time,available:()=>available});
  task.request();await time.advance(30000);assert.equal(calls,0);
  available=true;task.request();await time.advance(0);assert.equal(calls,1);
  for(let i=0;i<10;i++)task.request();await time.advance(499);assert.equal(calls,1);
  await time.advance(1);assert.equal(calls,2);
  await time.advance(14999);assert.equal(calls,2);await time.advance(1);assert.equal(calls,3);
  task.dispose();
});

test('actualisation : erreurs espacées et retour à la fréquence normale après réussite',async()=>{
  const time=clock();let failed=true,calls=0,errors=0;
  const task=createRefreshTask(async()=>{calls++;if(failed)throw Error('offline');},{...time,available:()=>true,onError:()=>{errors++;}});
  task.request();await time.advance(0);assert.equal(errors,1);
  await time.advance(29999);assert.equal(calls,1);await time.advance(1);assert.equal(errors,2);
  failed=false;await time.advance(60000);assert.equal(calls,3);
  await time.advance(15000);assert.equal(calls,4);task.dispose();
});

test('notifications : relecture ciblée et séparation des espaces entreprises',()=>{
  assert.equal(watchesResource('/companies/alpha/transport','/companies/beta/transport'),false);
  assert.equal(watchesResource('/companies/alpha/state','/companies/alpha-other/settings'),false);
  assert.equal(watchesResource('/companies/alpha/transport','/companies/alpha/transport'),true);
  assert.equal(watchesResource('/admin/accounts/alpha','/admin/accounts/beta/status'),false);
  assert.equal(watchesResource('/admin/accounts/alpha','/admin/accounts/alpha/status'),true);
  assert.equal(watchesResource('/demo/messages','/company-email/reset'),true);
  assert.equal(watchesResource('/admin/unblock-requests','/account-unblock/verify'),true);
  assert.equal(watchesResource('/admin/unblock-requests','/company-email/reset'),true);
  assert.equal(watchesResource('/admin/accounts/alpha','/admin/unblock-requests/request-id'),true);
  assert.equal(watchesResource('/demo/messages','/admin/unblock-requests/request-id'),true);
});

const transport=(name:string)=>({deliveries:[],tours:[],drivers:[],vehicles:[],incidents:[],addresses:[],zones:[],workflowSettings:{hubName:name}} as TransportState);
test('transport : version distante adoptée sans réenregistrement, anciennes réponses ignorées',()=>{
  const original=transport('A'),updated=transport('B'),local={revision:1,saved:serializeTransport(original),pending:serializeTransport(original),running:null};
  assert.deepEqual(adoptTransportSnapshot(local,{revision:2,data:updated}),updated);
  assert.equal(local.revision,2);assert.equal(local.saved,serializeTransport(updated));assert.equal(local.pending,local.saved);
  assert.equal(adoptTransportSnapshot(local,{revision:1,data:original}),null);
  assert.equal(adoptTransportSnapshot(local,{revision:3,data:{...updated}}),null);assert.equal(local.revision,3);
  assert.equal(serializeTransport({...updated,deliveries:[]}),local.saved);
});

test('transport : aucune perte de modifications locales ou de sauvegarde en cours',()=>{
  const a=serializeTransport(transport('A')),b=serializeTransport(transport('B'));
  const dirty={revision:1,saved:a,pending:b,running:null};
  assert.equal(adoptTransportSnapshot(dirty,{revision:2,data:transport('C')}),null);assert.equal(dirty.pending,b);assert.equal(dirty.revision,1);
  const saving={revision:1,saved:a,pending:a,running:{}};
  assert.equal(adoptTransportSnapshot(saving,{revision:2,data:transport('C')}),null);assert.equal(saving.revision,1);
  const clean={revision:1,saved:a,pending:a,running:null};
  assert.equal(adoptTransportSnapshot(clean,{revision:2,data:null}),null);
  assert.equal(adoptTransportSnapshot(clean,{revision:2,data:{} as TransportState}),null);assert.equal(clean.revision,1);
});
