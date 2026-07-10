/**
 * Public social profile URLs for MotiveFX marketing / Play Store.
 *
 * MotiveFX-specific Instagram / Facebook / LinkedIn pages are not yet published
 * in-repo (see motivelife.ai docs/AUTO_POST_SETUP.md Part E placeholders).
 * Defaults use the live Motive brand accounts documented for MotiveLife.
 * Override via SOCIAL_*_URL env vars when MotiveFX pages go live.
 */
export type SocialPlatformId = "instagram" | "facebook" | "linkedin";

export type SocialLink = {
  id: SocialPlatformId;
  label: string;
  href: string;
};

const DEFAULTS: Record<SocialPlatformId, string> = {
  // Confirmed live Motive brand profiles (motivelife.ai/docs/AUTO_POST_SETUP.md)
  instagram: "https://www.instagram.com/motivelife.ai/",
  facebook: "https://www.facebook.com/profile.php?id=61591637157893",
  linkedin: "https://www.linkedin.com/company/motivelife-ai",
};

const ENV_KEYS: Record<SocialPlatformId, string> = {
  instagram: "SOCIAL_INSTAGRAM_URL",
  facebook: "SOCIAL_FACEBOOK_URL",
  linkedin: "SOCIAL_LINKEDIN_URL",
};

function resolveUrl(id: SocialPlatformId): string {
  const fromEnv =
    typeof process !== "undefined" ? process.env[ENV_KEYS[id]]?.trim() : undefined;
  return fromEnv || DEFAULTS[id];
}

export const SOCIAL_LINKS: SocialLink[] = [
  { id: "instagram", label: "Instagram", href: resolveUrl("instagram") },
  { id: "facebook", label: "Facebook", href: resolveUrl("facebook") },
  { id: "linkedin", label: "LinkedIn", href: resolveUrl("linkedin") },
];

/** Canonical URLs for Play Console / store listing docs (always absolute). */
export const STORE_SOCIAL_URLS = {
  instagram: DEFAULTS.instagram,
  facebook: DEFAULTS.facebook,
  linkedin: DEFAULTS.linkedin,
} as const;
