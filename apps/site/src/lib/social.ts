/**
 * Public social profile URLs for MotiveFX marketing / Play Store.
 *
 * MotiveFX-specific Instagram / Facebook / LinkedIn pages are not live yet.
 * Defaults are empty — Follow links are hidden until SOCIAL_*_URL env vars are set.
 * Do not fall back to MotiveLife profiles.
 *
 * After creating MotiveFX accounts, set on Vercel (Production + Preview):
 *   SOCIAL_INSTAGRAM_URL=https://www.instagram.com/<motivefx-handle>/
 *   SOCIAL_FACEBOOK_URL=https://www.facebook.com/<motivefx-page>
 *   SOCIAL_LINKEDIN_URL=https://www.linkedin.com/company/<motivefx>
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

function resolveUrl(id: SocialPlatformId): string | null {
  const fromEnv =
    typeof process !== "undefined" ? process.env[ENV_KEYS[id]]?.trim() : undefined;
  if (!fromEnv) return null;
  try {
    const u = new URL(fromEnv);
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

/** Only platforms with a configured HTTPS URL — empty until SOCIAL_* env is set. */
export const SOCIAL_LINKS: SocialLink[] = (["instagram", "facebook", "linkedin"] as const)
  .map((id) => {
    const href = resolveUrl(id);
    return href ? { id, label: LABELS[id], href } : null;
  })
  .filter((x): x is SocialLink => Boolean(x));

/** Absolute URLs for Play Console when configured; otherwise empty strings. */
export const STORE_SOCIAL_URLS = {
  instagram: resolveUrl("instagram") ?? "",
  facebook: resolveUrl("facebook") ?? "",
  linkedin: resolveUrl("linkedin") ?? "",
} as const;

export function hasConfiguredSocialLinks(): boolean {
  return SOCIAL_LINKS.length > 0;
}
