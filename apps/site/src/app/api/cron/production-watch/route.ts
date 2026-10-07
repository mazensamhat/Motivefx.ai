import { prisma } from "@motivefx/database";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { flushSignalEvidencePersistence } from "@/lib/terminal/market-truth/evidence-ledger";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Cadence = "hourly" | "daily" | "weekly" | "monthly";
type CheckState = "pass" | "partial" | "unknown" | "fail";

type Check = {
  check: string;
  finding: string;
  diagnosis: string;
  fixedState: CheckState;
  affectedSurface: string;
  remediationPerformed: string;
  verificationEvidence: string;
};

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function floorHour(date: Date) {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

function startOfUtcDay(date: Date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function staleHours(value: Date | null | undefined, now: Date) {
  if (!value) return Number.POSITIVE_INFINITY;
  return (now.getTime() - value.getTime()) / 3_600_000;
}

async function fetchHealth(origin: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetch(`${origin}/api/health`, { cache: "no-store" }).then(async (res) => ({
        ok: res.ok,
        status: res.status,
        body: res.ok ? await res.json().catch(() => null) : null,
      })),
      new Promise<{ ok: false; status: number; body: null }>((resolve) => {
        timer = setTimeout(() => resolve({ ok: false, status: 0, body: null }), 5_000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function collectSnapshot(
  cadence: Cadence,
  periodStart: Date,
  periodEnd: Date,
  origin: string
) {
  const now = new Date();
  const [
    latestSignal,
    latestDna,
    latestTelemetry,
    openIncidents,
    telemetryErrors,
    portfolioCount,
    betCount,
    predictionCount,
    latestAi,
    health,
  ] = await Promise.all([
    prisma.signalSnapshot.findFirst({
      orderBy: { recordedAt: "desc" },
      select: { recordedAt: true },
    }),
    prisma.marketDnaSnapshot.findFirst({
      orderBy: { recordedAt: "desc" },
      select: { recordedAt: true },
    }),
    prisma.opsTelemetryEvent.findFirst({
      orderBy: { ingestedAt: "desc" },
      select: { ingestedAt: true },
    }),
    prisma.opsIncidentRecord.count({
      where: { status: { in: ["open", "acknowledged"] } },
    }),
    prisma.opsTelemetryEvent.count({
      where: {
        observedAt: { gte: periodStart, lt: periodEnd },
        status: { in: ["error", "fail"] },
      },
    }),
    cadence === "hourly" ? Promise.resolve(null) : prisma.userPortfolio.count(),
    cadence === "hourly" ? Promise.resolve(null) : prisma.userBet.count(),
    cadence === "hourly" ? Promise.resolve(null) : prisma.userPrediction.count(),
    cadence === "hourly"
      ? Promise.resolve(null)
      : prisma.opsAiUsage.findFirst({
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, status: true },
        }),
    fetchHealth(origin),
  ]);

  let signalRecordedAt = latestSignal?.recordedAt ?? null;
  let dnaRecordedAt = latestDna?.recordedAt ?? null;
  const originalSignalStale = staleHours(signalRecordedAt, now) > 2.5;
  const originalDnaStale = staleHours(dnaRecordedAt, now) > 2.5;
  let intelligenceRepairAttempted = false;
  let intelligenceRepairError: string | null = null;
  let fixedCount = 0;

  if (originalSignalStale || originalDnaStale) {
    intelligenceRepairAttempted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        buildHomeBriefing({ displayName: null, userId: "demo", plan: null }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("production_watch_intel_timeout")), 10_000);
        }),
      ]);
      await flushSignalEvidencePersistence();

      const [repairedSignal, repairedDna] = await Promise.all([
        prisma.signalSnapshot.findFirst({
          orderBy: { recordedAt: "desc" },
          select: { recordedAt: true },
        }),
        prisma.marketDnaSnapshot.findFirst({
          orderBy: { recordedAt: "desc" },
          select: { recordedAt: true },
        }),
      ]);
      signalRecordedAt = repairedSignal?.recordedAt ?? signalRecordedAt;
      dnaRecordedAt = repairedDna?.recordedAt ?? dnaRecordedAt;

      if (originalSignalStale && staleHours(signalRecordedAt, now) <= 2.5) fixedCount += 1;
      if (originalDnaStale && staleHours(dnaRecordedAt, now) <= 2.5) fixedCount += 1;
    } catch (error) {
      intelligenceRepairError =
        error instanceof Error ? error.message.slice(0, 160) : "intelligence_refresh_failed";
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  const checks: Check[] = [];
  const findings: Check[] = [];

  const add = (entry: Check) => {
    checks.push(entry);
    if (entry.fixedState === "fail") findings.push(entry);
  };

  const signalAge = staleHours(signalRecordedAt, now);
  add({
    check: "signal_freshness",
    finding: signalRecordedAt
      ? `Latest durable SignalSnapshot is ${signalAge.toFixed(1)}h old.`
      : "No durable SignalSnapshot exists.",
    diagnosis: signalAge <= 2.5 ? "Signal durability is current." : "Signal durability is stale.",
    fixedState: signalAge <= 2.5 ? "pass" : "fail",
    affectedSurface: "Motive Signal / intelligence",
    remediationPerformed:
      originalSignalStale
        ? signalAge <= 2.5
          ? "Production watch refreshed shared intelligence and verified a fresh durable SignalSnapshot."
          : `Production watch attempted a shared-intelligence refresh but SignalSnapshot remains stale${intelligenceRepairError ? `: ${intelligenceRepairError}` : "."}`
        : "No repair required.",
    verificationEvidence: "SignalSnapshot.recordedAt",
  });

  const dnaAge = staleHours(dnaRecordedAt, now);
  add({
    check: "market_dna_freshness",
    finding: dnaRecordedAt
      ? `Latest Market DNA snapshot is ${dnaAge.toFixed(1)}h old.`
      : "No Market DNA snapshot exists.",
    diagnosis: dnaAge <= 2.5 ? "Market DNA is current." : "Market DNA is stale.",
    fixedState: dnaAge <= 2.5 ? "pass" : "fail",
    affectedSurface: "Market DNA",
    remediationPerformed:
      originalDnaStale
        ? dnaAge <= 2.5
          ? "Production watch refreshed shared intelligence and verified fresh Market DNA."
          : `Production watch attempted a shared-intelligence refresh but Market DNA remains stale${intelligenceRepairError ? `: ${intelligenceRepairError}` : "."}`
        : "No repair required.",
    verificationEvidence: "MarketDnaSnapshot.recordedAt",
  });

  const telemetryAge = staleHours(latestTelemetry?.ingestedAt, now);
  add({
    check: "ops_telemetry",
    finding: latestTelemetry
      ? `Latest Ops telemetry is ${telemetryAge.toFixed(1)}h old; ${telemetryErrors} error/fail events were recorded in this period.`
      : "No Ops telemetry exists.",
    diagnosis:
      telemetryAge <= 3 && telemetryErrors === 0
        ? "Operational telemetry is current with no period errors."
        : telemetryAge <= 3
          ? "Operational telemetry is current but includes errors."
          : "Operational telemetry is stale.",
    fixedState: telemetryAge <= 3 && telemetryErrors === 0 ? "pass" : telemetryAge <= 3 ? "partial" : "fail",
    affectedSurface: "Ops telemetry",
    remediationPerformed: "No destructive remediation is attempted by the audit writer.",
    verificationEvidence: "OpsTelemetryEvent",
  });

  add({
    check: "incident_desk",
    finding: `${openIncidents} open or acknowledged incident(s).`,
    diagnosis: openIncidents === 0 ? "No unresolved Ops incidents." : "Ops has unresolved incidents.",
    fixedState: openIncidents === 0 ? "pass" : "fail",
    affectedSurface: "Incident desk",
    remediationPerformed: "Incident lifecycle remains owned by Ops resolution workflows.",
    verificationEvidence: "OpsIncidentRecord.status",
  });

  const feedMap =
    health.body && typeof health.body === "object" && "feeds" in health.body
      ? ((health.body as { feeds?: Record<string, boolean> }).feeds ?? {})
      : {};
  const feedEntries = Object.entries(feedMap);
  const badFeeds = feedEntries.filter(([, enabled]) => !enabled).map(([name]) => name);
  add({
    check: "public_health",
    finding: health.ok
      ? `/api/health returned HTTP ${health.status}; ${feedEntries.length - badFeeds.length}/${feedEntries.length} configured feed checks are green.`
      : `/api/health did not return a successful response (status ${health.status || "timeout"}).`,
    diagnosis: health.ok && badFeeds.length === 0 ? "Public health endpoint is green." : "Public health requires attention.",
    fixedState: health.ok && badFeeds.length === 0 ? "pass" : health.ok ? "partial" : "fail",
    affectedSurface: "public API / feeds",
    remediationPerformed: "Provider kill switches and fallbacks remain authoritative; audit does not alter credentials.",
    verificationEvidence: "/api/health",
  });

  if (cadence !== "hourly") {
    checks.push({
      check: "customer_storage",
      finding: `${portfolioCount ?? 0} portfolio rows, ${betCount ?? 0} saved bets and ${predictionCount ?? 0} saved predictions are present.`,
      diagnosis: "Durable customer storage is queryable. This audit does not mutate customer records.",
      fixedState: "pass",
      affectedSurface: "portfolio / sports / predictions",
      remediationPerformed: "none",
      verificationEvidence: "UserPortfolio, UserBet, UserPrediction",
    });

    const aiAge = staleHours(latestAi?.createdAt, now);
    checks.push({
      check: "ai_metering",
      finding: latestAi
        ? `Latest metered AI call is ${aiAge.toFixed(1)}h old with status ${latestAi.status ?? "unknown"}.`
        : "No Ops AI usage has been recorded.",
      diagnosis:
        aiAge <= 48
          ? "AI metering has recent evidence."
          : "No recent AI interaction is available; this is informational unless customer AI traffic is expected.",
      fixedState: aiAge <= 48 ? "pass" : "unknown",
      affectedSurface: "Ask Motive / Chief of Finance",
      remediationPerformed: "none",
      verificationEvidence: "OpsAiUsage.createdAt",
    });
  }

  if (cadence === "weekly" || cadence === "monthly") {
    const duplicateRows = await prisma.$queryRawUnsafe<Array<{ duplicate_groups: bigint }>>(
      `SELECT COUNT(*)::bigint AS duplicate_groups
       FROM (
         SELECT "symbol", "motiveSignal", "engineVersion", date_trunc('minute', "recordedAt"), COUNT(*)
         FROM public."SignalSnapshot"
         WHERE "recordedAt" >= $1 AND "recordedAt" < $2
         GROUP BY 1,2,3,4
         HAVING COUNT(*) > 1
       ) d`,
      periodStart,
      periodEnd
    );
    const duplicates = Number(duplicateRows[0]?.duplicate_groups ?? BigInt(0));
    add({
      check: "signal_duplicate_integrity",
      finding: `${duplicates} duplicate logical signal group(s) detected in the audit window.`,
      diagnosis: duplicates === 0 ? "Signal persistence idempotency is holding." : "Duplicate signal persistence requires review.",
      fixedState: duplicates === 0 ? "pass" : "fail",
      affectedSurface: "SignalSnapshot / calibration",
      remediationPerformed: "Deterministic observation IDs and deduplication remain enabled.",
      verificationEvidence: "SignalSnapshot grouped by symbol/score/version/minute",
    });
  }

  if (cadence === "monthly") {
    const connectionRows = await prisma.$queryRawUnsafe<Array<{ total: bigint; waiting: bigint }>>(
      `SELECT COUNT(*)::bigint AS total,
              COUNT(*) FILTER (WHERE wait_event IS NOT NULL)::bigint AS waiting
       FROM pg_stat_activity
       WHERE datname = current_database()`
    );
    const total = Number(connectionRows[0]?.total ?? BigInt(0));
    const waiting = Number(connectionRows[0]?.waiting ?? BigInt(0));
    add({
      check: "database_reliability",
      finding: `${total} database connection(s), ${waiting} currently waiting.`,
      diagnosis: waiting === 0 ? "No current database waiter pressure." : "Database waiter pressure requires review.",
      fixedState: waiting === 0 ? "pass" : "fail",
      affectedSurface: "database reliability",
      remediationPerformed: "Connection pool settings are not changed automatically.",
      verificationEvidence: "pg_stat_activity",
    });
  }

  const issueCount = findings.length;
  const status = issueCount === 0 ? "pass" : "attention";
  const componentStatus = {
    web: health.ok ? "operational" : "degraded",
    database: "operational",
    signals: signalAge <= 2.5 ? "operational" : "degraded",
    marketDna: dnaAge <= 2.5 ? "operational" : "degraded",
    telemetry: telemetryAge <= 3 ? "operational" : "degraded",
    incidents: openIncidents === 0 ? "clear" : "attention",
    ai: latestAi && staleHours(latestAi.createdAt, now) <= 48 ? "operational" : "unknown",
  };

  return {
    status,
    issueCount,
    openCount: issueCount,
    fixedCount,
    summary:
      issueCount === 0
        ? `${cadence} MotiveFX production audit passed with current intelligence, telemetry and incident state.`
        : `${cadence} MotiveFX production audit found ${issueCount} item(s) requiring attention.`,
    details: {
      scope: cadence,
      checks,
      findings,
      checkedWindow: {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        checkedAt: now.toISOString(),
      },
    },
    componentStatus,
  };
}

async function persistRun(
  cadence: Cadence,
  periodStart: Date,
  periodEnd: Date,
  snapshot: Awaited<ReturnType<typeof collectSnapshot>>
) {
  const id = `motivefx:${cadence}:${periodStart.toISOString()}`;
  const deploymentId =
    process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    null;

  await prisma.$executeRawUnsafe(
    `INSERT INTO public."OpsProductionWatchRun"
      (id,cadence,period_start,period_end,checked_at,status,issue_count,open_count,fixed_count,
       deployment_id,deployment_state,summary,details,component_status,"createdAt","updatedAt",product_key)
     VALUES ($1,$2,$3,$4,now(),$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,now(),now(),'motivefx')
     ON CONFLICT (id) DO UPDATE SET
       checked_at=EXCLUDED.checked_at,
       status=EXCLUDED.status,
       issue_count=EXCLUDED.issue_count,
       open_count=EXCLUDED.open_count,
       fixed_count=EXCLUDED.fixed_count,
       deployment_id=EXCLUDED.deployment_id,
       deployment_state=EXCLUDED.deployment_state,
       summary=EXCLUDED.summary,
       details=EXCLUDED.details,
       component_status=EXCLUDED.component_status,
       "updatedAt"=now()`,
    id,
    cadence,
    periodStart,
    periodEnd,
    snapshot.status,
    snapshot.issueCount,
    snapshot.openCount,
    snapshot.fixedCount,
    deploymentId,
    process.env.VERCEL_ENV === "production" ? "READY" : process.env.VERCEL_ENV ?? "unknown",
    snapshot.summary,
    JSON.stringify(snapshot.details),
    JSON.stringify(snapshot.componentStatus)
  );
}

function cadenceWindows(now: Date): Array<{ cadence: Cadence; start: Date; end: Date }> {
  const hourEnd = floorHour(now);
  const hourStart = new Date(hourEnd.getTime() - 3_600_000);
  const windows: Array<{ cadence: Cadence; start: Date; end: Date }> = [
    { cadence: "hourly", start: hourStart, end: hourEnd },
  ];

  if (now.getUTCHours() === 0) {
    const dayEnd = startOfUtcDay(now);
    const dayStart = new Date(dayEnd.getTime() - 86_400_000);
    windows.push({ cadence: "daily", start: dayStart, end: dayEnd });

    if (now.getUTCDay() === 1) {
      windows.push({
        cadence: "weekly",
        start: new Date(dayEnd.getTime() - 7 * 86_400_000),
        end: dayEnd,
      });
    }

    if (now.getUTCDate() === 1) {
      const monthEnd = dayEnd;
      const monthStart = new Date(Date.UTC(monthEnd.getUTCFullYear(), monthEnd.getUTCMonth() - 1, 1));
      windows.push({ cadence: "monthly", start: monthStart, end: monthEnd });
    }
  }

  return windows;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const origin = new URL(request.url).origin;
    const results = [];

    for (const window of cadenceWindows(now)) {
      const snapshot = await collectSnapshot(window.cadence, window.start, window.end, origin);
      await persistRun(window.cadence, window.start, window.end, snapshot);
      results.push({
        cadence: window.cadence,
        periodStart: window.start.toISOString(),
        periodEnd: window.end.toISOString(),
        status: snapshot.status,
        issueCount: snapshot.issueCount,
      });
    }

    return Response.json(
      { ok: true, generatedAt: now.toISOString(), runs: results },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[cron/production-watch]", error);
    return Response.json(
      { ok: false, error: "Production watch failed." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
