import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { prisma } from "@motivefx/database";
import { recordAudit } from "@/lib/ops/audit";
import { userHasActiveSubscription, subscriptionStatusLabel } from "@/lib/subscription-access";
import { formatAccessExpiry } from "@/lib/comp-access";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const { id } = await ctx.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        intelligenceTier: true,
        selectedMarkets: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        billingProvider: true,
        accessExpiresAt: true,
        disabledAt: true,
        createdAt: true,
        updatedAt: true,
        lastSeenAt: true,
        signupCountry: true,
        acquisitionChannel: true,
      },
    });
    if (!user) return json({ error: "Not found" }, 404);

    const [usage30d, alerts, portfolios, feedback] = await Promise.all([
      prisma.usageEvent
        .count({
          where: {
            userId: id,
            createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
          },
        })
        .catch(() => 0),
      prisma.intelAlert
        .findMany({
          where: { userId: id },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            module: true,
            symbol: true,
            title: true,
            seen: true,
            createdAt: true,
            confidence: true,
          },
        })
        .catch(() => []),
      prisma.userPortfolio
        .count({ where: { userId: id } })
        .catch(() => 0),
      prisma.productFeedback
        .findMany({
          where: { userId: id },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, message: true, createdAt: true, kind: true },
        })
        .catch(() => []),
    ]);

    const daysSinceActive = user.lastSeenAt
      ? Math.floor((Date.now() - user.lastSeenAt.getTime()) / 86400000)
      : null;

    let health: "healthy" | "at_risk" | "churning" | "unknown" = "unknown";
    if (user.disabledAt) health = "churning";
    else if (daysSinceActive == null) health = "unknown";
    else if (daysSinceActive <= 3 && usage30d > 5) health = "healthy";
    else if (daysSinceActive <= 14) health = "healthy";
    else if (daysSinceActive <= 30) health = "at_risk";
    else health = "churning";

    recordAudit({
      actorId: auth.session.id,
      actorEmail: auth.session.email,
      action: "ops.user.viewed",
      capability: "view_users",
      targetType: "user",
      targetId: id,
      result: "success",
    });

    return json({
      generatedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        tier: user.intelligenceTier,
        markets: user.selectedMarkets,
        subscriptionStatus: user.subscriptionStatus,
        statusLabel: user.stripeSubscriptionId
          ? "Stripe"
          : subscriptionStatusLabel(user.subscriptionStatus),
        accessExpiresAt: user.accessExpiresAt?.toISOString() ?? null,
        accessLabel: user.stripeSubscriptionId
          ? "Paid (Stripe)"
          : formatAccessExpiry(user.accessExpiresAt),
        disabled: Boolean(user.disabledAt),
        hasSubscription: userHasActiveSubscription(user),
        hasStripe: Boolean(user.stripeCustomerId),
        billingProvider: user.billingProvider,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
        country: user.signupCountry,
        acquisition: user.acquisitionChannel,
      },
      health: {
        score: health,
        usageEvents30d: usage30d,
        daysSinceActive,
        portfolios,
        trend: daysSinceActive != null && daysSinceActive <= 7 ? "up" : "flat",
      },
      alerts: alerts.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
      feedback: feedback.map((f) => ({
        id: f.id,
        message: f.message,
        kind: f.kind,
        createdAt: f.createdAt.toISOString(),
      })),
      support: {
        canImpersonate: true,
        defaultMode: "VIEW_AS_USER",
      },
    });
  } catch (error) {
    console.error("[admin/user-360]", error);
    return serverError("Could not load user 360");
  }
}
