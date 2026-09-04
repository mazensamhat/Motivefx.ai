import { z } from "zod";
import { prisma } from "@motivefx/database";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clearPasswordResetTokens } from "@/lib/password-reset";
import { createSessionPair, getSession } from "@/lib/session";
import { getActiveImpersonation } from "@/lib/ops/impersonation";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    if (await getActiveImpersonation(session.id)) {
      return forbidden("Credential changes are blocked while impersonating.");
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? "Invalid input.");

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user?.passwordHash) return badRequest("No password set on this account.");

    const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) return unauthorized("Current password is incorrect.");

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });
    await clearPasswordResetTokens(user.id);

    // All old refresh tokens are now invalid by fingerprint. Rotate the current
    // browser session immediately so the user who changed the password stays signed in.
    await createSessionPair({ id: session.id, email: session.email });

    return json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("[auth/change-password]", error);
    return serverError("Could not update password.");
  }
}
