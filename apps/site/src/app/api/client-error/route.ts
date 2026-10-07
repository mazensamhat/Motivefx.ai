import { createHash } from "node:crypto";
import { persistTelemetry } from "@/lib/ops/durable";
import { buildTelemetryEnvelope } from "@/lib/ops/telemetry-envelope";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

type ClientErrorBody = {
  platform?: unknown;
  surface?: unknown;
  errorName?: unknown;
  message?: unknown;
  route?: unknown;
  appVersion?: unknown;
};

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const buckets = new Map<string, { startedAt: number; count: number }>();

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeLabel(value: unknown, fallback: string, max = 80): string {
  const raw = cleanText(value, max).replace(/[^A-Za-z0-9._-]+/g, "_");
  return raw || fallback;
}

function safePlatform(value: unknown): string {
  const raw = cleanText(value, 24).toLowerCase();
  return ["web", "ios", "android", "native"].includes(raw) ? raw : "unknown";
}

function safeRoute(value: unknown): string {
  const raw = cleanText(value, 160);
  if (!raw) return "/";
  let pathname = "/";
  try {
    pathname = new URL(raw, "https://motivefx.invalid").pathname || "/";
  } catch {
    pathname = raw.split("?")[0]!.split("#")[0]! || "/";
  }
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (/^\d{4,}$/.test(segment)) return ":id";
      if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return ":id";
      if (segment.length > 32 && /^[A-Za-z0-9_-]+$/.test(segment)) return ":id";
      return segment.slice(0, 48);
    });
  return ("/" + segments.join("/")).slice(0, 160) || "/";
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "anonymous";
}

function allowed(request: Request): boolean {
  const key = clientKey(request);
  const now = Date.now();
  if (buckets.size > 2000) {
    for (const [candidate, bucket] of buckets) {
      if (now - bucket.startedAt >= WINDOW_MS) buckets.delete(candidate);
    }
    if (buckets.size > 2000) buckets.clear();
  }
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_PER_WINDOW;
}

function messageSignature(message: string): string {
  const normalized = message
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/\b\d{4,}\b/g, "[n]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
  return createHash("sha256").update(normalized || "unknown").digest("hex").slice(0, 20);
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 8192) {
    return Response.json({ ok: false, error: "Payload too large." }, { status: 413 });
  }

  if (!allowed(request)) {
    return Response.json({ ok: true, accepted: false, reason: "rate_limited" }, { status: 202 });
  }

  const body = (await request.json().catch(() => ({}))) as ClientErrorBody;
  const platform = safePlatform(body.platform);
  const errorName = safeLabel(body.errorName, "Error");
  const surface = safeLabel(body.surface, "unknown");
  const route = safeRoute(body.route);
  const appVersion = safeLabel(body.appVersion, "", 40) || undefined;
  const signature = messageSignature(cleanText(body.message, 1000));

  const envelope = buildTelemetryEnvelope({
    eventName: "client.error",
    product: "motivefx",
    platform,
    appVersion,
    status: "error",
    errorCode: "CLIENT_RUNTIME_ERROR",
    sourceClass: "user",
    privacyClass: "internal",
    metadata: {
      errorName,
      surface,
      route,
      messageSignature: signature,
    },
  });

  await persistTelemetry(envelope);
  return Response.json({ ok: true, accepted: true }, { status: 202 });
}
