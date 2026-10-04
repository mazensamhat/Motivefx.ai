import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Filter, MoonStar, Radar, RefreshCw, Search } from "lucide-react";
import { apiGet } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

type PortfolioAsset = { module:string; symbol:string; quantity:number|null; avgCost:number|null; motiveSignal:number|null; evidenceConfidence:number|null; stance:string|null; signalChange:number|null; lastSignalAt:string|null; evidence:string[] };
type PortfolioData = { generatedAt:string; totalTracked:number; holdingsCount:number; openBetCount:number; openPredictionCount:number; watchlistCount:number; moduleMix:Array<{module:string;count:number;sharePct:number}>; assets:PortfolioAsset[]; commonDrivers:Array<{driver:string;count:number}>; attention:PortfolioAsset[]; dataNote:string };
type DiscoverItem = {symbol:string;market:string;motiveSignal:number|null;evidenceConfidence:number|null;stance:string|null;delta:number|null;recordedAt:string;evidenceCount:number;relevant:boolean;evidence:string[]};
type DiscoverData={generatedAt:string;items:DiscoverItem[]};
type CloseRow={symbol:string;market:string;currentSignal:number|null;startSignal:number|null;delta:number|null;evidenceConfidence:number|null;stance:string|null;relevant:boolean;latestAt:string;evidence:string[]};
type CloseData={generatedAt:string;mode:"MARKET_CLOSE"|"SESSION_RECAP";strengthened:CloseRow[];weakened:CloseRow[];carry:CloseRow[];summary:string;disclaimer:string};
type SinceData={since:string;generatedAt:string;changes:Array<{symbol:string;market:string;currentSignal:number|null;delta:number|null;stance:string|null;recordedAt:string}>;alerts:Array<{id:string;module:string|null;symbol:string|null;title:string;body:string|null;confidence:number|null;createdAt:string}>;summary:string};

function ask(prompt:string){window.dispatchEvent(new CustomEvent("motivefx:ask-open",{detail:{prompt}}));}
function marketLabel(module:string){ return module==="trades"||module==="stocks"?"Stocks":module==="penny"?"Pink Sheets":module==="crypto"?"Crypto":module==="betting"||module==="sports"?"Sports":module==="predictions"?"Predictions":module; }

export function SinceYouWereAway(){
  const {isAuthenticated}=useAuth();
  const [data,setData]=useState<SinceData|null>(null);
  useEffect(()=>{
    if(!isAuthenticated)return;
    let previous:string;
    try{previous=localStorage.getItem("motivefx_last_home_seen_v2")||new Date(Date.now()-86400000).toISOString();}catch{previous=new Date(Date.now()-86400000).toISOString();}
    let cancelled=false;
    apiGet<SinceData>("/intel/since-away?since="+encodeURIComponent(previous)).then((result)=>{if(!cancelled)setData(result);}).catch(()=>{});
    try{localStorage.setItem("motivefx_last_home_seen_v2",new Date().toISOString());}catch{}
    return()=>{cancelled=true};
  },[isAuthenticated]);
  if(!data||(data.changes.length===0&&data.alerts.length===0))return null;
  return <section className="v2-section v2-returning" id="v2-since-away">
    <header className="v2-section-head"><div><span className="v2-eyebrow">SINCE YOU WERE AWAY</span><h2>What changed</h2></div><button type="button" onClick={()=>ask("Summarize what changed since my last visit and focus on anything relevant to my holdings.")}>Ask Motive <ArrowRight size={14}/></button></header>
    <p className="v2-completion-note">{data.summary}</p>
    <div className="v2-change-grid">{data.changes.slice(0,6).map((row)=><article key={row.symbol+row.market} className="v2-mini-card"><div><strong>{row.symbol}</strong><span>{marketLabel(row.market)}</span></div><p>Motive Signal <b>{row.currentSignal==null?"—":Math.round(row.currentSignal)}</b>{row.delta!=null?" · "+(row.delta>=0?"+":"")+row.delta+" pts":""}</p><small>{row.stance?"Model view: "+row.stance.replace(/_/g," "):"Recorded signal update"}</small></article>)}</div>
  </section>;
}

