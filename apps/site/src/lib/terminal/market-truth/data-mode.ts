import type { DataMode } from "./types";

const VALID: ReadonlySet<string> = new Set([
  "PRODUCTION",
  "DEMO",
  "TEST",
  "APP_REVIEW",
]);

/**
 * Resolve operating mode.
 * - Explicit MOTIVEFX_DATA_MODE wins.
 * - Vercel preview / NODE_ENV=test → TEST when unset.
 * - Otherwise PRODUCTION (fail closed on demo contamination).
 */
export function getDataMode(): DataMode {
  const raw = (process.env.MOTIVEFX_DATA_MODE ?? "").trim().toUpperCase();
  if (VALID.has(raw)) return raw as DataMode;

  if (process.env.NODE_ENV === "test") return "TEST";
  if (process.env.VERCEL_ENV === "preview") return "DEMO";

  return "PRODUCTION";
}

/** True when synthetic/demo sample feeds may be returned to clients (never into production signal). */
export function allowsDemoFeeds(mode: DataMode = getDataMode()): boolean {
  return mode === "DEMO" || mode === "TEST" || mode === "APP_REVIEW";
}

/** True when production Motive Signal must reject DEMO/SYNTHETIC. */
export function isProductionBoundary(mode: DataMode = getDataMode()): boolean {
  return mode === "PRODUCTION";
}

/**
 * Feed display mode for a request. Motive Signal scoring still uses PRODUCTION boundary
 * unless env overrides — only panel feeds may use labeled APP_REVIEW samples.
 */
export async function resolveFeedDataMode(request?: Request | null): Promise<DataMode> {
  const envMode = getDataMode();
  if (envMode !== "PRODUCTION") return envMode;
  if (!request) return "PRODUCTION";

  try {
    const { isTrustedNativeReaderRequest } = await import("../ios-reader");
    if (await isTrustedNativeReaderRequest(request)) return "APP_REVIEW";
  } catch {
    /* ignore */
  }

  const ua = request.headers.get("user-agent") ?? "";
  if (/MotiveFXNative/i.test(ua)) return "APP_REVIEW";

  const token = request.headers.get("x-motivefx-native-reader")?.trim();
  if (token) {
    const { verifyNativeReaderToken } = await import("../native-reader-token");
    const claims = await verifyNativeReaderToken(token);
    if (claims?.readerMode) return "APP_REVIEW";
  }

  return "PRODUCTION";
}
