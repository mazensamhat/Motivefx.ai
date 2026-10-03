import { useEffect, useState } from "react";
import { Briefcase, RefreshCw, Sparkles } from "lucide-react";
import { apiGet } from "../lib/api";

type Holding={module:string;symbol:string;shares?:number;amount?:number;avg_cost?:number;motiveSignal:number|null;evidenceConfidence:number|null;stance:string|null;delta:number|null;signalBand:string};
type Data={generatedAt:string;counts:{assets:number;trades:number;crypto:number;penny:number;bets:number;predictions:number;watchlist:number};posture:{strong:number;weak:number;changing:number;unknown:number};holdings:Holding[];openBets:Array<{id:string;matchup:string;pick:string;sport:string}>;openPredictions:Array<{id:string;market:string;pick:string;category:string}>;note:string};

export function MotivePortfolioIntelligence(){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(true);
 async function load(){setLoading(true);setError(null);try{const result=await apiGet<Data>("/intel/portfolio-intelligence");if(!result?.counts||!result?.posture||!Array.isArray(result.holdings))throw new Error("Portfolio Intelligence data is temporarily unavailable.");setData(result);}catch(e){setError(e instanceof Error?e.message:"Portfolio Intelligence unavailable.");}finally{setLoading(false);}}
 useEffect(()=>{void load();const on=()=>void load();window.addEventListener("motivefx:portfolio-changed",on);return()=>window.removeEventListener("motivefx:portfolio-changed",on);},[]);
 const ask=()=>window.dispatchEvent(new CustomEvent("motivefx:ask-open",{detail:{prompt:"Review my entire portfolio across every MotiveFX market. Highlight concentration, meaningful Motive Signal changes, cross-market risks, and what needs attention. Separate evidence strength from calibrated probability."}}));
 return <section className="v2-section v2-roadmap-section" id="v2-portfolio-intelligence">
  <header className="v2-section-head"><div><span className="v2-eyebrow">WHOLE BOOK</span><h2><Briefcase size={18}/> Portfolio Intelligence</h2></div><div className="v2-head-actions"><button type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/> Refresh</button><button type="button" onClick={ask}><Sparkles size={14}/> Ask Motive</button></div></header>
  {error?<p className="v2-warmup" role="alert">{error}</p>:!data?<p className="loading">Loading your whole book…</p>:<>
   <div className="v2-trust-kpis"><div><span>Asset holdings</span><strong>{data.counts.assets}</strong></div><div><span>Sports tracked</span><strong>{data.counts.bets}</strong></div><div><span>Predictions</span><strong>{data.counts.predictions}</strong></div><div><span>Large signal moves</span><strong>{data.posture.changing}</strong></div></div>
   <div className="v2-portfolio-posture"><span className="positive">{data.posture.strong} strong</span><span className="negative">{data.posture.weak} weak</span><span>{data.counts.watchlist} watched</span><span>{data.posture.unknown} awaiting signal evidence</span></div>
   {data.holdings.length?<div className="v2-intel-table">{data.holdings.map(h=><article key={h.module+":"+h.symbol} className="v2-intel-row"><div><strong>{h.symbol}</strong><span>{h.module}</span></div><div><span>Motive Signal</span><b>{h.motiveSignal==null?"—":Math.round(h.motiveSignal)+"/100"}</b></div><div><span>Change</span><b>{h.delta==null?"—":(h.delta>=0?"+":"")+h.delta}</b></div><div><span>Model view</span><b>{h.stance??"Unavailable"}</b></div></article>)}</div>:<p className="v2-trust-note">No asset holdings are recorded in the current account. Sports and prediction tracking remain separate and are counted above.</p>}
   <p className="v2-trust-note">{data.note}</p>
  </>}
 </section>;
}
