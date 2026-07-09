/** API and app URLs — override via EXPO_PUBLIC_* in EAS or .env */
/** Production site is www.motivefxai.com (motivefx.ai is a different host and returns 404 for /api). */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") || "https://www.motivefxai.com/api";

export const WEB_BASE =
  process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, "") || "https://www.motivefxai.com";

/** Full terminal UI (matches web mobile bottom-nav design) */
export const TERMINAL_URL =
  process.env.EXPO_PUBLIC_TERMINAL_URL?.replace(/\/$/, "") || `${WEB_BASE}/terminal/`;

export const LEGAL = {
  privacy: `${WEB_BASE}/privacy`,
  terms: `${WEB_BASE}/terms`,
  subscribe: `${WEB_BASE}/pricing`,
} as const;
