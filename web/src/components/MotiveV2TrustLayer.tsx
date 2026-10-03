import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, History, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import type { HomeBriefing } from "../types";
import { apiGet, apiPut } from "../lib/api";

type ReplayPoint={motiveSignal:number|null;confidence:number|null;stance:string|null;recordedAt:string;evidence:string[]};
type ReplayItem={symbol:string;currentSignal:number|null;previousSignal:number|null;delta:number|null;confidence:number|null;stance:string|null;engineVersion:string|null;recordedAt:string|null;evidence:string[];history:ReplayPoint[]};
type Resolved={id:string;symbol:string;outcome:string;realizedReturnPct:number|null;entryPrice:number|null;outcomePrice:number|null;evaluatedAt:string|null;horizonDays:number;predictedScore:number|null;predictedConf:number|null;notes:string|null};
type TrackRecordData={generatedAt:string;snapshotCount:number;pendingOutcomes:number;inconclusiveOutcomes:number;resolvedOutcomes:number;minimumResolvedForScore:number;readiness:"READY"|"COLLECTING_OUTCOMES";observedReliability:number|null;outcomeBreakdown:{confirmed:number;partial:number;rejected:number};note:string;coverage:{supported:string[];pending:string[];note:string};resolved:Resolved[];replay:ReplayItem[]};

