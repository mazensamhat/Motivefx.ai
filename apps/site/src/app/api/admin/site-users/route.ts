import bcrypt from "bcryptjs";
import { prisma } from "@motivefx/database";
import { requireAdmin } from "@/lib/admin";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import { formatAccessExpiry } from "@/lib/comp-access";
import { subscriptionStatusLabel, userHasActiveSubscription } from "@/lib/subscription-access";
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 200);

    const users = await prisma.user.findMany({
      where: q ? { email: { contains: q } } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        email: true,
        intelligenceTier: true,
        selectedMarkets: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        accessExpiresAt: true,
        disabledAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        tier: u.intelligenceTier,
        markets: u.selectedMarkets,
        subscriptionStatus: u.subscriptionStatus,
        accessExpiresAt: u.accessExpiresAt?.toISOString() ?? null,
        accessLabel: u.stripeSubscriptionId
          ? "Paid (Stripe)"
          : u.subscriptionStatus === "comp" || u.subscriptionStatus === "active"
            ? formatAccessExpiry(u.accessExpiresAt)
            : "—",
        disabled: Boolean(u.disabledAt),
        hasStripe: Boolean(u.stripeCustomerId),
        hasSubscription: userHasActiveSubscription(u),
        hasStripeSubscription: Boolean(u.stripeSubscriptionId),
        statusLabel: u.stripeSubscriptionId ? "Stripe" : subscriptionStatusLabel(u.subscriptionStatus),
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[admin/site-users]", error);
    return serverError("Could not load users.");
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const body = (await request.json()) as { email?: string; password?: string; tier?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const tier = body.tier?.trim() || "lite";

    if (!email || !password) {
      return badRequest("Email and password are required.");
    }
    if (password.length < 8) {
      return badRequest("Password must be at least 8 characters.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash, intelligenceTier: tier },
      update: { passwordHash, intelligenceTier: tier },
      select: { id: true, email: true, intelligenceTier: true, createdAt: true },
    });

    return json({ ok: true, user: { ...user, createdAt: user.createdAt.toISOString() } });
  } catch (error) {
    console.error("[admin/site-users POST]", error);
    return serverError("Could not create user.");
  }
}
