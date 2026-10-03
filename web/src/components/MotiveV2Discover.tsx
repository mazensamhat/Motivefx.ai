import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import type { HomeBriefing, HomeOpportunity } from "../types";
export function MotiveDiscover({briefing,onReview}:{briefing:HomeBriefing;onReview:(o:HomeOpportunity)=>void}){
 const [market,setMarket]=useState("all"),[min,setMin]=useState(0),[risk,setRisk]=useState("all"),[query,setQuery]=useState("");
 const saved=new Set((briefing.personalized?.radarHits??[]).map(h=>h.symbol.toUpperCase()));
 const rows=useMemo(()=>briefing.opportunities.filter(o=>{
   if(market!=="all"&&o.module!==market)return false;if(o.confidence<min)return false;if(risk!=="all"&&o.riskLevel!==risk)return false;
   if(query&&!((o.symbol+" "+o.title).toLowerCase().includes(query.toLowerCase())))return false;return true;
 }).sort((a,b)=>b.confidence-a.confidence),[briefing.opportunities,market,min,risk,query]);
 return <section className="v2-section v2-roadmap-section" id="v2-discover">
  <header className="v2-section-head"><div><span className="v2-eyebrow">DISCOVER</span><h2><SlidersHorizontal size={18}/> Cross-market Scanner</h2></div><span>{rows.length} matches</span></header>
  <div className="v2-scanner-controls"><label><Search size={14}/><input aria-label="Search scanner" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Symbol, event or theme"/></label><select aria-label="Scanner market" value={market} onChange={e=>setMarket(e.target.value)}><option value="all">All markets</option><option value="trades">Stocks</option><option value="penny">Pink Sheets</option><option value="crypto">Crypto</option><option value="betting">Sports</option><option value="predictions">Predictions</option></select><select aria-label="Minimum Motive Signal" value={min} onChange={e=>setMin(Number(e.target.value))}><option value="0">Any signal</option><option value="60">60+</option><option value="70">70+</option><option value="80">80+</option></select><select aria-label="Risk filter" value={risk} onChange={e=>setRisk(e.target.value)}><option value="all">Any risk</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="extreme">Extreme</option></select></div>
  <div className="v2-scanner-grid">{rows.slice(0,24).map(o=><button type="button" key={o.id} className="v2-scanner-card" onClick={()=>onReview(o)}><div><strong>{o.symbol}</strong><span>{o.module}{saved.has(o.symbol.toUpperCase())?" · your radar":""}</span></div><b>{Math.round(o.confidence)}/100</b><p>{o.title}</p><small>{o.riskLevel} risk{o.deltaVsPrior!=null?` · Δ ${o.deltaVsPrior>=0?"+":""}${o.deltaVsPrior}`:""}</small></button>)}</div>
  {!rows.length&&<p className="v2-trust-note">No current briefing items match these filters. Widen the scanner rather than assuming the market is empty.</p>}
 </section>;
}
