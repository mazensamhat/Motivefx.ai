import { prisma } from "@motivefx/database";
import { json } from "@/lib/api";
import { requireFeature } from "@/lib/terminal/access";
import { accessErrorResponse, requireTerminalSession } from "@/lib/terminal/auth";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { OUTCOME_EVALUATOR_VERSION } from "@/lib/ops/outcome-policy";

export const dynamic = "force-dynamic";

function evidenceLabels(raw:string):string[]{
  try{
    const rows=JSON.parse(raw) as Array<{value?:{label?:unknown};provider?:unknown;group?:unknown}>;
    if(!Array.isArray(rows))return [];
    return [...new Set(rows.flatMap(row=>{
      const label=typeof row?.value?.label==="string"?row.value.label:null;
      const provider=typeof row?.provider==="string"?row.provider:null;
      const group=typeof row?.group==="string"?row.group:null;
      return [label,provider,group].filter((v):v is string=>Boolean(v));
    }))].slice(0,6);
  }catch{return [];}
}

export async function GET(){
  const auth=await requireTerminalSession();
  if(!auth.ok)return auth.response;
  try{
    const plan=await entitlementsPlanForUser(auth.session.user);
    requireFeature(plan,"advanced_analytics");
    const minimumResolvedForScore=30;
    const [snapshotCount,pendingOutcomes,inconclusiveOutcomes,resolvedRows,latest]=await Promise.all([
      prisma.signalSnapshot.count(),
      prisma.signalOutcome.count({where:{outcome:"PENDING"}}),
      prisma.signalOutcome.count({where:{outcome:"INCONCLUSIVE"}}),
      prisma.signalOutcome.findMany({
        where:{evaluatorVersion:OUTCOME_EVALUATOR_VERSION,outcome:{in:["CONFIRMED","PARTIAL","REJECTED"]}},
        orderBy:{evaluatedAt:"desc"},take:250,
        select:{id:true,symbol:true,outcome:true,realizedReturnPct:true,entryPrice:true,outcomePrice:true,evaluatedAt:true,horizonDays:true,predictedScore:true,predictedConf:true,notes:true},
      }),
      prisma.signalSnapshot.findMany({
        orderBy:{recordedAt:"desc"},take:360,
        select:{id:true,symbol:true,motiveSignal:true,confidence:true,stance:true,engineVersion:true,recordedAt:true,evidenceJson:true},
      }),
    ]);
    const bySymbol=new Map<string,typeof latest>();
    for(const row of latest){
      const key=row.symbol.toUpperCase(),rows=bySymbol.get(key)??[];
      if(rows.length<6)rows.push(row);bySymbol.set(key,rows);
    }
    const replay=[...bySymbol.entries()].slice(0,18).map(([symbol,rows])=>{
      const current=rows[0],previous=rows[1],currentSignal=current?.motiveSignal??null,previousSignal=previous?.motiveSignal??null;
      return {
        symbol,currentSignal,previousSignal,
        delta:currentSignal!=null&&previousSignal!=null?Math.round((currentSignal-previousSignal)*10)/10:null,
        confidence:current?.confidence??null,stance:current?.stance??null,engineVersion:current?.engineVersion??null,
        recordedAt:current?.recordedAt.toISOString()??null,
        evidence:current?evidenceLabels(current.evidenceJson):[],
        history:rows.map(row=>({motiveSignal:row.motiveSignal,confidence:row.confidence,stance:row.stance,
          recordedAt:row.recordedAt.toISOString(),evidence:evidenceLabels(row.evidenceJson)})),
      };
    });
    const resolvedOutcomes=resolvedRows.length;
    const confirmed=resolvedRows.filter(r=>r.outcome==="CONFIRMED").length;
    const partial=resolvedRows.filter(r=>r.outcome==="PARTIAL").length;
    const rejected=resolvedRows.filter(r=>r.outcome==="REJECTED").length;
    const observedReliability=resolvedOutcomes>=minimumResolvedForScore
      ?Math.round(((confirmed+partial*.5)/resolvedOutcomes)*1000)/10:null;
    return json({
      generatedAt:new Date().toISOString(),snapshotCount,pendingOutcomes,inconclusiveOutcomes,resolvedOutcomes,
      minimumResolvedForScore,readiness:resolvedOutcomes>=minimumResolvedForScore?"READY":"COLLECTING_OUTCOMES",
      observedReliability,
      outcomeBreakdown:{confirmed,partial,rejected},
      note:resolvedOutcomes>=minimumResolvedForScore
        ?`Track Record has ${resolvedOutcomes} V4 market-grounded resolved observations. Observed reliability is historical evidence, not a forecast probability.`
        :`Track Record is collecting market-grounded outcomes. ${resolvedOutcomes}/${minimumResolvedForScore} minimum resolved outcomes available; no reliability score is shown yet.`,
      coverage:{
        supported:["Stocks / Pink Sheets (Finnhub daily close)","Mapped crypto assets (CoinGecko historical USD)"],
        pending:["Sports events","Prediction markets"],
        note:"Sports and prediction outcomes remain pending until a provider-resolvable event identity is recorded. They are never inferred from Motive Signal movement."
      },
      resolved:resolvedRows.slice(0,20).map(row=>({...row,evaluatedAt:row.evaluatedAt?.toISOString()??null})),
      replay,
    });
  }catch(error){return accessErrorResponse(error);}
}
