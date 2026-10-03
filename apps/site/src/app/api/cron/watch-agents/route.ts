import { prisma } from "@motivefx/database";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { evaluateSignalAlertRules } from "@/lib/terminal/engines";
import { normalizePrefs } from "@/lib/terminal/engines/predictive";
import { upsertAlerts } from "@/lib/terminal/alerts";

export const dynamic="force-dynamic";
export const maxDuration=60;
function authorized(request:Request){const secret=process.env.CRON_SECRET?.trim();return Boolean(secret)&&request.headers.get("authorization")===`Bearer ${secret}`;}

export async function GET(request:Request){
  if(!authorized(request)) return Response.json({error:"Unauthorized"},{status:401});
  const briefing=await buildHomeBriefing({displayName:"Watch",userId:"demo",plan:null});
  const rows=await prisma.userIntelPref.findMany({select:{userId:true,prefsJson:true},take:500});
  let users=0,alerts=0;
  for(const row of rows){
    try{
      const prefs=normalizePrefs(JSON.parse(row.prefsJson));
      if(!prefs.alertRules.some((rule)=>rule.enabled)) continue;
      const evaluated=evaluateSignalAlertRules(prefs.alertRules,{
        probabilityViews:briefing.probabilityViews??[],consensusBreaks:briefing.consensusBreaks??[],
        marketGenomes:briefing.marketGenomes??[],opportunities:briefing.opportunities??[],
      });
      if(evaluated.length){await upsertAlerts(row.userId,evaluated);alerts+=evaluated.length;}
      users+=1;
    }catch{console.warn("[cron/watch-agents] user evaluation skipped");}
  }
  return Response.json({ok:true,users,alerts,generatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
}
