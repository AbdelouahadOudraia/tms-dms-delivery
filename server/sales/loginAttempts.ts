import {createHash} from 'node:crypto';
import type {RequestHandler} from 'express';
import {emailKey} from './companyEmail';

export const loginAttemptLimits = {ip:20,account:10,windowMs:60_000} as const;
type Window = {count:number;until:number};

export function limitLoginAttempts(resets?:(()=>void)[]):RequestHandler {
  const addresses=new Map<string,Window>(),accounts=new Map<string,Window>();
  let nextCleanup=0;
  resets?.push(()=>{addresses.clear();accounts.clear();});
  const windowFor=(windows:Map<string,Window>,key:string,now:number)=>{
    let window=windows.get(key);
    if(!window || now>=window.until) {
      window={count:0,until:now+loginAttemptLimits.windowMs};windows.set(key,window);
    }
    return window;
  };
  return (req,res,next)=>{
    const now=Date.now();
    if(now>=nextCleanup) {
      for(const windows of [addresses,accounts])for(const [key,window]of windows)if(window.until<=now)windows.delete(key);
      nextCleanup=now+loginAttemptLimits.windowMs;
    }
    const address=windowFor(addresses,req.socket.remoteAddress??'',now);
    const reject=(until:number)=>{
      res.setHeader('Retry-After',String(Math.ceil((until-now)/1000)));
      res.status(429).json({error:'Trop de tentatives. Réessayez dans une minute.'});
    };
    if(address.count>=loginAttemptLimits.ip)return reject(address.until);
    // Every admitted request consumes the IP budget, including successful logins
    // and requests subsequently refused by the account limiter.
    address.count++;
    const email=emailKey(req.body?.login);
    if(email) {
      // Use the same canonical mailbox as authentication, without querying account
      // existence or retaining the submitted address in the limiter.
      const key=createHash('sha256').update(email).digest('hex');
      const account=windowFor(accounts,key,now);
      if(account.count>=loginAttemptLimits.account)return reject(account.until);
      // Reserve before authentication so concurrent requests cannot exceed the cap.
      account.count++;
      res.once('finish',()=>{
        // A success releases only its own reservation; prior failures remain.
        if(res.statusCode<400 && accounts.get(key)===account)account.count--;
      });
    }
    next();
  };
}
