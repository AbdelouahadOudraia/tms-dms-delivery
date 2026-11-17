import {useCallback,useEffect,useRef} from 'react';
import {createRefreshTask,watchesResource,type RefreshTask} from '../utils/autoRefresh';
import {canRefreshData,subscribeDataChanges} from '../utils/dataChanges';

export const mayApplyRefresh=(signal:AbortSignal)=>!signal.aborted&&canRefreshData();

export function useAutoRefresh(resource:string,read:(signal:AbortSignal)=>Promise<void>,options:{enabled?:boolean;interval?:number;onError?(error:unknown):void}={}) {
  const latest=useRef({read,onError:options.onError});latest.current={read,onError:options.onError};
  const task=useRef<RefreshTask|null>(null);
  const refresh=useCallback(()=>task.current?.request(true),[]);
  useEffect(()=>{
    if(options.enabled===false)return;
    const current=createRefreshTask(signal=>latest.current.read(signal),{available:canRefreshData,interval:options.interval,onError:error=>latest.current.onError?.(error)});
    task.current=current;
    const resume=()=>current.request(),changed=(path:string)=>{if(watchesResource(resource,path))current.request(true);};
    const unsubscribe=subscribeDataChanges(changed);
    for(const event of ['focus','online','hashchange'])window.addEventListener(event,resume);
    document.addEventListener('visibilitychange',resume);
    current.request();
    return()=>{task.current=null;current.dispose();unsubscribe();for(const event of ['focus','online','hashchange'])window.removeEventListener(event,resume);document.removeEventListener('visibilitychange',resume);};
  },[resource,options.enabled,options.interval]);
  return refresh;
}
