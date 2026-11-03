export const SOCIAL_METRICS = ["followers", "impressions", "profileViews", "linkClicks", "engagementRate", "postsCount"] as const;
export type SocialMetric = typeof SOCIAL_METRICS[number];

export function measuredCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function observedMetrics<T extends Record<SocialMetric, number>>(snapshot: T & { rawJson?: string | null }) {
  let available: unknown;
  try { available = JSON.parse(snapshot.rawJson ?? "{}").availableMetrics; } catch { /* Legacy rows lack observation provenance. */ }
  // Required legacy numeric columns default to zero. A zero is an observation
  // only when its source explicitly says that the metric was measured.
  const keys = new Set(Array.isArray(available) ? available : []);
  return Object.fromEntries(SOCIAL_METRICS.map(key => [key, keys.has(key) ? snapshot[key] : null])) as Record<SocialMetric, number | null>;
}

export function metaProfileObservation(platform: string, accountId: string, value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Provider returned no account data");
  const profile = value as Record<string, unknown>;
  if (profile.id !== accountId) throw new Error("Provider account did not match the connected channel");
  const followers = measuredCount(profile.followers_count);
  const postsCount = platform === "instagram" ? measuredCount(profile.media_count) : null;
  if (followers == null && postsCount == null) throw new Error("Provider did not return any supported measurements");
  return { followers, postsCount };
}
