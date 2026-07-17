import { prisma } from "@motivefx/database";
import type { AdminDashboard } from "@/lib/admin-api";
import { PRICING_TIERS } from "@/lib/tiers";

const MODULES = ["trades", "crypto", "betting", "penny", "predictions"] as const;

const MODULE_LABELS: Record<string, string> = {
  trades: "Stocks",
  crypto: "Crypto",
  betting: "Betting",
  penny: "Pink Slips",
  predictions: "Predictions",
};

/** Selected-market id (from tiers.ts) → terminal module key. */
const MARKET_TO_MODULE: Record<string, string> = {
  stocks: "trades",
  crypto: "crypto",
  pink_slips: "penny",
  sports_betting: "betting",
  prediction_markets: "predictions",
};

/** Real monthly-equivalent price per tier (Elite is annual-only → /12). */
const TIER_MRR_USD: Record<string, number> = Object.fromEntries(
  PRICING_TIERS.map((t) => [
    t.id,
    t.monthlyUsd != null ? t.monthlyUsd : t.annualUsd != null ? t.annualUsd / 12 : 0,
  ])
);

const CANCELLED_STATUSES = new Set(["cancelled", "canceled", "churned"]);

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayLabels(days: number) {
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    labels.push(daysAgo(i).toISOString().slice(0, 10));
  }
  return labels;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, payingUsers, usage24h, usage14d, usage30d, recentUsers, allUsers, churnEvents30d] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        where: {
          disabledAt: null,
          subscriptionStatus: "active",
          OR: [{ stripeSubscriptionId: { not: null } }, { billingProvider: { not: null } }],
        },
        select: { intelligenceTier: true, selectedMarkets: true },
      }),
      prisma.usageEvent.count({ where: { createdAt: { gte: since24h } } }),
      prisma.usageEvent.findMany({
        where: { createdAt: { gte: since14d } },
        select: {
          module: true,
          statusCode: true,
          durationMs: true,
          createdAt: true,
        },
      }),
      prisma.usageEvent.findMany({
        where: { createdAt: { gte: since30d } },
        select: { module: true, userId: true },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          selectedMarkets: true,
          signupCountry: true,
          signupCity: true,
          acquisitionChannel: true,
          lastSeenAt: true,
          createdAt: true,
        },
        orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
        take: 50,
      }),
      prisma.user.findMany({
        select: { signupCountry: true, signupRegion: true, signupCity: true },
      }),
      prisma.user.count({
        where: {
          OR: [
            { subscriptionStatus: { in: [...CANCELLED_STATUSES] } },
            { disabledAt: { gte: since30d } },
          ],
        },
      }),
    ]);

  const estimatedMrrUsd = Math.round(
    payingUsers.reduce((sum, user) => sum + (TIER_MRR_USD[user.intelligenceTier] ?? 0), 0)
  );
  const annualSubscribers = payingUsers.filter((u) => u.intelligenceTier === "elite").length;

  // Real "subscriptions by module": paying users who selected each market.
  const subsByModule = new Map<string, number>(MODULES.map((m) => [m, 0]));
  for (const user of payingUsers) {
    const markets = (user.selectedMarkets ?? "")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    for (const market of markets) {
      const mod = MARKET_TO_MODULE[market] ?? market;
      if (subsByModule.has(mod)) subsByModule.set(mod, (subsByModule.get(mod) ?? 0) + 1);
    }
  }

  const days = dayLabels(14);
  const usage7d = usage14d.filter((event) => event.createdAt >= since7d);
  const cells: Record<string, Record<string, number>> = {};
  for (const mod of MODULES) {
    cells[mod] = Object.fromEntries(days.map((day) => [day, 0]));
  }
  for (const event of usage14d) {
    const mod = event.module ?? "other";
    if (!cells[mod]) cells[mod] = Object.fromEntries(days.map((day) => [day, 0]));
    const day = event.createdAt.toISOString().slice(0, 10);
    if (days.includes(day)) cells[mod][day] = (cells[mod][day] ?? 0) + 1;
  }
  const max = Math.max(1, ...Object.values(cells).flatMap((row) => Object.values(row)));

  const moduleEvents = new Map<string, { events: number; users: Set<string> }>();
  for (const event of usage30d) {
    const mod = event.module ?? "other";
    const row = moduleEvents.get(mod) ?? { events: 0, users: new Set<string>() };
    row.events += 1;
    if (event.userId) row.users.add(event.userId);
    moduleEvents.set(mod, row);
  }

  const locCounts = new Map<string, { country: string; region: string; city: string; c: number }>();
  for (const user of allUsers) {
    if (!user.signupCountry) continue;
    const key = `${user.signupCity ?? "Unknown"}|${user.signupCountry}`;
    const row = locCounts.get(key) ?? {
      country: user.signupCountry,
      region: user.signupRegion ?? "",
      city: user.signupCity ?? "Unknown",
      c: 0,
    };
    row.c += 1;
    locCounts.set(key, row);
  }

  return {
    generatedAt: now.toISOString(),
    kpis: {
      totalUsers,
      activeModuleSubscriptions: payingUsers.length,
      annualSubscribers,
      estimatedMrrUsd,
      usageEvents24h: usage24h,
      churnEvents30d,
      annualPriceUsd: 999,
    },
    subscriptionsByModule: MODULES.map((module) => ({
      module,
      active: subsByModule.get(module) ?? 0,
      inactive: 0,
    })),
    moduleHealth: MODULES.map((module) => {
      const events = usage7d.filter((event) => event.module === module);
      const errors = events.filter((event) => (event.statusCode ?? 200) >= 400).length;
      const latencies = events
        .map((event) => event.durationMs)
        .filter((value): value is number => value != null);
      const avgLatencyMs = latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;
      return {
        module,
        label: MODULE_LABELS[module] ?? module,
        status: errors > 5 ? "degraded" : events.length > 0 ? "healthy" : "idle",
        usage7d: events.length,
        avgLatencyMs,
        errors7d: errors,
        ok: errors <= 5,
      };
    }),
    activityHeatmap: { days, modules: [...MODULES], cells, max },
    moduleActivityRanking: [...moduleEvents.entries()]
      .map(([module, row]) => ({
        module,
        events: row.events,
        unique_users: row.users.size,
      }))
      .sort((a, b) => b.events - a.events),
    churnByModule: MODULES.map((module) => ({ module, cancellations: 0 })),
    demographics: {
      cohorts: [],
      sex: [],
      gender: [],
      ageBuckets: [],
      topLocations: [...locCounts.values()].sort((a, b) => b.c - a.c).slice(0, 15),
      paymentMethods: [],
    },
    payments: {
      revenueUsd: 0,
      transactions: 0,
      avgTicketUsd: 0,
      byPlanTier: [],
      byPaymentMethod: [],
      recent: [],
    },
    recentUsers: recentUsers.map((user) => ({
      user_id: user.email,
      cohort: null,
      age: null,
      sex: null,
      gender: null,
      city: user.signupCity,
      country: user.signupCountry,
      payment_method: null,
      acquisition_channel: user.acquisitionChannel,
      active_modules: user.selectedMarkets,
      last_seen_at: (user.lastSeenAt ?? user.createdAt).toISOString(),
    })),
  };
}
