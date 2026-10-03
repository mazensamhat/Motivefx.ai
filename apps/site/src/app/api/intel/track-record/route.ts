import { prisma } from "@motivefx/database";
import { json } from "@/lib/api";
import { requireFeature } from "@/lib/terminal/access";
import { accessErrorResponse, requireTerminalSession } from "@/lib/terminal/auth";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { OUTCOME_EVALUATOR_VERSION } from "@/lib/ops/outcome-policy";

export const dynamic = "force-dynamic";

function evidenceSummary(raw:string){
  try {
    const rows=JSON.parse(raw) as Array<{value?:{label?:unknown;score?:unknown};provider?:unknown;sourceType?:unknown}>;
    return Array.isArray(rows)?rows.slice(0,4).map((r)=>({
      label:String(r.value?.label??"Evidence"),score:Number.isFinite(Number(r.value?.score))?Number(r.value?.score):null,
      provider:String(r.provider??"unknown"),sourceType:String(r.sourceType??"unknown"),
    })):[];
  } catch{return [];}
}

export async function GET() {
  const auth=await requireTerminalSession(); if(!auth.ok)return auth.response;
  try{
    const plan=await entitlementsPlanForUser(auth.session.user); requireFeature(plan,"advanced_analytics");
    const [snapshotCount,pendingOutcomes,inconclusive,scored,latest]=await Promise.all([
      prisma.signalSnapshot.count(),
      prisma.signalOutcome.count({where:{outcome:"PENDING"}}),
      prisma.signalOutcome.count({where:{outcome:"INCONCLUSIVE"}}),
      prisma.signalOutcome.findMany({where:{evaluatorVersion:OUTCOME_EVALUATOR_VERSION,outcome:{in:["CONFIRMED","PARTIAL","REJECTED"]}},
        select:{snapshotId:true,symbol:true,outcome:true,realizedReturnPct:true,entryPrice:true,outcomePrice:true,predictedConf:true,notes:true,evaluatedAt:true},take:5000,orderBy:{evaluatedAt:"desc"}}),
      prisma.signalSnapshot.findMany({orderBy:{recordedAt:"desc"},take:220,
        select:{id:true,symbol:true,motiveSignal:true,confidence:true,stance:true,engineVersion:true,evidenceJson:true,recordedAt:true,outcomes:{orderBy:{createdAt:"desc"},take:1,
          select:{outcome:true,realizedReturnPct:true,entryPrice:true,outcomePrice:true,evaluatedAt:true,notes:true,evaluatorVersion:true}}}}),
    ]);
    const scoreBySnapshot=new Map(scored.map(o=>[o.snapshotId,o]));
    const distinctSymbols=new Set(scored.map(o=>o.symbol.toUpperCase())).size;
    const weighted=scored.reduce((sum,o)=>sum+(o.outcome==="CONFIRMED"?1:o.outcome === "PARTIAL" ? 0.5 : 0),0);
    const observedAlignment=scored.length?Math.round(weighted/scored.length*1000)/10:null;
    const bySymbol=new Map<string,typeof latest>();
    for(const row of latest){const key=row.symbol.toUpperCase();const arr=bySymbol.get(key)??[];if(arr.length<8)arr.push(row);bySymbol.set(key,arr);}
    const replay=[...bySymbol.entries()].slice(0,20).map(([symbol,rows])=>({
      symbol,currentSignal:rows[0]?.motiveSignal??null,previousSignal:rows[1]?.motiveSignal??null,
      delta:rows[0]?.motiveSignal!=null&&rows[1]?.motiveSignal!=null?Math.round((rows[0].motiveSignal!-rows[1].motiveSignal!)*10)/10:null,
      confidence:rows[0]?.confidence??null,stance:rows[0]?.stance??null,engineVersion:rows[0]?.engineVersion??null,
      recordedAt:rows[0]?.recordedAt.toISOString()??null,
      history:rows.map(row=>{const outcome=row.outcomes[0]??scoreBySnapshot.get(row.id);return{
        motiveSignal:row.motiveSignal,confidence:row.confidence,stance:row.stance,recordedAt:row.recordedAt.toISOString(),
        evidence:evidenceSummary(row.evidenceJson),
        outcome:outcome?{status:outcome.outcome,realizedReturnPct:outcome.realizedReturnPct??null,entryPrice:outcome.entryPrice??null,outcomePrice:outcome.outcomePrice??null,
          evaluatedAt:outcome.evaluatedAt?.toISOString?.()??null,notes:outcome.notes??null}:null,
      };}),
    }));
    const minimumResolvedForScore=30,minimumDistinctSymbols=3;
    const ready=scored.length>=minimumResolvedForScore&&distinctSymbols>=minimumDistinctSymbols;
    return json({
      generatedAt:new Date().toISOString(),snapshotCount,pendingOutcomes,inconclusiveOutcomes:inconclusive,resolvedOutcomes:scored.length,
      minimumResolvedForScore,minimumDistinctSymbols,distinctResolvedSymbols:distinctSymbols,observedAlignment,
      readiness:ready?"READY":"COLLECTING_OUTCOMES",score:ready?observedAlignment:null,
      note:scored.length===0?"Track Record is collecting price-grounded outcomes; no performance score is shown yet."
        :ready?`Observed alignment is ${observedAlignment}% across ${scored.length} V4 observations and ${distinctSymbols} symbols. This is historical sample alignment, not a forecast probability.`
        :`Outcome engine is live with ${scored.length} scored observation(s) across ${distinctSymbols} symbol(s). More sample diversity is required before a Track Record score is shown.`,
      replay,
    });
  }catch(error){return accessErrorResponse(error);}
}
