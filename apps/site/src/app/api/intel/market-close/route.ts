import { prisma } from "@motivefx/database";
import { json } from "@/lib/api";
import { requireFeature } from "@/lib/terminal/access";
import { accessErrorResponse, requireTerminalSession } from "@/lib/terminal/auth";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { loadPortfolio } from "@/lib/terminal/portfolio";

export const dynamic="force-dynamic";

function marketOf(evidenceJson:string){
  try{
    const rows=JSON.parse(evidenceJson) as Array<{id?:string;market?:string}>;
    for(const row of rows){
      const id=String(row?.id??"").toLowerCase();
      if(id.startsWith("opp-crypto-")) return "crypto";
      if(id.startsWith("opp-betting-")) return "betting";
      if(id.startsWith("opp-pred-")) return "predictions";
      if(id.startsWith("opp-penny-")) return "penny";
    }
  }catch{}
  return "trades";
}
export async function GET(){
  const auth=await requireTerminalSession();if(!auth.ok)return auth.response;
  try{
    const plan=await entitlementsPlanForUser(auth.session.user);requireFeature(plan,"ai_brief");
    const since=new Date(Date.now()-48*60*60*1000);
    const rows=await prisma.signalSnapshot.findMany({
      where:{recordedAt:{gte:since}},orderBy:{recordedAt:"desc"},take:1200,
      select:{symbol:true,motiveSignal:true,confidence:true,stance:true,recordedAt:true,evidenceJson:true},
    });
    const bySymbol=new Map<string,typeof rows>();
    for(const row of rows){const list=bySymbol.get(row.symbol)??[];if(list.length<3)list.push(row);bySymbol.set(row.symbol,list);}
    const changes=[...bySymbol.entries()].flatMap(([symbol,list])=>{
      const current=list[0],previous=list[1];if(!current||!previous||current.motiveSignal==null||previous.motiveSignal==null)return [];
      const delta=Math.round((current.motiveSignal-previous.motiveSignal)*10)/10;
      return [{symbol,module:marketOf(current.evidenceJson),current:current.motiveSignal,previous:previous.motiveSignal,delta,
        confidence:current.confidence,stance:current.stance,recordedAt:current.recordedAt.toISOString()}];
    });
    const allowed=new Set(plan.allowedMarkets);
    const normalized=changes.filter((r)=>allowed.has(r.module)||r.module==="trades"&&allowed.has("trades"));
    const [trades,crypto,penny]=await Promise.all([
      loadPortfolio(auth.session.user.id,"trades"),loadPortfolio(auth.session.user.id,"crypto"),loadPortfolio(auth.session.user.id,"penny"),
    ]);
    const saved=new Set([...trades,...crypto,...penny].map((h)=>h.symbol.toUpperCase()));
    const sorted=[...normalized].sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
    return json({
      generatedAt:new Date().toISOString(),
      windowHours:48,
      newSnapshots:rows.length,
      strengthened:sorted.filter((r)=>r.delta>=5).slice(0,8),
      weakened:sorted.filter((r)=>r.delta<=-5).slice(0,8),
      steady:sorted.filter((r)=>Math.abs(r.delta)<5).slice(0,8),
      portfolioRelevant:sorted.filter((r)=>saved.has(r.symbol.toUpperCase())).slice(0,12),
      note:"Market Close compares recorded Motive Signal snapshots. It does not claim market performance or realized returns.",
    });
  }catch(error){return accessErrorResponse(error);}
}
