/** API and app URLs — override via EXPO_PUBLIC_* in EAS or .env */
/** Production site is www.motivefxai.com (motivefx.ai is a different host and returns 404 for /api). */
const DEFAULT_WEB = "https://www.motivefxai.com";
const DEFAULT_API = `${DEFAULT_WEB}/api`;

function envUrl(value: string | undefined, fallback: string): string {
  const trimmed = typeof value === "string" ? value.trim().replace(/\/$/, "") : "";
  return trimmed || fallback;
}

export const API_BASE = envUrl(process.env.EXPO_PUBLIC_API_URL, DEFAULT_API);

export const WEB_BASE = envUrl(process.env.EXPO_PUBLIC_WEB_URL, DEFAULT_WEB);

/** Full terminal UI (matches web mobile bottom-nav design) */
export const TERMINAL_URL = envUrl(
  process.env.EXPO_PUBLIC_TERMINAL_URL,
  `${WEB_BASE}/terminal/`
);

export const LEGAL = {
  privacy: `${WEB_BASE}/privacy`,
  terms: `${WEB_BASE}/terms`,
  subscribe: `${WEB_BASE}/pricing`,
} as const;
