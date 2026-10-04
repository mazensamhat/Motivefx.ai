import { prisma } from "@motivefx/database";
import { json } from "@/lib/api";
import { requireFeature } from "@/lib/terminal/access";
import { accessErrorResponse, requireTerminalSession } from "@/lib/terminal/auth";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { OUTCOME_EVALUATOR_VERSION, summarizeCalibration } from "@/lib/ops/outcome-policy";

export const dynamic = "force-dynamic";

function parseEvidence(raw: string) {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [] as Array<Record<string, unknown>>;
    return value.filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v));
  } catch {
    return [] as Array<Record<string, unknown>>;
  }
}

function evidenceSummary(raw: string) {
  return parseEvidence(raw).slice(0, 5).map((ev) => ({
    provider: String(ev.provider ?? "source"),
    group: String(ev.group ?? ev.market ?? "evidence"),
    observedAt: typeof ev.observedAt === "string" ? ev.observedAt : null,
    confidence: typeof ev.confidence === "number" ? ev.confidence : null,
  }));
}

export async function GET() {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  try {
    const plan = await entitlementsPlanForUser(auth.session.user);
    requireFeature(plan, "advanced_analytics");

    const [snapshotCount, pendingOutcomes, resolvedRows, latest] = await Promise.all([
      prisma.signalSnapshot.count(),
      prisma.signalOutcome.count({ where: { outcome: "PENDING" } }),
      prisma.signalOutcome.findMany({
        where: {
          evaluatorVersion: OUTCOME_EVALUATOR_VERSION,
          outcome: { in: ["CONFIRMED", "PARTIAL", "REJECTED"] },
        },
        select: {
          id: true, snapshotId: true, symbol: true, claim: true, horizonDays: true,
          predictedScore: true, predictedConf: true, entryPrice: true, outcomePrice: true,
          realizedReturnPct: true, outcome: true, evaluatedAt: true, notes: true,
          snapshot: { select: { recordedAt: true } },
        },
        orderBy: { evaluatedAt: "desc" },
        take: 5000,
      }),
      prisma.signalSnapshot.findMany({
        orderBy: { recordedAt: "desc" },
        take: 300,
        include: {
          outcomes: {
            orderBy: { createdAt: "desc" },
            take: 4,
            select: {
              id: true, claim: true, horizonDays: true, predictedScore: true, predictedConf: true,
              entryPrice: true, outcomePrice: true, realizedReturnPct: true, evaluatorVersion: true,
              outcome: true, evaluatedAt: true, notes: true,
            },
          },
        },
      }),
    ]);

    const calibration = summarizeCalibration(resolvedRows);
    const resolvedOutcomes = resolvedRows.length;
    const minimumResolvedForScore = 30;
    const score = resolvedOutcomes >= minimumResolvedForScore
      ? Math.round((resolvedRows.reduce((sum, row) => sum + (row.outcome === "CONFIRMED" ? 1 : row.outcome === "PARTIAL" ? 0.5 : 0), 0) / resolvedOutcomes) * 1000) / 10
      : null;

    const bySymbol = new Map<string, typeof latest>();
    for (const row of latest) {
      const key = row.symbol.toUpperCase();
      const rows = bySymbol.get(key) ?? [];
      if (rows.length < 8) rows.push(row);
      bySymbol.set(key, rows);
    }

    const replay = [...bySymbol.entries()].slice(0, 18).map(([symbol, rows]) => {
      const current = rows[0], previous = rows[1];
      const currentSignal = current?.motiveSignal ?? null;
      const previousSignal = previous?.motiveSignal ?? null;
      const latestOutcome = rows.flatMap((r) => r.outcomes.map((o) => ({ ...o, snapshotAt: r.recordedAt.toISOString() })))
        .find((o) => o.outcome !== "PENDING") ?? null;
      return {
        symbol,
        currentSignal,
        previousSignal,
        delta: currentSignal != null && previousSignal != null ? Math.round((currentSignal - previousSignal) * 10) / 10 : null,
        confidence: current?.confidence ?? null,
        stance: current?.stance ?? null,
        engineVersion: current?.engineVersion ?? null,
        recordedAt: current?.recordedAt.toISOString() ?? null,
        evidence: evidenceSummary(current?.signalEvidenceJson ?? current?.evidenceJson ?? "[]"),
        latestOutcome,
        history: rows.map((row) => ({
          motiveSignal: row.motiveSignal,
          confidence: row.confidence,
          stance: row.stance,
          recordedAt: row.recordedAt.toISOString(),
          engineVersion: row.engineVersion,
          evidence: evidenceSummary(row.signalEvidenceJson || row.evidenceJson),
          outcomes: row.outcomes.map((o) => ({
            ...o,
            evaluatedAt: o.evaluatedAt?.toISOString() ?? null,
          })),
        })),
      };
    });

    return json({
      generatedAt: new Date().toISOString(),
      snapshotCount,
      pendingOutcomes,
      resolvedOutcomes,
      minimumResolvedForScore,
      readiness: resolvedOutcomes >= minimumResolvedForScore ? "READY" : "COLLECTING_OUTCOMES",
      score,
      calibration: {
        evaluatorVersion: OUTCOME_EVALUATOR_VERSION,
        evaluated: calibration.evaluated,
        forecastReady: calibration.forecastReady,
        buckets: calibration.buckets,
      },
      recentOutcomes: resolvedRows.slice(0, 20).map((row) => ({
        ...row,
        evaluatedAt: row.evaluatedAt?.toISOString() ?? null,
        snapshotAt: row.snapshot.recordedAt.toISOString(),
      })),
      note: resolvedOutcomes >= minimumResolvedForScore
        ? `Track Record is based on ${resolvedOutcomes} market-grounded resolved outcomes. The score is historical reliability, not a forecast probability.`
        : `Track Record is collecting resolved outcomes. ${resolvedOutcomes}/${minimumResolvedForScore} minimum resolved outcomes available; no score is shown yet.`,
      replay,
    });
  } catch (error) {
    return accessErrorResponse(error);
  }
}
