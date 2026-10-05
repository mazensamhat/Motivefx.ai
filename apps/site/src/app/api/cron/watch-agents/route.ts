import { prisma } from "@motivefx/database";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { evaluateWatchAgents, normalizePrefs } from "@/lib/terminal/engines";
import type { ConsensusBreak, ProbabilityView } from "@/lib/terminal/engines";
import { upsertAlerts } from "@/lib/terminal/alerts";
import { flushSignalEvidencePersistence } from "@/lib/terminal/market-truth/evidence-ledger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function buildSharedIntel() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      buildHomeBriefing({ displayName: null, userId: "demo", plan: null }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("watch_agent_intel_timeout")), 12_000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const prefRows = await prisma.userIntelPref.findMany({
    take: 1000,
    select: { userId: true, prefsJson: true },
  });

  const configured = prefRows.flatMap((row) => {
    try {
      const prefs = normalizePrefs(JSON.parse(row.prefsJson || "{}"));
      const watchAgents = (prefs.watchAgents ?? []).filter((agent) => agent.enabled);
      return watchAgents.length ? [{ userId: row.userId, watchAgents }] : [];
    } catch {
      return [];
    }
  });

  // Refresh durable Motive Signal + Market DNA on every scheduled run.
  // Intelligence freshness must not depend on whether a user has configured a watch agent.
  const briefing = await buildSharedIntel();
  await flushSignalEvidencePersistence();

  if (!configured.length) {
    return Response.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        usersScanned: prefRows.length,
        usersWithAgents: 0,
        agentsEvaluated: 0,
        triggered: 0,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const probabilityViews = (Array.isArray(briefing.probabilityViews)
    ? briefing.probabilityViews
    : []) as ProbabilityView[];
  const consensusBreaks = (Array.isArray(briefing.consensusBreaks)
    ? briefing.consensusBreaks
    : []) as ConsensusBreak[];

  let agentsEvaluated = 0;
  let triggered = 0;
  let usersFailed = 0;

  for (let start = 0; start < configured.length; start += 20) {
    const batch = configured.slice(start, start + 20);
    const results = await Promise.allSettled(
      batch.map(async ({ userId, watchAgents }) => {
        const alerts = evaluateWatchAgents(watchAgents, { probabilityViews, consensusBreaks });
        if (!alerts.length) return { evaluated: watchAgents.length, triggered: 0 };
        await upsertAlerts(
          userId,
          alerts.map((alert) => ({
            module: String(alert.module ?? ""),
            symbol: String(alert.symbol ?? ""),
            title: alert.title,
            body: alert.body ?? "",
            confidence: Number(alert.confidence ?? 0),
            alertKey: alert.alertKey,
          }))
        );
        return { evaluated: watchAgents.length, triggered: alerts.length };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        agentsEvaluated += result.value.evaluated;
        triggered += result.value.triggered;
      } else {
        usersFailed += 1;
      }
    }
  }

  return Response.json(
    {
      ok: usersFailed === 0,
      generatedAt: new Date().toISOString(),
      usersScanned: prefRows.length,
      usersWithAgents: configured.length,
      agentsEvaluated,
      triggered,
      usersFailed,
    },
    {
      status: usersFailed === configured.length ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
