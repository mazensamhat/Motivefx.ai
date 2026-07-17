import { prisma } from "@motivefx/database";
import { PRICING_TIERS, type PricingTierId } from "@/lib/tiers";

/**
 * SaaS + product KPI engine for the Ops Console.
 *
 * Mirrors the executive/financial metrics of the Motive Life Service Console
 * (MRR/ARR/ARPA, NRR/GRR, logo + revenue churn, cohort retention, growth
 * waterfall, executive & CFO summary, at-risk accounts) adapted for MotiveFX's
 * B2C subscriber model, plus MotiveFX-specific product KPIs.
 *
 * Marketing acquisition surfaces (CAC-by-channel, blended CAC, magic number,
 * channel attribution, social metrics) are intentionally excluded.
 */

const TIER_LABELS: Record<string, string> = {
  lite: "Lite",
  pro: "Pro",
  ultra: "Ultra",
  ultra_plus: "Ultra+",
  elite: "Elite",
};

const TIER_ORDER: PricingTierId[] = ["lite", "pro", "ultra", "ultra_plus", "elite"];

/** Monthly-equivalent price for a tier (Elite is annual-only → /12). */
function monthlyPriceForTier(tier: string): number {
  const t = PRICING_TIERS.find((x) => x.id === tier);
  if (!t) return 0;
  if (t.monthlyUsd != null) return t.monthlyUsd;
  if (t.annualUsd != null) return t.annualUsd / 12;
  return 0;
}

function envNumber(name: string): number | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function monthLabel(d: Date): string {
  return d.toISOString().slice(0, 7);
}

const CANCELLED_STATUSES = new Set(["cancelled", "canceled", "churned"]);

type PayingUser = {
  id: string;
  email: string;
  intelligenceTier: string;
  subscriptionStatus: string;
  billingProvider: string | null;
  stripeSubscriptionId: string | null;
  accessExpiresAt: Date | null;
  disabledAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  signupCountry: string | null;
  mrr: number;
};

/** A revenue-generating subscriber: active status, not comp, not disabled, has billing. */
function isPaying(u: {
  subscriptionStatus: string;
  disabledAt: Date | null;
  billingProvider: string | null;
  stripeSubscriptionId: string | null;
}): boolean {
  if (u.disabledAt) return false;
  if (u.subscriptionStatus === "comp") return false;
  if (u.subscriptionStatus !== "active") return false;
  return Boolean(u.stripeSubscriptionId) || Boolean(u.billingProvider);
}

export type FinancialSnapshot = Awaited<ReturnType<typeof getFinancialSnapshot>>;

