import { z } from "zod";
import { prisma } from "@motivefx/database";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import { verifyPassword } from "@/lib/password";
import { clearPasswordResetTokens } from "@/lib/password-reset";
import { destroySession, getSession } from "@/lib/session";
import { invalidateUserCache } from "@/lib/load-user";
import { getActiveImpersonation } from "@/lib/ops/impersonation";

const schema = z.object({
  password: z.string().min(1, "Password is required."),
  confirmation: z
    .string()
    .refine((v) => v.trim().toUpperCase() === "DELETE", {
      message: 'Type DELETE to confirm account deletion.',
    }),
});

/**
 * Permanently delete the signed-in user's account and personal app data.
 * Required for Google Play account-deletion policy (in-app + web URL).
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    if (await getActiveImpersonation(session.id)) {
      return forbidden("Account deletion is blocked while impersonating.");
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest(parsed.error.errors[0]?.message ?? "Invalid input.");
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return unauthorized("Account not found.");
    if (!user.passwordHash) return badRequest("No password set on this account.");

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) return unauthorized("Password is incorrect.");

    await clearPasswordResetTokens(user.id);
    await prisma.user.delete({ where: { id: user.id } });
    invalidateUserCache(user.id);
    await destroySession();

    return json({
      ok: true,
      message: "Account deleted. Most personal data is removed within 30 days.",
    });
  } catch (error) {
    console.error("[auth/delete-account]", error);
    return serverError("Could not delete account.");
  }
}
