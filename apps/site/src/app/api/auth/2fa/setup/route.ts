import { prisma } from "@motivefx/database";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";
import { generateTotpSecret, totpKeyUri } from "@/lib/totp";
import { getSession } from "@/lib/session";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, totpEnabled: true },
    });
    if (!user) return unauthorized();
    if (user.totpEnabled) return badRequest("Two-factor authentication is already enabled.");

    const secret = generateTotpSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: secret, totpEnabled: false },
    });

    return json({
      secret,
      otpauthUrl: totpKeyUri(user.email, secret),
    });
  } catch (error) {
    console.error("[auth/2fa/setup]", error);
    return serverError("Could not start two-factor setup.");
  }
}
