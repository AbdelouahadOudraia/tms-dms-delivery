import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import type {Request,Response} from 'express';
import {limitLoginAttempts,loginAttemptLimits} from '../server/sales/loginAttempts';

function fixture(t:TestContext) {
  let now=Date.now();t.mock.method(Date,'now',()=>now);
  const resets:(()=>void)[]=[],middleware=limitLoginAttempts(resets);
  function request(login:unknown,ip='192.0.2.1',status=401,finish=true) {
    let accepted=false;
    const headers=new Map<string,string>(),res=new EventEmitter() as EventEmitter & {
      statusCode:number;setHeader(name:string,value:string):void;status(code:number):unknown;json(body:unknown):void;
    };
    res.statusCode=status;res.setHeader=(name,value)=>{headers.set(name,value);};
    res.status=code=>{res.statusCode=code;return res;};res.json=()=>{};
    middleware({socket:{remoteAddress:ip},body:{login}} as Request,res as unknown as Response,()=>{accepted=true;});
    if(accepted && finish)res.emit('finish');
    return {accepted,status:res.statusCode,retry:headers.get('Retry-After'),finish:()=>res.emit('finish')};
  }
  return {request,advance:(ms:number)=>{now+=ms;},reset:()=>resets.forEach(reset=>reset())};
}

test('limiteur : plafond IP partagé entre comptes, y compris après un succès',t=>{
  const {request,advance}=fixture(t);
  for(let i=0;i<19;i++)assert.equal(request('unknown-'+i+'@example.test').accepted,true);
  assert.equal(request('valid@example.test','192.0.2.1',200).accepted,true);
  const capped=request('another@example.test');assert.equal(capped.status,429);assert.equal(capped.retry,'60');
  advance(loginAttemptLimits.windowMs-1000);assert.equal(request('another@example.test').retry,'1');
  advance(1000);assert.equal(request('another@example.test').accepted,true);
});

test('limiteur : échecs du compte partagés entre IP, normalisation e-mail et indépendance des comptes',t=>{
  const {request,advance}=fixture(t);
  for(let i=0;i<5;i++)assert.equal(request('A.User+tag@gmail.com','192.0.2.1').accepted,true);
  assert.equal(request('other@example.test','192.0.2.2',200).accepted,true);
  for(let i=0;i<5;i++)assert.equal(request('auser@googlemail.com','192.0.2.2').accepted,true);
  assert.equal(request(' AUSER@gmail.com ','192.0.2.3',200).status,429);
  assert.equal(request('other@example.test','192.0.2.3',200).accepted,true);
  advance(loginAttemptLimits.windowMs);assert.equal(request('auser@gmail.com','192.0.2.3').accepted,true);
});

test('limiteur : réserver les appels concurrents, sans effacer les échecs antérieurs ni une nouvelle fenêtre',t=>{
  const {request,advance}=fixture(t);
  for(let i=0;i<9;i++)assert.equal(request('target@example.test').accepted,true);
  const pending=request('target@example.test','192.0.2.2',200,false);
  assert.equal(request('target@example.test','192.0.2.3').status,429);
  pending.finish();
  assert.equal(request('target@example.test','192.0.2.3').accepted,true);
  assert.equal(request('target@example.test','192.0.2.3').status,429);
  advance(loginAttemptLimits.windowMs);
  const stale=request('target@example.test','192.0.2.4',200,false);
  advance(loginAttemptLimits.windowMs);
  for(let i=0;i<10;i++)assert.equal(request('target@example.test','192.0.2.5').accepted,true);
  stale.finish();assert.equal(request('target@example.test','192.0.2.6').status,429);
});

test('limiteur : plafond IP pour les saisies invalides et remise à zéro de démonstration',t=>{
  const {request,reset}=fixture(t);
  for(let i=0;i<20;i++)assert.equal(request(i%2?undefined:{invalid:true}).accepted,true);
  assert.equal(request('valid@example.test').status,429);
  reset();assert.equal(request('valid@example.test','192.0.2.1',200).accepted,true);
});
