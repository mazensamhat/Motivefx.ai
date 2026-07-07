import { z } from "zod";
import { prisma } from "@motivefx/database";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";
import { verifyTotpCode } from "@/lib/totp";
import { getSession } from "@/lib/session";

const schema = z.object({
  code: z.string().min(6).max(8),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Enter a valid 6-digit code.");

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, totpSecret: true, totpEnabled: true },
    });
    if (!user?.totpSecret) return badRequest("Two-factor setup not started.");
    if (user.totpEnabled) return badRequest("Two-factor authentication is already enabled.");
    if (!verifyTotpCode(user.totpSecret, parsed.data.code)) {
      return badRequest("Invalid authentication code.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true },
    });

    return json({ ok: true, totpEnabled: true });
  } catch (error) {
    console.error("[auth/2fa/confirm]", error);
    return serverError("Could not enable two-factor authentication.");
  }
}
