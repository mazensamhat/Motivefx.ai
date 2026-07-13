/**
 * Public social profile URLs for MotiveFX marketing / Play Store.
 *
 * Defaults are MotiveFX-owned profiles. Override via env on Vercel if needed:
 *   SOCIAL_INSTAGRAM_URL=
 *   SOCIAL_FACEBOOK_URL=
 *   SOCIAL_LINKEDIN_URL=
 *
 * See docs/PLAY_STORE_LISTING.md for store listing instructions.
 */
export type SocialPlatformId = "instagram" | "facebook" | "linkedin";

export type SocialLink = {
  id: SocialPlatformId;
  label: string;
  href: string;
};

const ENV_KEYS: Record<SocialPlatformId, string> = {
  instagram: "SOCIAL_INSTAGRAM_URL",
  facebook: "SOCIAL_FACEBOOK_URL",
  linkedin: "SOCIAL_LINKEDIN_URL",
};

/** Canonical MotiveFX profiles — used when SOCIAL_* env is unset. */
const DEFAULT_URLS: Record<SocialPlatformId, string> = {
  instagram: "https://www.instagram.com/motivefx.ai/",
  facebook: "https://www.facebook.com/profile.php?id=61591532050605",
  linkedin: "https://www.linkedin.com/company/motivefx-ai/",
};

function resolveUrl(id: SocialPlatformId): string | null {
  const fromEnv =
    typeof process !== "undefined" ? process.env[ENV_KEYS[id]]?.trim() : undefined;
  const raw = fromEnv || DEFAULT_URLS[id];
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

const LABELS: Record<SocialPlatformId, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

/** Platforms with a resolved HTTPS URL (defaults or SOCIAL_* env override). */
export const SOCIAL_LINKS: SocialLink[] = (["instagram", "facebook", "linkedin"] as const)
  .map((id) => {
    const href = resolveUrl(id);
    return href ? { id, label: LABELS[id], href } : null;
  })
  .filter((x): x is SocialLink => Boolean(x));

/** Absolute URLs for Play Console / store listings. */
export const STORE_SOCIAL_URLS = {
  instagram: resolveUrl("instagram") ?? "",
  facebook: resolveUrl("facebook") ?? "",
  linkedin: resolveUrl("linkedin") ?? "",
} as const;

export function hasConfiguredSocialLinks(): boolean {
  return SOCIAL_LINKS.length > 0;
}
