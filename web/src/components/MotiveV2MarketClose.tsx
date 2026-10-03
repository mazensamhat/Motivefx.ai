import { useEffect, useState } from "react";
import { Clock3, RefreshCw, Sparkles } from "lucide-react";
import { apiGet } from "../lib/api";
type Change={symbol:string;module:string;current:number;previous:number;delta:number;confidence:number|null;stance:string|null;recordedAt:string};
type Data={generatedAt:string;windowHours:number;newSnapshots:number;strengthened:Change[];weakened:Change[];steady:Change[];portfolioRelevant:Change[];note:string};
function list(title:string,rows:Change[]){return <div className="v2-close-column"><h3>{title}</h3>{rows.length?rows.slice(0,5).map(r=><div className="v2-close-row" key={r.module+":"+r.symbol}><span><strong>{r.symbol}</strong><small>{r.module}</small></span><b>{r.current.toFixed(0)}/100</b><em>{r.delta>=0?"+":""}{r.delta}</em></div>):<p>No material recorded changes in this window.</p>}</div>}
export function MotiveMarketClose(){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(true);
 async function load(){setLoading(true);setError(null);try{setData(await apiGet<Data>("/intel/market-close"));}catch(e){setError(e instanceof Error?e.message:"Market Close unavailable.");}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 const ask=()=>window.dispatchEvent(new CustomEvent("motivefx:ask-open",{detail:{prompt:"Give me my Market Close: what strengthened, what weakened, what changed in my tracked book, and what carries into the next session. Do not treat Motive Signal as probability."}}));
 return <section className="v2-section v2-roadmap-section" id="v2-market-close">
  <header className="v2-section-head"><div><span className="v2-eyebrow">END OF DAY</span><h2><Clock3 size={18}/> Market Close</h2></div><div className="v2-head-actions"><button type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/> Refresh</button><button type="button" onClick={ask}><Sparkles size={14}/> Ask Motive</button></div></header>
  {error?<p className="v2-warmup">{error}</p>:!data?<p className="loading">Comparing recorded signal changes…</p>:<>
    <p className="v2-trust-note">{data.newSnapshots.toLocaleString()} recorded signal snapshots examined across the last {data.windowHours} hours.</p>
    <div className="v2-close-grid">{list("Strengthened",data.strengthened)}{list("Weakened",data.weakened)}</div>
    {data.portfolioRelevant.length>0&&<div className="v2-close-portfolio"><h3>Your book</h3>{data.portfolioRelevant.slice(0,8).map(r=><span key={r.symbol}>{r.symbol} {r.delta>=0?"+":""}{r.delta}</span>)}</div>}
    <p className="v2-trust-note">{data.note}</p>
  </>}
 </section>;
}