export function PortfolioIntelligence(){
  const [data,setData]=useState<PortfolioData|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setLoading(true);setError(null);try{setData(await apiGet<PortfolioData>("/intel/portfolio-intelligence"));}catch(e){setError(e instanceof Error?e.message:"Portfolio Intelligence unavailable.");}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener("motivefx:portfolio-changed",refresh);return()=>window.removeEventListener("motivefx:portfolio-changed",refresh);},[load]);
  return <section className="v2-section v2-completion-section" id="v2-portfolio-intelligence">
    <header className="v2-section-head"><div><span className="v2-eyebrow">WHOLE BOOK</span><h2><BriefcaseBusiness size={18}/> Portfolio Intelligence</h2></div><div className="v2-head-actions"><button type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/> Refresh</button><button type="button" onClick={()=>ask("Review my entire portfolio across every market. Show concentration, common drivers, changing signals, and the biggest risks without treating Motive Signal as a probability.")}>Ask Motive</button></div></header>
    {error?<p className="v2-warmup" role="alert">{error}</p>:!data?<p className="loading">Building whole-book intelligence…</p>:<>
      <div className="v2-trust-kpis"><div><span>Total tracked</span><strong>{data.totalTracked}</strong></div><div><span>Asset holdings</span><strong>{data.holdingsCount}</strong></div><div><span>Sports tracked</span><strong>{data.openBetCount}</strong></div><div><span>Predictions tracked</span><strong>{data.openPredictionCount}</strong></div></div>
      <p className="v2-completion-note">{data.dataNote}</p>
      <div className="v2-portfolio-layout"><div><h3>Market concentration</h3><div className="v2-mix-list">{data.moduleMix.map((row)=><div key={row.module}><span>{marketLabel(row.module)}</span><b>{row.count}</b><em>{row.sharePct}%</em></div>)}</div></div><div><h3>Common drivers</h3><div className="v2-chip-cloud">{data.commonDrivers.length?data.commonDrivers.map((row)=><span key={row.driver}>{row.driver} · {row.count}</span>):<span>No repeated DNA driver recorded yet</span>}</div></div></div>
      <h3 className="v2-subhead">Needs attention</h3>
      <div className="v2-change-grid">{data.attention.length?data.attention.map((row)=><button type="button" key={row.module+row.symbol} className="v2-mini-card is-button" onClick={()=>ask("Review my "+marketLabel(row.module)+" holding "+row.symbol+". Explain its Motive Signal, evidence confidence, recent change, risks, and source evidence.")}><div><strong>{row.symbol}</strong><span>{marketLabel(row.module)}</span></div><p>Motive Signal <b>{row.motiveSignal==null?"—":Math.round(row.motiveSignal)}</b>{row.signalChange!=null?" · "+(row.signalChange>=0?"+":"")+row.signalChange+" pts":""}</p><small>{row.evidenceConfidence!=null?"Evidence confidence "+Math.round(row.evidenceConfidence)+"/100":"Evidence confidence unavailable"}</small></button>):<p className="v2-empty-card">Add holdings to build whole-book intelligence.</p>}</div>
    </>}
  </section>;
}

