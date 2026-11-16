import { confirmEmailVerification, validVerificationToken, emailVerificationEnabled } from "@/lib/notifications/onboarding";
export const dynamic = "force-dynamic";
const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; form-action 'self'; frame-ancestors 'none'" };
export async function GET(request: Request) {
  if (!emailVerificationEnabled()) return new Response("Email verification is not active yet.", { status: 503 });
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!validVerificationToken(token)) return new Response("Invalid verification link.", { status: 400 });
  // A mail scanner's GET cannot verify an address or grant email consent.
  return new Response(`<!doctype html><html lang="en"><head><title>Confirm MotiveFX email</title></head><body><h1>Confirm your email address</h1><p>Continue only if you requested this verification or Motive Daily subscription.</p><form method="post"><input type="hidden" name="token" value="${token}"><button type="submit">Confirm email address</button></form></body></html>`, { headers });
}
export async function POST(request: Request) {
  const body = request.headers.get("content-type")?.includes("application/json") ? await request.json().catch(() => null) : Object.fromEntries(await request.formData().catch(() => new FormData()));
  const token = typeof body?.token === "string" ? body.token : "";
  try {
    const result = await confirmEmailVerification(token);
    const messages = { verified: "Your email address is verified. No daily email subscription was added.", subscribed: "Your email address is verified and Motive Daily is enabled. You can unsubscribe at any time.", verified_without_subscription: "Your email address is verified. Daily email remains off because current consent, delivery or plan requirements are not met.", invalid: "This link is invalid, expired or already used. Request a new link in Account settings.", inactive: "Email verification is not active yet." };
    const ok = ["verified", "subscribed", "verified_without_subscription"].includes(result.state);
    return new Response(`<!doctype html><html lang="en"><head><title>MotiveFX email confirmation</title></head><body><h1>Email confirmation</h1><p>${messages[result.state]}</p><a href="/app/settings">Account settings</a></body></html>`, { status: ok ? 200 : result.state === "inactive" ? 503 : 400, headers });
  } catch { return new Response("Confirmation could not be saved. Please retry.", { status: 503, headers }); }
}
