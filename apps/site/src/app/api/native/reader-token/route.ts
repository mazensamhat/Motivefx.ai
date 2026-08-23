import { NextResponse } from "next/server";
import {
  issueNativeReaderToken,
  nativeReaderSecretConfigured,
} from "@/lib/terminal/native-reader-token";

export const dynamic = "force-dynamic";

/**
 * Issue a short-lived Native Reader Token for the App Store / Play shell.
 * Bound to platform asserted by the client; production should pair with App Attest later.
 */
export async function POST(request: Request) {
  if (!nativeReaderSecretConfigured() && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "NATIVE_READER_TOKEN_SECRET (or JWT_SECRET_KEY) not configured" },
      { status: 503 }
    );
  }

  let body: { platform?: string; channel?: string; appVersion?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const platform = body.platform === "android" ? "android" : "ios";
  const channel =
    body.channel === "play_store"
      ? "play_store"
      : platform === "android"
        ? "play_store"
        : "app_store";
  const appVersion = String(body.appVersion ?? "1.0.0").slice(0, 32);

  /* Light abuse control: require MotiveFXNative UA or explicit X-MotiveFX-Shell header */
  const ua = request.headers.get("user-agent") ?? "";
  const shell = request.headers.get("x-motivefx-shell") ?? "";
  const looksNative =
    /MotiveFXNative/i.test(ua) || shell === "ios" || shell === "android";
  if (!looksNative && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Native shell required" }, { status: 403 });
  }

  const issued = await issueNativeReaderToken({
    platform,
    channel,
    appVersion,
  });

  return NextResponse.json({
    token: issued.token,
    expiresAt: issued.expiresAt,
    expiresInSec: issued.expiresInSec,
    header: "X-MotiveFX-Native-Reader",
  });
}
