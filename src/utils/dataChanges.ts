type Listener=(path:string)=>void;
const listeners=new Set<Listener>();
let channel:BroadcastChannel|null=null,writes=0,lastInput=-Infinity,listening=false;
function connect() {
  if(typeof window==='undefined'||listening)return;
  listening=true;
  const edited=()=>{lastInput=Date.now();};
  window.addEventListener('input',edited,true);window.addEventListener('change',edited,true);
  if(typeof BroadcastChannel!=='undefined') {
    try {
      channel=new BroadcastChannel('tms-data-changes');
      channel.onmessage=event=>{const path=event.data?.path;if(typeof path==='string'&&path.startsWith('/')&&path.length<2048)for(const listener of listeners)listener(path);};
    } catch {channel=null;} // Polling remains available when browser messaging is disabled.
  }
}
export function subscribeDataChanges(listener:Listener){connect();listeners.add(listener);return()=>{listeners.delete(listener);};}
export function beginDataWrite(){connect();writes++;return()=>{writes=Math.max(0,writes-1);};}
export function announceDataChange(path:string){connect();for(const listener of listeners)listener(path);try{channel?.postMessage({path});}catch{/* A notification failure must not fail a committed operation. */}}
export function canRefreshData(){return typeof document!=='undefined' && document.visibilityState!=='hidden' && navigator.onLine!==false && writes===0 && Date.now()-lastInput>=1500;}
