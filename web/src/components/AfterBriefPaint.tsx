import {useEffect,useState,type ReactNode} from "react";
/** Give the saved counts and brief a paint before secondary panels start their requests. */
export function AfterBriefPaint({children}:{children:ReactNode}){
  const [ready,setReady]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setReady(true),250);return()=>clearTimeout(timer);},[]);
  return ready?children:<div aria-busy="true" style={{minHeight:160}}>Loading workspace intelligence…</div>;
}
