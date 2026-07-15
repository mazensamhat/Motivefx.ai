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

export async function POST(request: Request) {
  try {
    const raw = (await request.json()) as Record<string, unknown>;
    const parsed = schema.safeParse(normalizeRegisterBody(raw));
    if (!parsed.success) {
      return badRequest(parsed.error.errors[0]?.message ?? "Invalid input.");
    }

    const email = parsed.data.email.trim().toLowerCase();
    const existing = await findUserSafe({ email });
    if (existing?.passwordHash) {
      return badRequest("An account with this email already exists. Sign in instead.");
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

    const geoData = {
      signupCountry: country,
      signupCity: city,
      signupRegion: region,
      signupLatitude: Number.isFinite(signupLatitude) ? signupLatitude : null,
      signupLongitude: Number.isFinite(signupLongitude) ? signupLongitude : null,
    };

    const authSelect = { id: true, email: true } as const;
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            termsAcceptedAt: now,
            privacyAcceptedAt: now,
            ...(!existing.signupCountry && country ? geoData : {}),
          },
          select: authSelect,
        })
      : await prisma.user.create({
          data: {
            email,
            passwordHash,
            termsAcceptedAt: now,
            privacyAcceptedAt: now,
            ...geoData,
          },
          select: authSelect,
        });

    const accessToken = await createSession({ id: user.id, email: user.email });
    return json(mobileSessionPayload({ id: user.id, email: user.email }, accessToken));
  } catch (error) {
    console.error("[auth/register]", error);
    if (error instanceof Error && error.message.includes("AUTH_SECRET")) {
      return serverError("Auth is not configured. Set AUTH_SECRET in environment variables.");
    }
    return serverError("Could not create account. Try again.");
  }
}
