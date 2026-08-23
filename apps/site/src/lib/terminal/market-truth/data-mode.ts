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
