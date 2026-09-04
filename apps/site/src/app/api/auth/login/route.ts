import { z } from "zod";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";
import { consumeAuthRateLimit, requestIp } from "@/lib/auth-rate-limit";
import { findUserSafe } from "@/lib/load-user";
import { verifyPassword } from "@/lib/password";
import { createPending2faToken } from "@/lib/pending-2fa";
import { createSessionPair, mobileSessionPayload } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid email or password.");

    const email = parsed.data.email.trim().toLowerCase();
    const ip = requestIp(request);
    const [accountAllowed, ipAllowed] = await Promise.all([
      consumeAuthRateLimit({
        scope: "login_account",
        identifier: `${email}|${ip}`,
        limit: 10,
        windowMs: 15 * 60 * 1000,
      }),
      consumeAuthRateLimit({
        scope: "login_ip",
        identifier: ip,
        limit: 40,
        windowMs: 15 * 60 * 1000,
      }),
    ]);
    if (!accountAllowed || !ipAllowed) {
      return json({ error: "Too many sign-in attempts. Try again later." }, 429);
    }

    const user = await findUserSafe({ email });
    if (!user) return unauthorized("Invalid email or password.");
    if (user.disabledAt) {
      return unauthorized("This account is disabled. Contact support.");
    }
    if (!user.passwordHash) {
      return unauthorized(
        "No password is set on this account yet. Use Forgot password to verify your email and create one."
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

    const tokens = await createSessionPair({ id: user.id, email: user.email });
    return json(
      mobileSessionPayload(
        { id: user.id, email: user.email },
        tokens.accessToken,
        tokens.refreshToken
      )
    );
  } catch (error) {
    console.error("[auth/login]", error);
    if (error instanceof Error && error.message.includes("AUTH_SECRET")) {
      return serverError("Auth is not configured. Set AUTH_SECRET in environment variables.");
    }
    return serverError("Could not sign in. Try again.");
  }
}
