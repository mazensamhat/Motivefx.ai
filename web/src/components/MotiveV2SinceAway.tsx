import { useEffect, useState } from "react";
import { History } from "lucide-react";
import type { HomeBriefing } from "../types";
const KEY="motivefx_last_brief_seen_v2";
export function SinceYouWereAway({briefing}:{briefing:HomeBriefing}){
 const [previous,setPrevious]=useState<string|null>(null);
 useEffect(()=>{setPrevious(localStorage.getItem(KEY));localStorage.setItem(KEY,briefing.generatedAt);},[briefing.generatedAt]);
 const newSignals=briefing.moduleSummaries.reduce((n,m)=>n+(m.newSignals??0),0);
 if(!previous&&!newSignals&&!briefing.breakingNewsCount)return null;
 return <section className="v2-since-away" id="v2-since-away"><History size={18}/><div><span className="v2-eyebrow">SINCE YOU WERE AWAY</span><strong>{newSignals} new signal{newSignals===1?"":"s"} · {briefing.breakingNewsCount} key event{briefing.breakingNewsCount===1?"":"s"}</strong><p>{previous?`Last brief seen ${new Date(previous).toLocaleString()}`:"Your first V2 change summary is ready."} Top current item: {briefing.biggestOpportunity||"Scanning…"}</p></div></section>;
}
