import { z } from "zod";
import { prisma } from "@motivefx/database";
import { badRequest, json, serverError } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms." }) }),
  acceptPrivacy: z.literal(true, { errorMap: () => ({ message: "You must accept the privacy policy." }) }),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest(parsed.error.errors[0]?.message ?? "Invalid input.");
    }

    const email = parsed.data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) {
      return badRequest("An account with this email already exists. Sign in instead.");
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const now = new Date();

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            termsAcceptedAt: now,
            privacyAcceptedAt: now,
          },
        })
      : await prisma.user.create({
          data: {
            email,
            passwordHash,
            termsAcceptedAt: now,
            privacyAcceptedAt: now,
          },
        });

    await createSession({ id: user.id, email: user.email });
    return json({ user: { id: user.id, email: user.email }, redirectTo: "/app" });
  } catch (error) {
    console.error("[auth/register]", error);
    if (error instanceof Error && error.message.includes("AUTH_SECRET")) {
      return serverError("Auth is not configured. Set AUTH_SECRET in environment variables.");
    }
    return serverError("Could not create account. Try again.");
  }
}
