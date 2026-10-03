import { prisma } from "@motivefx/database";
import { json } from "@/lib/api";
import { requireFeature } from "@/lib/terminal/access";
import { accessErrorResponse, requireTerminalSession } from "@/lib/terminal/auth";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { loadPortfolio } from "@/lib/terminal/portfolio";
import { listBets } from "@/lib/terminal/bets";
import { listPredictions } from "@/lib/terminal/predictions";
import { listWatchlist } from "@/lib/terminal/watchlist";

export const dynamic = "force-dynamic";

type Holding = { symbol: string; shares?: number; amount?: number; avg_cost?: number };
function scoreBand(score:number|null){
  if(score==null) return "unknown";
  if(score>=70) return "strong";
  if(score<=40) return "weak";
  return "mixed";
}

export async function GET() {
  const auth=await requireTerminalSession();
  if(!auth.ok) return auth.response;
  try{
    const plan=await entitlementsPlanForUser(auth.session.user);
    requireFeature(plan,"portfolio_intelligence");
    const uid=auth.session.user.id;
    const [trades,crypto,penny,bets,predictions,watchlist]=await Promise.all([
      loadPortfolio(uid,"trades"),loadPortfolio(uid,"crypto"),loadPortfolio(uid,"penny"),
      listBets(uid),listPredictions(uid),listWatchlist(uid),
    ]);
    const assets=[
      ...trades.map((h:Holding)=>({module:"trades",...h})),
      ...crypto.map((h:Holding)=>({module:"crypto",...h})),
      ...penny.map((h:Holding)=>({module:"penny",...h})),
    ];
    const symbols=[...new Set(assets.map((h)=>h.symbol.toUpperCase()))];
    const snapshots=symbols.length ? await prisma.signalSnapshot.findMany({
      where:{symbol:{in:symbols}},orderBy:{recordedAt:"desc"},take:Math.min(600,Math.max(40,symbols.length*8)),
      select:{symbol:true,motiveSignal:true,confidence:true,stance:true,recordedAt:true},
    }) : [];
    const grouped=new Map<string,typeof snapshots>();
    for(const row of snapshots){
      const key=row.symbol.toUpperCase();const rows=grouped.get(key)??[];
      if(rows.length<2) rows.push(row);grouped.set(key,rows);
    }
    const holdings=assets.map((h)=>{
      const rows=grouped.get(h.symbol.toUpperCase())??[];
      const current=rows[0],previous=rows[1];
      const signal=current?.motiveSignal??null;
      const delta=signal!=null&&previous?.motiveSignal!=null?Math.round((signal-previous.motiveSignal)*10)/10:null;
      return {...h,motiveSignal:signal,evidenceConfidence:current?.confidence??null,stance:current?.stance??null,
        delta,signalBand:scoreBand(signal),signalRecordedAt:current?.recordedAt.toISOString()??null};
    });
    const strong=holdings.filter((h)=>h.signalBand==="strong").length;
    const weak=holdings.filter((h)=>h.signalBand==="weak").length;
    const changing=holdings.filter((h)=>h.delta!=null&&Math.abs(h.delta)>=10).length;
    const openBets=bets.filter((b)=>b.status==="open"&&!b.is_simulation);
    const openPredictions=predictions.filter((p)=>p.status==="open"&&!p.is_simulation);
    return json({
      generatedAt:new Date().toISOString(),
      counts:{assets:holdings.length,trades:trades.length,crypto:crypto.length,penny:penny.length,
        bets:openBets.length,predictions:openPredictions.length,watchlist:watchlist.length},
      posture:{strong,weak,changing,unknown:holdings.filter((h)=>h.signalBand==="unknown").length},
      holdings,
      openBets:openBets.slice(0,12),
      openPredictions:openPredictions.slice(0,12),
      watchlist:watchlist.slice(0,24),
      note:"Portfolio Intelligence summarizes recorded holdings and Motive Signal evidence. It is monitoring context, not investment or wagering advice.",
    });
  }catch(error){return accessErrorResponse(error);}
}
