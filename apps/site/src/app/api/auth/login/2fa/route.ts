import { z } from "zod";
import { prisma } from "@motivefx/database";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";
import { verifyPending2faToken } from "@/lib/pending-2fa";
import { verifyTotpCode } from "@/lib/totp";
import { createSession, mobileSessionPayload } from "@/lib/session";

const schema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().min(6).max(8),
});

function normalize2faBody(body: Record<string, unknown>) {
  return {
    pendingToken: body.pendingToken ?? body.pending_token,
    code: body.code,
  };
}

export async function POST(request: Request) {
  try {
    const raw = (await request.json()) as Record<string, unknown>;
    const parsed = schema.safeParse(normalize2faBody(raw));
    if (!parsed.success) return badRequest("Enter a valid authentication code.");

    let userId: string;
    try {
      userId = await verifyPending2faToken(parsed.data.pendingToken);
    } catch {
      return unauthorized("Verification expired. Sign in again.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, disabledAt: true, totpSecret: true, totpEnabled: true },
    });
    if (!user || user.disabledAt) return unauthorized("Invalid email or password.");
    if (!user.totpEnabled || !user.totpSecret) {
      return badRequest("Two-factor authentication is not enabled.");
    }
    if (!verifyTotpCode(user.totpSecret, parsed.data.code)) {
      return unauthorized("Invalid authentication code.");
    }

    const accessToken = await createSession({ id: user.id, email: user.email });
    return json(mobileSessionPayload({ id: user.id, email: user.email }, accessToken));
  } catch (error) {
    console.error("[auth/login/2fa]", error);
    if (error instanceof Error && error.message.includes("AUTH_SECRET")) {
      return serverError("Auth is not configured. Set AUTH_SECRET in environment variables.");
    }
    return serverError("Could not verify two-factor code.");
  }
}
