import { prisma } from "@motivefx/database";
import { json } from "@/lib/api";
import { requireFeature } from "@/lib/terminal/access";
import { accessErrorResponse, requireTerminalSession } from "@/lib/terminal/auth";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  try {
    const plan = await entitlementsPlanForUser(auth.session.user);
    requireFeature(plan, "ai_brief");
    const since = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const rows = await prisma.signalSnapshot.findMany({
      where: { recordedAt: { gte: since } }, orderBy: { recordedAt: "desc" }, take: 1200,
      select: { symbol: true, motiveSignal: true, confidence: true, stance: true, recordedAt: true },
    });
    const by = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.symbol.toUpperCase();
      const list = by.get(key) ?? [];
      if (list.length < 2) list.push(row);
      by.set(key, list);
    }
    const movers = [...by.entries()].flatMap(([symbol, history]) => {
      const current=history[0], prior=history[1];
      if (!current) return [];
      const delta=current.motiveSignal!=null&&prior?.motiveSignal!=null?Math.round((current.motiveSignal-prior.motiveSignal)*10)/10:null;
      return [{ symbol, motiveSignal: current.motiveSignal, evidenceConfidence: current.confidence, stance: current.stance,
        delta, recordedAt: current.recordedAt.toISOString(), priorRecordedAt: prior?.recordedAt.toISOString() ?? null,
        state: delta == null ? "new" : delta >= 4 ? "strengthened" : delta <= -4 ? "weakened" : "steady" }];
    }).sort((a,b)=>Math.abs(b.delta??0)-Math.abs(a.delta??0)).slice(0,20);
    return json({
      generatedAt:new Date().toISOString(), strengthened:movers.filter(m=>m.state==="strengthened").slice(0,6),
      weakened:movers.filter(m=>m.state==="weakened").slice(0,6),
      steady:movers.filter(m=>m.state==="steady").slice(0,6),
      newSignals:movers.filter(m=>m.state==="new").slice(0,6),
      carryForward:movers.filter(m=>(m.motiveSignal??0)>=70).slice(0,6),
      note:"Market Close compares recorded Motive Signal snapshots. It is not realized performance and not a trade recommendation.",
    });
  } catch(err){ return accessErrorResponse(err); }
}
