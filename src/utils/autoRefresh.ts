export const refreshInterval = 15_000;
export type RefreshTask = ReturnType<typeof createRefreshTask>;

// One request at a time, coalesced invalidations and bounded retry backoff.
export function createRefreshTask(run:(signal:AbortSignal)=>Promise<void>, options:{
  available():boolean; interval?:number; onError?(error:unknown):void;
  now?:()=>number; schedule?:(fn:()=>void,delay:number)=>unknown; cancel?:(id:unknown)=>void;
}) {
  const now=options.now??Date.now,interval=options.interval??refreshInterval;
  const schedule=options.schedule??((fn,delay)=>setTimeout(fn,delay));
  const cancel=options.cancel??(id=>clearTimeout(id as ReturnType<typeof setTimeout>));
  let timer:unknown,running=false,disposed=false,wanted=false,lastStart=-Infinity,failures=0,controller:AbortController|null=null;
  function plan(delay:number) {if(disposed)return;if(timer!==undefined)cancel(timer);timer=schedule(()=>{timer=undefined;void execute();},delay);}
  async function execute() {
    if(disposed || running)return;
    if(!options.available()){plan(1000);return;}
    wanted=false;running=true;lastStart=now();controller=new AbortController();
    const current=controller;
    try {await run(current.signal);if(!current.signal.aborted)failures=0;}
    catch(error){if(!current.signal.aborted){failures++;options.onError?.(error);}}
    finally {running=false;if(controller===current)controller=null;plan(wanted?Math.max(0,500-(now()-lastStart)):Math.min(60_000,interval*2**Math.min(failures,3)));}
  }
  return {
    request(invalidate=false){if(disposed)return;wanted=true;if(invalidate)controller?.abort();if(!running)plan(Math.max(0,500-(now()-lastStart)));},
    dispose(){disposed=true;controller?.abort();if(timer!==undefined)cancel(timer);},
  };
}

export function watchesResource(resource:string,path:string) {
  if(resource==='/access')return path==='/setup'||path==='/login'||path==='/logout'||path.startsWith('/company-email/')||path.startsWith('/companies')||path.startsWith('/admin/accounts/')||path.startsWith('/own-email');
  if(resource==='/admin/overview')return !path.startsWith('/demo/');
  if(resource==='/admin/unblock-requests')return path.startsWith('/account-unblock/')||path.startsWith('/admin/unblock-requests')||path.startsWith('/admin/accounts/')||path.startsWith('/company-email/')||path.startsWith('/companies')||path.startsWith('/own-email');
  if(resource.startsWith('/admin/accounts/'))return path==='/login'||path.startsWith(resource+'/')||path.startsWith('/admin/unblock-requests')||path.startsWith('/account-unblock/')||path.startsWith('/companies')||path.startsWith('/company-email/')||path.startsWith('/own-email');
  if(resource==='/demo/messages')return path.startsWith('/account-unblock/')||path.startsWith('/admin/unblock-requests')||path.startsWith('/admin/accounts/')||path.startsWith('/company-email/')||path.startsWith('/companies')||path.startsWith('/own-email')||path.startsWith('/demo/')||path==='/setup';
  const company=resource.match(/^\/companies\/[^/]+/i)?.[0];
  return Boolean(company && (path===company || path.startsWith(company+'/')));
}