export function MotiveTrackRecord(){
 const [data,setData]=useState<TrackRecordData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[openSymbol,setOpenSymbol]=useState<string|null>(null);
 const load=useCallback(async()=>{setLoading(true);setError(null);try{setData(await apiGet<TrackRecordData>("/intel/track-record"));}catch(e){setError(e instanceof Error?e.message:"Track Record unavailable.");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 return <section className="v2-section v2-trust-section" id="v2-track-record">
  <header className="v2-section-head"><div><span className="v2-eyebrow">TRUST LAYER</span><h2><History size={18}/> Motive Track Record & Replay</h2></div><button type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/> Refresh</button></header>
  {error?<p className="v2-warmup" role="alert">{error}</p>:!data?<p className="loading">Loading recorded signal history…</p>:<>
   <div className="v2-trust-kpis"><div><span>Recorded snapshots</span><strong>{data.snapshotCount.toLocaleString()}</strong></div><div><span>Resolved outcomes</span><strong>{data.resolvedOutcomes.toLocaleString()}</strong></div><div><span>Pending outcomes</span><strong>{data.pendingOutcomes.toLocaleString()}</strong></div><div><span>Track Record</span><strong>{data.observedReliability==null?"Collecting":data.observedReliability+"%"}</strong></div></div>
   <p className="v2-trust-note">{data.note}</p>
   {data.coverage&&<div className="v2-track-coverage"><div><strong>Ground-truth coverage</strong><span>{data.coverage.supported.join(" · ")}</span></div><div><strong>Awaiting resolvable provider IDs</strong><span>{data.coverage.pending.join(" · ")}</span></div><p>{data.coverage.note}</p></div>}
   {(data.resolved??[]).length>0&&<div className="v2-resolved-list"><h3>Resolved observations</h3>{(data.resolved??[]).slice(0,8).map(row=><article key={row.id}><strong>{row.symbol}</strong><span>{row.outcome}</span><b>{row.realizedReturnPct==null?"—":(row.realizedReturnPct>=0?"+":"")+row.realizedReturnPct.toFixed(2)+"%"}</b><small>{row.horizonDays}d · evaluated {row.evaluatedAt?new Date(row.evaluatedAt).toLocaleDateString():"—"}</small></article>)}</div>}
   <div className="v2-replay-head"><RotateCcw size={16}/><div><strong>Signal Replay</strong><span>What Motive recorded at each snapshot, before the outcome was known.</span></div></div>
   <div className="v2-replay-grid">{data.replay.slice(0,12).map(row=><article key={row.symbol} className="v2-replay-card">
    <button type="button" className="v2-replay-card-hit" onClick={()=>setOpenSymbol(openSymbol===row.symbol?null:row.symbol)} aria-expanded={openSymbol===row.symbol}>
      <div className="v2-replay-top"><strong>{row.symbol}</strong><span>{row.recordedAt?new Date(row.recordedAt).toLocaleString():"—"}</span></div>
      <div className="v2-replay-signal"><span>Motive Signal</span><b>{row.currentSignal!=null?Math.round(row.currentSignal):"—"}</b><em>/100</em></div>
      <p>{row.delta==null?"No prior snapshot in this replay window.":`${row.delta>=0?"+":""}${row.delta} points vs prior recorded snapshot.`}</p>
      <small>{row.stance?`Model stance: ${row.stance}`:"Stance unavailable"}{row.confidence!=null?` · evidence confidence ${Math.round(row.confidence)}/100`:""}</small>
    </button>
    {openSymbol===row.symbol&&<div className="v2-replay-timeline">{row.history.map((point,i)=><div className="v2-replay-point" key={point.recordedAt+i}><time>{new Date(point.recordedAt).toLocaleString()}</time><b>{point.motiveSignal==null?"—":Math.round(point.motiveSignal)+"/100"}</b><span>{point.evidence.slice(0,3).join(" · ")||"Evidence labels unavailable"}</span></div>)}</div>}
   </article>)}</div>
  </>}
 </section>;
}

type Rule=NonNullable<HomeBriefing["alertRules"]>[number];
const MODULES=[["","All markets"],["trades","Stocks"],["penny","Pink Sheets"],["crypto","Crypto"],["betting","Sports"],["predictions","Predictions"]] as const;
export function MotiveWatchAgents({briefing,onPrefsChanged}:{briefing:HomeBriefing;onPrefsChanged?:()=>void}){
 const [busy,setBusy]=useState<string|null>(null),[kind,setKind]=useState<Rule["kind"]>("signal_above"),[symbol,setSymbol]=useState(""),[module,setModule]=useState(""),[threshold,setThreshold]=useState("75");
 const rules=briefing.alertRules??[],themes=briefing.themeWatchlist??[],enabled=rules.filter(r=>r.enabled).length;
 const custom=useMemo(()=>rules.filter(r=>String(r.id).startsWith("agent-")),[rules]);
 async function save(next:Rule[]){await apiPut("/intel/prefs",{prefs:{themeWatchlist:themes,alertRules:next}});window.dispatchEvent(new Event("motivefx:alerts-refresh"));onPrefsChanged?.();}
 async function toggle(id:string){setBusy(id);try{await save(rules.map(r=>r.id===id?{...r,enabled:!r.enabled}:r));}finally{setBusy(null);}}
 async function remove(id:string){setBusy(id);try{await save(rules.filter(r=>r.id!==id));}finally{setBusy(null);}}
 async function add(){const value=Number(threshold);if(!Number.isFinite(value)||value<0||value>100)return;const id=`agent-${Date.now()}`;const label=kind==="signal_above"?`Signal above ${value}`:kind==="signal_below"?`Signal below ${value}`:`Signal changes ≥ ${value}`;const next:Rule={id,kind,threshold:value,enabled:true,label,symbol:symbol.trim().toUpperCase()||undefined,module:module||undefined,cadence:"continuous",delivery:"intel"};setBusy(id);try{await save([...rules,next]);setSymbol("");}finally{setBusy(null);}}
 return <section className="v2-section v2-trust-section" id="v2-watch-agents">
  <header className="v2-section-head"><div><span className="v2-eyebrow">WATCH AGENTS</span><h2><BellRing size={18}/> Motive Watch</h2></div></header>
  <div className="v2-trust-kpis"><div><span>Active agents</span><strong>{enabled}</strong></div><div><span>Custom agents</span><strong>{custom.length}</strong></div><div><span>Watched themes</span><strong>{themes.length}</strong></div><div><span>Background checks</span><strong>15 min</strong></div></div>
  <p className="v2-trust-note">Create persistent monitor-only agents. They evaluate current signal evidence in the background and write to Intel Alerts. They never place orders, trades, or wagers.</p>
  <div className="v2-agent-builder"><select aria-label="Agent condition" value={kind} onChange={e=>setKind(e.target.value as Rule["kind"])}><option value="signal_above">Signal above</option><option value="signal_below">Signal below</option><option value="signal_change">Signal change</option></select><input aria-label="Agent symbol" placeholder="Symbol/event (optional)" value={symbol} onChange={e=>setSymbol(e.target.value)}/><select aria-label="Agent market" value={module} onChange={e=>setModule(e.target.value)}>{MODULES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><input aria-label="Agent threshold" type="number" min="0" max="100" value={threshold} onChange={e=>setThreshold(e.target.value)}/><button type="button" className="btn v2-primary" onClick={()=>void add()} disabled={Boolean(busy)}><Plus size={14}/> Create Watch Agent</button></div>
  <ul className="v2-agent-list">{rules.length?rules.map(rule=><li key={rule.id}><div><strong>{rule.label??rule.kind}</strong><span>{rule.symbol?`${rule.symbol} · `:""}{rule.module?`${rule.module} · `:""}threshold {rule.threshold} · {rule.enabled?"watching":"paused"}</span></div><div className="v2-agent-actions"><button type="button" className="btn btn-sm btn-ghost" disabled={busy===rule.id} onClick={()=>void toggle(rule.id)}>{rule.enabled?"Pause":"Start"}</button>{String(rule.id).startsWith("agent-")&&<button type="button" className="btn btn-sm btn-ghost" aria-label={`Delete ${rule.label??"agent"}`} disabled={busy===rule.id} onClick={()=>void remove(rule.id)}><Trash2 size={13}/></button>}</div></li>):<li><div><strong>No watch rules configured yet</strong><span>Create an agent above or add themes from Deep Intelligence.</span></div></li>}</ul>
 </section>;
}
