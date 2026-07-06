/** API and app URLs — override via EXPO_PUBLIC_* in EAS or .env */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8001/api";

export const WEB_BASE =
  process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, "") || "http://127.0.0.1:5280";

export const LEGAL = {
  privacy: `${WEB_BASE}/?page=privacy`,
  terms: `${WEB_BASE}/?page=terms`,
  subscribe: `${WEB_BASE}/`,
} as const;
