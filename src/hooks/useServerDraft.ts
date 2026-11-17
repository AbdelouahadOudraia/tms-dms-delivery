import {useEffect,useRef,useState} from 'react';

// Adopt server updates only while the field still matches its previous baseline.
export function useServerDraft<T>(serverValue:T) {
  const [draft,setDraft]=useState(serverValue),previous=useRef(serverValue);
  useEffect(()=>{const baseline=previous.current;previous.current=serverValue;setDraft(value=>JSON.stringify(value)===JSON.stringify(baseline)?serverValue:value);},[serverValue]);
  return [draft,setDraft] as const;
}