export async function getFinancialSnapshot() {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since60d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const staleThreshold = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  const expiringSoon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [
    allUsers,
    compCount,
    usage1dUsers,
    usage7dUsers,
    usage30dUsers,
    bets,
    predictions,
    portfolioUsers,
    watchlistCount,
    journalCount,
    alertAgg,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        intelligenceTier: true,
        subscriptionStatus: true,
        billingProvider: true,
        stripeSubscriptionId: true,
        accessExpiresAt: true,
        disabledAt: true,
        lastSeenAt: true,
        createdAt: true,
        signupCountry: true,
      },
    }),
    prisma.user.count({ where: { subscriptionStatus: "comp", disabledAt: null } }),
    prisma.usageEvent.findMany({
      where: { createdAt: { gte: since24h }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.usageEvent.findMany({
      where: { createdAt: { gte: since7d }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.usageEvent.findMany({
      where: { createdAt: { gte: since30d }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.userBet.findMany({
      where: { isSimulation: false },
      select: { userId: true, status: true, outcome: true, pnl: true, sport: true },
    }),
    prisma.userPrediction.findMany({
      where: { isSimulation: false },
      select: { userId: true, status: true, outcome: true, pnl: true, category: true },
    }),
    prisma.userPortfolio.findMany({ select: { userId: true }, distinct: ["userId"] }),
    prisma.watchlistItem.count(),
    prisma.intelJournalEntry.count(),
    prisma.intelAlert.groupBy({ by: ["seen"], _count: { _all: true } }),
  ]);

  // ---- Subscriber base ----------------------------------------------------
  const paying: PayingUser[] = allUsers
    .filter((u) => isPaying(u))
    .map((u) => ({ ...u, mrr: monthlyPriceForTier(u.intelligenceTier) }));

  const mrr = paying.reduce((s, u) => s + u.mrr, 0);
  const arr = mrr * 12;
  const payingAccounts = paying.length;
  const arpa = payingAccounts ? mrr / payingAccounts : 0;

  // Subscription mix by status (all users).
  const statusCounts = new Map<string, number>();
  for (const u of allUsers) {
    const key = u.disabledAt ? "disabled" : u.subscriptionStatus || "none";
    statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);
  }
  const subscriptionMix = [...statusCounts.entries()]
    .map(([status, c]) => ({ status, c }))
    .sort((a, b) => b.c - a.c);

  // By tier: accounts + MRR.
  const byTier = TIER_ORDER.map((tier) => {
    const rows = paying.filter((u) => u.intelligenceTier === tier);
    return {
      tier,
      label: TIER_LABELS[tier] ?? tier,
      accounts: rows.length,
      mrr: round(rows.reduce((s, u) => s + u.mrr, 0)),
    };
  }).filter((r) => r.accounts > 0);

  // MRR by country.
  const countryMrr = new Map<string, { mrr: number; accounts: number }>();
  for (const u of paying) {
    const key = u.signupCountry ?? "Unknown";
    const row = countryMrr.get(key) ?? { mrr: 0, accounts: 0 };
    row.mrr += u.mrr;
    row.accounts += 1;
    countryMrr.set(key, row);
  }
  const mrrByCountry = [...countryMrr.entries()]
    .map(([country, v]) => ({ country, mrr: round(v.mrr), accounts: v.accounts }))
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, 15);

  // ---- New / churned (last 30 days) --------------------------------------
  const newPaying = paying.filter((u) => u.createdAt >= since30d);
  const newMrr = newPaying.reduce((s, u) => s + u.mrr, 0);
  const newAccounts30d = newPaying.length;

  const churnedUsers = allUsers.filter(
    (u) =>
      (CANCELLED_STATUSES.has(u.subscriptionStatus) || u.disabledAt != null) &&
      (u.disabledAt ?? u.createdAt) >= since30d &&
      (Boolean(u.stripeSubscriptionId) || Boolean(u.billingProvider))
  );
  const churnedMrr = churnedUsers.reduce((s, u) => s + monthlyPriceForTier(u.intelligenceTier), 0);
  const churnedAccounts30d = churnedUsers.length;

  const baseAccounts = payingAccounts + churnedAccounts30d;
  const baseMrr = mrr + churnedMrr;
  const logoChurnRate = baseAccounts ? churnedAccounts30d / baseAccounts : 0;
  const revenueChurnRate = baseMrr ? churnedMrr / baseMrr : 0;
  // Without a subscription-history table, expansion/contraction are unknown,
  // so NRR is approximated by GRR (gross revenue retention).
  const grr = 1 - revenueChurnRate;
  const nrr = grr;

  // ---- MRR trend (12 months, approximate cohort accrual) ------------------
  const firstMonth = addMonths(startOfMonth(now), -11);
  const mrrTrend: { month: string; mrr: number; accounts: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const monthStart = addMonths(firstMonth, i);
    const monthEnd = addMonths(monthStart, 1);
    // Assumes currently-paying users retain their tier since signup (approx).
    const cohort = paying.filter((u) => u.createdAt < monthEnd);
    mrrTrend.push({
      month: monthLabel(monthStart),
      mrr: round(cohort.reduce((s, u) => s + u.mrr, 0)),
      accounts: cohort.length,
    });
  }

  // ---- Growth waterfall (last 6 months, approximate) ----------------------
  const waterfall: {
    month: string;
    starting: number;
    newMrr: number;
    churnedMrr: number;
    ending: number;
  }[] = [];
  for (let i = 6; i >= 1; i--) {
    const idx = 12 - i;
    const prev = mrrTrend[idx - 1]?.mrr ?? 0;
    const cur = mrrTrend[idx]?.mrr ?? 0;
    const delta = round(cur - prev);
    waterfall.push({
      month: mrrTrend[idx]?.month ?? "",
      starting: round(prev),
      newMrr: delta > 0 ? delta : 0,
      churnedMrr: delta < 0 ? delta : 0,
      ending: round(cur),
    });
  }
  const prevMonthMrr = mrrTrend[10]?.mrr ?? 0;
  const momGrowthPct = prevMonthMrr ? ((mrr - prevMonthMrr) / prevMonthMrr) * 100 : 0;

  // ---- Cohort retention (by signup month, last 6 months) ------------------
  const cohorts: {
    month: string;
    signups: number;
    activeNow: number;
    retentionPct: number;
  }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = addMonths(startOfMonth(now), -i);
    const monthEnd = addMonths(monthStart, 1);
    const cohortUsers = allUsers.filter(
      (u) => u.createdAt >= monthStart && u.createdAt < monthEnd
    );
    const activeNow = cohortUsers.filter(
      (u) => u.lastSeenAt != null && u.lastSeenAt >= since30d
    ).length;
    cohorts.push({
      month: monthLabel(monthStart),
      signups: cohortUsers.length,
      activeNow,
      retentionPct: cohortUsers.length ? round((activeNow / cohortUsers.length) * 100, 1) : 0,
    });
  }

  // ---- At-risk / churn watchlist -----------------------------------------
  const atRisk = paying
    .map((u) => {
      const reasons: string[] = [];
      if (u.accessExpiresAt && u.accessExpiresAt <= expiringSoon) reasons.push("Access expiring ≤14d");
      if (!u.lastSeenAt || u.lastSeenAt < staleThreshold) reasons.push("No activity ≥21d");
      if (u.subscriptionStatus === "paused") reasons.push("Subscription paused");
      return {
        email: u.email,
        tier: TIER_LABELS[u.intelligenceTier] ?? u.intelligenceTier,
        mrr: round(u.mrr),
        lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
        reasons,
        riskScore: reasons.length,
      };
    })
    .filter((r) => r.reasons.length > 0)
    .sort((a, b) => b.riskScore - a.riskScore || b.mrr - a.mrr)
    .slice(0, 25);

  // ---- CFO / board metrics -----------------------------------------------
  const grossMarginPct = envNumber("MOTIVEFX_GROSS_MARGIN_PCT") ?? 85;
  const netNewArr = (newMrr - churnedMrr) * 12;
  const growthPct = momGrowthPct; // MoM MRR growth (approx annualization avoided)
  const ruleOf40 = round(growthPct + grossMarginPct, 1);

  const monthlyBurn = envNumber("MOTIVEFX_MONTHLY_BURN_USD");
  const cashBalance = envNumber("MOTIVEFX_CASH_BALANCE_USD");
  const cashRunwayMonths =
    monthlyBurn && monthlyBurn > 0 && cashBalance != null ? round(cashBalance / monthlyBurn, 1) : null;
  const burnMultiple =
    monthlyBurn && monthlyBurn > 0 && netNewArr > 0 ? round((monthlyBurn * 12) / netNewArr, 2) : null;

  // ---- Product KPIs (MotiveFX-specific) ----------------------------------
  const realBettors = new Set(bets.map((b) => b.userId)).size;
  const openBets = bets.filter((b) => b.status === "open").length;
  const settledBets = bets.filter((b) => b.status !== "open").length;
  const wonBets = bets.filter((b) => b.outcome === "won").length;
  const lostBets = bets.filter((b) => b.outcome === "lost").length;
  const betWinRate = wonBets + lostBets ? round((wonBets / (wonBets + lostBets)) * 100, 1) : 0;
  const betPnl = round(bets.reduce((s, b) => s + (b.pnl ?? 0), 0));

  const realPredictors = new Set(predictions.map((p) => p.userId)).size;
  const openPreds = predictions.filter((p) => p.status === "open").length;
  const settledPreds = predictions.filter((p) => p.status !== "open").length;
  const wonPreds = predictions.filter((p) => p.outcome === "won").length;
  const lostPreds = predictions.filter((p) => p.outcome === "lost").length;
  const predAccuracy = wonPreds + lostPreds ? round((wonPreds / (wonPreds + lostPreds)) * 100, 1) : 0;
  const predPnl = round(predictions.reduce((s, p) => s + (p.pnl ?? 0), 0));

  const alertsTotal = alertAgg.reduce((s, a) => s + a._count._all, 0);
  const alertsUnread = alertAgg.find((a) => a.seen === false)?._count._all ?? 0;

  const product = {
    dau: usage1dUsers.length,
    wau: usage7dUsers.length,
    mau: usage30dUsers.length,
    stickiness: usage30dUsers.length
      ? round((usage1dUsers.length / usage30dUsers.length) * 100, 1)
      : 0,
    bettors: realBettors,
    openBets,
    settledBets,
    betWinRate,
    betPnl,
    predictors: realPredictors,
    openPreds,
    settledPreds,
    predAccuracy,
    predPnl,
    portfolios: portfolioUsers.length,
    watchlistItems: watchlistCount,
    journalEntries: journalCount,
    alertsTotal,
    alertsUnread,
  };

  return {
    generatedAt: now.toISOString(),
    assumptions: {
      grossMarginPct,
      note: "MRR/NRR/GRR/cohort figures are estimates derived from current subscriber state (no subscription-history table). Marketing/CAC metrics excluded by design.",
      cashConfigured: cashRunwayMonths != null,
    },
    pulse: {
      mrr: round(mrr),
      arr: round(arr),
      arpa: round(arpa),
      payingAccounts,
      compAccounts: compCount,
      newMrr30d: round(newMrr),
      newAccounts30d,
      momGrowthPct: round(momGrowthPct, 1),
    },
    retention: {
      logoChurnRate: round(logoChurnRate * 100, 1),
      revenueChurnRate: round(revenueChurnRate * 100, 1),
      nrrEstPct: round(nrr * 100, 1),
      grrEstPct: round(grr * 100, 1),
      churnedAccounts30d,
      churnedMrr30d: round(churnedMrr),
    },
    board: {
      arr: round(arr),
      netNewArr: round(netNewArr),
      nrrEstPct: round(nrr * 100, 1),
      grrEstPct: round(grr * 100, 1),
      grossMarginPct,
      ruleOf40,
      logoChurnPct: round(logoChurnRate * 100, 1),
      burnMultiple,
      cashRunwayMonths,
    },
    byTier,
    subscriptionMix,
    mrrByCountry,
    mrrTrend,
    waterfall,
    cohorts,
    atRisk,
    product,
  };
}
