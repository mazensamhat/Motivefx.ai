import { z } from "zod";
import { prisma } from "@motivefx/database";
import { badRequest, json, serverError } from "@/lib/api";
import { findUserSafe } from "@/lib/load-user";
import { hashPassword } from "@/lib/password";
import { createSession, mobileSessionPayload } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms." }) }),
  acceptPrivacy: z.literal(true, { errorMap: () => ({ message: "You must accept the privacy policy." }) }),
});

function normalizeRegisterBody(body: Record<string, unknown>) {
  return {
    email: body.email,
    password: body.password,
    acceptTerms: body.acceptTerms ?? body.accept_terms,
    acceptPrivacy: body.acceptPrivacy ?? body.accept_privacy,
  };
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return badRequest("Invalid request body.");
    }

    const parsed = schema.safeParse(normalizeRegisterBody(raw as Record<string, unknown>));
    if (!parsed.success) {
      return badRequest(parsed.error.errors[0]?.message ?? "Invalid input.");
    }

    const email = parsed.data.email.trim().toLowerCase();
    const existing = await findUserSafe({ email });

    // Never let registration claim an already-created user record. Some MotiveFX
    // flows can create a user before a password exists; assigning a password here
    // would let anyone who knows that email take over the account. Existing users
    // must prove mailbox ownership through the forgot/reset-password flow instead.
    if (existing) {
      return badRequest(
        "An account with this email already exists. Sign in or reset your password."
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const now = new Date();
    const country = request.headers.get("x-vercel-ip-country")?.trim().toUpperCase() || null;
    const city = request.headers.get("x-vercel-ip-city")?.trim() || null;
    const region = request.headers.get("x-vercel-ip-country-region")?.trim() || null;
    const latRaw = request.headers.get("x-vercel-ip-latitude");
    const lngRaw = request.headers.get("x-vercel-ip-longitude");
    const signupLatitude = latRaw ? Number(latRaw) : null;
    const signupLongitude = lngRaw ? Number(lngRaw) : null;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        signupCountry: country,
        signupCity: city,
        signupRegion: region,
        signupLatitude: Number.isFinite(signupLatitude) ? signupLatitude : null,
        signupLongitude: Number.isFinite(signupLongitude) ? signupLongitude : null,
      },
      select: { id: true, email: true },
    });

    const accessToken = await createSession({ id: user.id, email: user.email });
    return json(mobileSessionPayload({ id: user.id, email: user.email }, accessToken));
  } catch (error) {
    // A concurrent registration can win after the pre-check. Return the same safe
    // response instead of leaking a Prisma P2002 as a 500.
    if (isUniqueConstraintError(error)) {
      return badRequest(
        "An account with this email already exists. Sign in or reset your password."
      );
    }

    console.error("[auth/register]", error);
    if (error instanceof Error && error.message.includes("AUTH_SECRET")) {
      return serverError("Auth is not configured. Set AUTH_SECRET in environment variables.");
    }
    return serverError("Could not create account. Try again.");
  }
}
