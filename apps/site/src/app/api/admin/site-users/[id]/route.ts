import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@motivefx/database";
import { isAdminEmail, requireAdmin } from "@/lib/admin";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import { computeAccessExpiresAt, type CompAccessDuration } from "@/lib/comp-access";
import { clearPasswordResetTokens } from "@/lib/password-reset";
import { syncBackendUser, invalidateBackendSession } from "@/lib/backend";
import type { PricingTierId } from "@/lib/tiers";

const tierSchema = z.enum(["lite", "pro", "ultra", "ultra_plus", "elite"]);

const patchSchema = z.object({
  intelligenceTier: tierSchema.optional(),
  grantAccessDuration: z.enum(["1_month", "2_months", "3_months", "lifetime"]).optional(),
  revokeAccess: z.boolean().optional(),
  password: z.string().min(8).optional(),
  disabled: z.boolean().optional(),
  subscriptionStatus: z.enum(["active", "paused", "cancelled"]).optional(),
  cancelAccount: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid input.");

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        stripeSubscriptionId: true,
        accessExpiresAt: true,
        intelligenceTier: true,
        subscriptionStatus: true,
      },
    });
    if (!target) return badRequest("User not found.");

    if (parsed.data.disabled === true && isAdminEmail(target.email)) {
      return badRequest("Cannot disable an admin account.");
    }

    const data: {
      intelligenceTier?: string;
      subscriptionStatus?: string;
      accessExpiresAt?: Date | null;
      disabledAt?: Date | null;
      passwordHash?: string;
      stripeSubscriptionId?: null;
      stripeCustomerId?: null;
      selectedMarkets?: string;
    } = {};

    if (parsed.data.disabled === true) data.disabledAt = new Date();
    if (parsed.data.disabled === false) data.disabledAt = null;

    if (parsed.data.password) {
      data.passwordHash = await bcrypt.hash(parsed.data.password, 12);
      await clearPasswordResetTokens(id);
    }

    if (parsed.data.grantAccessDuration) {
      const tier = parsed.data.intelligenceTier ?? (target.intelligenceTier as PricingTierId);
      data.intelligenceTier = tier;
      data.subscriptionStatus = "comp";
      data.accessExpiresAt = computeAccessExpiresAt(parsed.data.grantAccessDuration as CompAccessDuration);
      data.stripeSubscriptionId = null;
      if (tier === "elite" || tier === "ultra" || tier === "ultra_plus") {
        data.selectedMarkets = JSON.stringify([
          "stocks",
          "crypto",
          "pink_slips",
          "sports_betting",
          "prediction_markets",
        ]);
      }
    } else if (parsed.data.revokeAccess) {
      data.intelligenceTier = "lite";
      data.subscriptionStatus = "none";
      data.accessExpiresAt = null;
      data.selectedMarkets = JSON.stringify([]);
      data.stripeSubscriptionId = null;
    } else if (parsed.data.cancelAccount) {
      data.intelligenceTier = "lite";
      data.subscriptionStatus = "cancelled";
      data.accessExpiresAt = null;
      if (!target.stripeSubscriptionId) {
        data.stripeSubscriptionId = null;
      }
    } else {
      if (parsed.data.intelligenceTier) {
        if (target.stripeSubscriptionId && !parsed.data.grantAccessDuration) {
          return badRequest("Tier changes for Stripe subscribers must go through billing, or use Grant to override.");
        }
        data.intelligenceTier = parsed.data.intelligenceTier;
      }
      if (parsed.data.subscriptionStatus) {
        data.subscriptionStatus = parsed.data.subscriptionStatus;
        if (parsed.data.subscriptionStatus === "cancelled") {
          data.intelligenceTier = "lite";
          data.accessExpiresAt = null;
        }
        // Never downgrade comp → active from Enable; only explicit pause/revoke changes comp.
        if (
          parsed.data.subscriptionStatus === "active" &&
          target.subscriptionStatus === "comp"
        ) {
          delete data.subscriptionStatus;
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No changes requested.");
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        intelligenceTier: true,
        subscriptionStatus: true,
        accessExpiresAt: true,
        disabledAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    const backendSynced = await syncBackendUser(user.email).then(Boolean).catch((err) => {
      console.error("[admin/site-users PATCH] backend sync failed", err);
      return false;
    });
    invalidateBackendSession(user.email);

    return json({
      ok: true,
      backendSynced,
      user: {
        id: user.id,
        email: user.email,
        tier: user.intelligenceTier,
        subscriptionStatus: user.subscriptionStatus,
        accessExpiresAt: user.accessExpiresAt?.toISOString() ?? null,
        disabled: Boolean(user.disabledAt),
        hasStripe: Boolean(user.stripeCustomerId),
        hasSubscription: Boolean(user.stripeSubscriptionId),
      },
    });
  } catch (error) {
    console.error("[admin/site-users PATCH]", error);
    return serverError("Could not update user.");
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  const { id } = await ctx.params;
  if (!id) return badRequest("Missing user id.");

  if (auth.session.id === id) {
    return badRequest("You cannot delete your own account from the ops console.");
  }

  try {
    await prisma.user.delete({ where: { id } });
    return json({ ok: true, deleted: id });
  } catch (error) {
    console.error("[admin/site-users DELETE]", error);
    return serverError("Could not delete user.");
  }
}