export function MotiveDiscover(){
  const [data,setData]=useState<DiscoverData|null>(null),[market,setMarket]=useState("all"),[query,setQuery]=useState(""),[minSignal,setMinSignal]=useState(55),[mine,setMine]=useState(false),[movement,setMovement]=useState("all");
  useEffect(()=>{apiGet<DiscoverData>("/intel/discover").then(setData).catch(()=>setData({generatedAt:new Date().toISOString(),items:[]}));},[]);
  const rows=useMemo(()=>{const q=query.trim().toLowerCase();return(data?.items??[]).filter((row)=>(market==="all"||row.market===market)&&(row.motiveSignal??0)>=minSignal&&(!mine||row.relevant)&&(!q||row.symbol.toLowerCase().includes(q))&&(movement==="all"||(movement==="rising"&&(row.delta??0)>0)||(movement==="falling"&&(row.delta??0)<0))).slice(0,50)},[data,market,query,minSignal,mine,movement]);
  return <section className="v2-section v2-completion-section" id="v2-discover">
    <header className="v2-section-head"><div><span className="v2-eyebrow">DISCOVER</span><h2><Radar size={18}/> Cross-Market Scanner</h2></div><span className="v2-section-sub">One scanner · every market</span></header>
    <div className="v2-scanner-controls">
      <label><Search size={14}/><input aria-label="Search scanner" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Symbol or market…"/></label>
      <select aria-label="Market" value={market} onChange={(e)=>setMarket(e.target.value)}><option value="all">All markets</option><option value="stocks">Stocks</option><option value="penny">Pink Sheets</option><option value="crypto">Crypto</option><option value="sports">Sports</option><option value="predictions">Predictions</option></select>
      <select aria-label="Signal movement" value={movement} onChange={(e)=>setMovement(e.target.value)}><option value="all">Any movement</option><option value="rising">Signal rising</option><option value="falling">Signal falling</option></select>
      <label className="v2-range"><Filter size={14}/><span>Min signal {minSignal}</span><input aria-label="Minimum Motive Signal" type="range" min="0" max="95" step="5" value={minSignal} onChange={(e)=>setMinSignal(Number(e.target.value))}/></label>
      <label className="v2-check"><input type="checkbox" checked={mine} onChange={(e)=>setMine(e.target.checked)}/> My stuff only</label>
    </div>
    <div className="v2-scanner-list">{rows.length?rows.map((row)=><button type="button" key={row.market+row.symbol} onClick={()=>ask("Explain the scanner result for "+row.symbol+" in "+marketLabel(row.market)+". Motive Signal "+row.motiveSignal+"/100, evidence confidence "+(row.evidenceConfidence??"unavailable")+", recent change "+(row.delta??"unavailable")+". Cite what evidence is actually available and do not convert the signal into a probability.")}><span className="v2-scanner-symbol">{row.symbol}<small>{marketLabel(row.market)}{row.relevant?" · MY STUFF":""}</small></span><span>Motive Signal <strong>{Math.round(row.motiveSignal??0)}</strong></span><span>Evidence <strong>{row.evidenceConfidence==null?"—":Math.round(row.evidenceConfidence)}</strong></span><span className={(row.delta??0)>0?"is-up":(row.delta??0)<0?"is-down":""}>{row.delta==null?"—":(row.delta>=0?"+":"")+row.delta}</span></button>):<div className="v2-empty-card">No recorded signals match these filters.</div>}</div>
  </section>;
}

export function MarketClose(){
  const [data,setData]=useState<CloseData|null>(null);
  useEffect(()=>{apiGet<CloseData>("/intel/market-close").then(setData).catch(()=>setData(null));},[]);
  if(!data)return <section className="v2-section v2-completion-section" id="v2-market-close"><span className="v2-eyebrow">MARKET CLOSE</span><p className="loading">Building session recap…</p></section>;
  const renderRow=(row:CloseRow)=><button type="button" key={row.market+row.symbol} className="v2-close-row" onClick={()=>ask("Explain what changed for "+row.symbol+" during this session and what evidence carries forward. Keep Motive Signal separate from probability.")}><span><strong>{row.symbol}</strong><small>{marketLabel(row.market)}{row.relevant?" · MY STUFF":""}</small></span><span>Motive Signal <b>{row.currentSignal==null?"—":Math.round(row.currentSignal)}</b></span><span className={(row.delta??0)>0?"is-up":"is-down"}>{row.delta==null?"—":(row.delta>=0?"+":"")+row.delta+" pts"}</span></button>;
  return <section className="v2-section v2-completion-section" id="v2-market-close">
    <header className="v2-section-head"><div><span className="v2-eyebrow">{data.mode==="MARKET_CLOSE"?"MARKET CLOSE":"SESSION RECAP"}</span><h2><MoonStar size={18}/> What actually changed</h2></div><button type="button" onClick={()=>ask("Give me the Market Close: what strengthened, what weakened, what matters to my portfolio, and what carries into the next session.")}>Ask Motive</button></header>
    <p className="v2-completion-note">{data.summary} {data.disclaimer}</p>
    <div className="v2-close-cols"><div><h3>Strengthened</h3>{data.strengthened.length?data.strengthened.slice(0,5).map(renderRow):<p>No material strengthening recorded.</p>}</div><div><h3>Weakened</h3>{data.weakened.length?data.weakened.slice(0,5).map(renderRow):<p>No material weakening recorded.</p>}</div></div>
    {data.carry.length>0&&<><h3 className="v2-subhead">Carry into next session</h3><div className="v2-chip-cloud">{data.carry.slice(0,8).map((row)=><button type="button" key={row.market+row.symbol} onClick={()=>ask("What should I monitor next for "+row.symbol+"? Explain evidence, invalidators, and risk; no trade instruction.")}>{row.symbol} · {row.currentSignal==null?"—":Math.round(row.currentSignal)}</button>)}</div></>}
  </section>;
}
