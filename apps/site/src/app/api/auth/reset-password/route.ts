import { z } from "zod";
import { prisma } from "@motivefx/database";
import { badRequest, json, serverError } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import {
  clearPasswordResetTokens,
  consumePasswordResetToken,
} from "@/lib/password-reset";
import { createSession } from "@/lib/session";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest("Password must be at least 8 characters.");

    // Do the expensive hash before consuming the one-time token so a transient
    // hashing failure does not burn an otherwise valid reset link.
    const passwordHash = await hashPassword(parsed.data.password);
    const userId = await consumePasswordResetToken(parsed.data.token);
    if (!userId) {
      return badRequest("This reset link is invalid or has expired. Request a new one.");
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: { id: true, email: true },
    });

    // Normally the consumed token was the only one, but clearing by user makes
    // older links unusable if legacy data or a concurrent issuance left extras.
    await clearPasswordResetTokens(userId);
    await createSession({ id: user.id, email: user.email });

    return json({ message: "Password updated.", redirectTo: "/app" });
  } catch (error) {
    console.error("[auth/reset-password]", error);
    return serverError("Could not reset password.");
  }
}
