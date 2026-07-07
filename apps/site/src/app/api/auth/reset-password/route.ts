import { z } from "zod";
import { prisma } from "@motivefx/database";
import { badRequest, json, serverError } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import {
  clearPasswordResetTokens,
  findValidPasswordResetUserId,
} from "@/lib/password-reset";
import { createSession } from "@/lib/session";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Password must be at least 8 characters.");

    const userId = await findValidPasswordResetUserId(parsed.data.token);
    if (!userId) {
      return badRequest("This reset link is invalid or has expired. Request a new one.");
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
      select: { id: true, email: true },
    });

    await clearPasswordResetTokens(userId);
    await createSession({ id: user.id, email: user.email });

    return json({ message: "Password updated.", redirectTo: "/app" });
  } catch (error) {
    console.error("[auth/reset-password]", error);
    return serverError("Could not reset password.");
  }
}
