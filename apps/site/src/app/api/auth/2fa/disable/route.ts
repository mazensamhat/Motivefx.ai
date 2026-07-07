import { z } from "zod";
import { prisma } from "@motivefx/database";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";
import { verifyPassword } from "@/lib/password";
import { verifyTotpCode } from "@/lib/totp";
import { getSession } from "@/lib/session";

const schema = z.object({
  code: z.string().min(6).max(8),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Enter your password and authentication code.");

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, passwordHash: true, totpSecret: true, totpEnabled: true },
    });
    if (!user?.totpEnabled || !user.totpSecret) {
      return badRequest("Two-factor authentication is not enabled.");
    }
    if (!user.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return unauthorized("Invalid password.");
    }
    if (!verifyTotpCode(user.totpSecret, parsed.data.code)) {
      return badRequest("Invalid authentication code.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabled: false },
    });

    return json({ ok: true, totpEnabled: false });
  } catch (error) {
    console.error("[auth/2fa/disable]", error);
    return serverError("Could not disable two-factor authentication.");
  }
}
