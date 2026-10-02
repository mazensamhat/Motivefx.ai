import { after } from "next/server";
import { json } from "@/lib/api";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { getSession } from "@/lib/session";
import { findUserSafeCached } from "@/lib/load-user";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import type { TerminalPlan } from "@/lib/terminal/plan";
import { upsertAlerts } from "@/lib/terminal/alerts";
import { evaluateSignalAlertRules } from "@/lib/terminal/engines";
import { formatBriefingGreeting, formatBriefingKicker, getBriefingPeriod } from "../../../../../../../packages/shared/src/briefing-period";
import type { ConsensusBreak, MarketGenome, ProbabilityView, SignalAlertRule } from "@/lib/terminal/engines";
import { getIntelPrefs } from "@/lib/terminal/intel-prefs";
export const dynamic = "force-dynamic";
// The visible response stays bounded; after-response DB work must be allowed to finish.
export const maxDuration = 60;
function fallbackBriefing(displayName: string | null) {
  const name = (displayName ?? "Trader").split(/\s+/)[0];
  const now = new Date(), period = getBriefingPeriod(now);
  return {
    greeting: formatBriefingGreeting(period, name), greetingName: name,
    briefingPeriod: period, briefingKicker: formatBriefingKicker(period),
    tagline: "Daily Brief · Opportunity Radar", motivfxScore: 62, stars: 3,
    marketConfidence: "MODERATE", opportunityCount: 0, highRiskAlerts: 0, portfolioDelta: null,
    biggestRisk: "Feeds warming up", biggestOpportunity: "Scanning…",
    topAiTip: "Live desks are refreshing — pull to retry in a moment.",
    moduleSummaries: [
      {module:"trades",label:"Trades",count:0,tab:"stocks",newSignals:0},
      {module:"penny",label:"Pink Slips",count:0,tab:"penny",newSignals:0},
      {module:"crypto",label:"Crypto",count:0,tab:"crypto",newSignals:0},
      {module:"betting",label:"Betting",count:0,tab:"betting",newSignals:0},
      {module:"predictions",label:"Predictions",count:0,tab:"predictions",newSignals:0},
    ], opportunities: [],
    personalized: {holdingsCount:0,watchlistCount:0,radarSignalCount:0,coverageLine:null,intelNote:"Signal review still warming up — open a desk or retry shortly.",simRecord:null,radarHits:[]},
    compareLens:[],moduleStories:{},audioBriefingScript:"",sentiment:{reddit:"neutral",x:"neutral",news:"neutral"},
    breakingNewsCount:0,generatedAt:now.toISOString(),scenarioDisclaimer:"Scenarios marked * are educational context — not forecasts.",alertUnreadCount:0,degraded:true,
  };
}
async function withTimeout<T>(promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise,new Promise<T>((resolve)=>{timer=setTimeout(()=>resolve(fallback),ms);})]); }
  catch { return fallback; }
  finally { if(timer)clearTimeout(timer); }
}
export async function GET(_request: Request) {
  let displayName: string | null = null;
  let effectiveId = "demo";
  let plan: TerminalPlan | null = null;
  let userIdForAlerts: string | null = null;
  try {
    const cookie = await getSession();
    if (cookie) {
      displayName = cookie.email?.split("@")[0] ?? null;
      const user = await findUserSafeCached({id:cookie.id},{timeoutMs:1500});
      if (user && !user.disabledAt) {
        displayName = user.displayName ?? user.email?.split("@")[0] ?? displayName;
        plan = await entitlementsPlanForUser(user); effectiveId = user.id; userIdForAlerts = user.id;
      }
    }
  } catch { /* Continue with explicitly degraded public context, not someone else's ledger. */ }
  const work = buildHomeBriefing({displayName,userId:effectiveId,plan});
  // A Promise.race is not cancellation. Keep the invocation alive for work already started.
  after(async()=>{try{await work;}catch{ /* The response carries the degraded state. */ }});
  const briefing = await withTimeout(work,fallbackBriefing(displayName),8000);
  if (userIdForAlerts && plan?.features.push_notifications) {
    const alertUserId = userIdForAlerts;
    after(async()=>{
      try {
        const radar = ((briefing.personalized as {radarHits?:Array<Record<string,unknown>>})?.radarHits) ?? [];
        const alerts = radar.map((h)=>({module:String(h.module??""),symbol:String(h.symbol??""),title:`Radar hit: ${h.symbol}`,body:String(h.title??""),confidence:Number(h.confidence??0),alertKey:`radar-${h.id??h.symbol}`}));
        for(const o of ((briefing.opportunities as Array<Record<string,unknown>>)??[]).slice(0,3)) {
          alerts.push({module:String(o.module??""),symbol:String(o.symbol??""),title:`Top signal: ${o.symbol}`,body:String(o.title??""),confidence:Number(o.confidence??0),alertKey:`signal-${o.id}`});
        }
        const prefs = await getIntelPrefs(alertUserId);
        const predictive = evaluateSignalAlertRules(prefs.alertRules as SignalAlertRule[],{
          probabilityViews:(briefing.probabilityViews as ProbabilityView[])??[],consensusBreaks:(briefing.consensusBreaks as ConsensusBreak[])??[],marketGenomes:(briefing.marketGenomes as MarketGenome[])??[],
        });
        for(const a of predictive) alerts.push({module:String(a.module??""),symbol:String(a.symbol??""),title:a.title,body:a.body??"",confidence:Number(a.confidence??0),alertKey:a.alertKey});
        if(alerts.length)await upsertAlerts(alertUserId,alerts);
      } catch { console.warn("[home/briefing] deferred alert persistence unavailable"); }
    });
  }
  return json(briefing);
}
