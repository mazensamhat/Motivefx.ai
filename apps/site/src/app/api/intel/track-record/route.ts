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
    requireFeature(plan, "advanced_analytics");
    const [snapshotCount, pendingOutcomes, resolvedOutcomes, latest] = await Promise.all([
      prisma.signalSnapshot.count(),
      prisma.signalOutcome.count({ where: { outcome: "PENDING" } }),
      prisma.signalOutcome.count({ where: { outcome: { not: "PENDING" } } }),
      prisma.signalSnapshot.findMany({
        orderBy: { recordedAt: "desc" },
        take: 120,
        select: { symbol: true, motiveSignal: true, confidence: true, stance: true, engineVersion: true, recordedAt: true },
      }),
    ]);
    const bySymbol = new Map<string, typeof latest>();
    for (const row of latest) {
      const key = row.symbol.toUpperCase();
      const rows = bySymbol.get(key) ?? [];
      if (rows.length < 4) rows.push(row);
      bySymbol.set(key, rows);
    }
    const replay = [...bySymbol.entries()].slice(0, 12).map(([symbol, rows]) => {
      const current = rows[0], previous = rows[1];
      const currentSignal = current?.motiveSignal ?? null;
      const previousSignal = previous?.motiveSignal ?? null;
      return {
        symbol,
        currentSignal,
        previousSignal,
        delta: currentSignal != null && previousSignal != null ? Math.round((currentSignal - previousSignal) * 10) / 10 : null,
        confidence: current?.confidence ?? null,
        stance: current?.stance ?? null,
        engineVersion: current?.engineVersion ?? null,
        recordedAt: current?.recordedAt.toISOString() ?? null,
        history: rows.map((row) => ({
          motiveSignal: row.motiveSignal,
          confidence: row.confidence,
          stance: row.stance,
          recordedAt: row.recordedAt.toISOString(),
        })),
      };
    });
    const minimumResolvedForScore = 30;
    return json({
      generatedAt: new Date().toISOString(),
      snapshotCount,
      pendingOutcomes,
      resolvedOutcomes,
      minimumResolvedForScore,
      readiness: resolvedOutcomes >= minimumResolvedForScore ? "READY" : "COLLECTING_OUTCOMES",
      score: null,
      note: resolvedOutcomes >= minimumResolvedForScore
        ? "Resolved outcomes are available. Historical metrics remain source-specific."
        : `Track Record is collecting resolved outcomes. ${resolvedOutcomes}/${minimumResolvedForScore} minimum resolved outcomes available; no score is shown yet.`,
      replay,
    });
  } catch (error) {
    return accessErrorResponse(error);
  }
}
