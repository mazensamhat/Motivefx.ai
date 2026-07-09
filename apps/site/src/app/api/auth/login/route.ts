import { z } from "zod";
import { prisma } from "@motivefx/database";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";
import { verifyPassword } from "@/lib/password";
import { createPending2faToken } from "@/lib/pending-2fa";
import { createSession, mobileSessionPayload } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Invalid email or password.");

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return unauthorized("Invalid email or password.");
    if (user.disabledAt) {
      return unauthorized("This account is disabled. Contact support.");
    }
    if (!user.passwordHash) {
      return unauthorized(
        "No password on this account yet. Use Create account on /register or complete checkout first."
      );
    }

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) return unauthorized("Invalid email or password.");

    if (user.totpEnabled && user.totpSecret) {
      const pendingToken = await createPending2faToken(user.id);
      return json({
        requires2fa: true,
        pendingToken,
        userId: user.id,
      });
    }

    const accessToken = await createSession({ id: user.id, email: user.email });
    return json(mobileSessionPayload({ id: user.id, email: user.email }, accessToken));
  } catch (error) {
    console.error("[auth/login]", error);
    if (error instanceof Error && error.message.includes("AUTH_SECRET")) {
      return serverError("Auth is not configured. Set AUTH_SECRET in environment variables.");
    }
    return serverError("Could not sign in. Try again.");
  }
}
