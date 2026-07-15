const CHANNEL_KEY = "motivefx_channel";

const VALID_CHANNELS = new Set([
  "instagram",
  "tiktok",
  "facebook",
  "website",
  "youtube",
  "x",
  "twitter",
  "referral",
  "other",
]);

/** Capture ?utm_source= or ?ref= on first visit for attribution. */
export function captureAcquisitionChannel(): string | null {
  try {
    const existing = localStorage.getItem(CHANNEL_KEY);
    if (existing) return existing;

    const params = new URLSearchParams(window.location.search);
    const raw =
      params.get("utm_source") ||
      params.get("ref") ||
      params.get("channel") ||
      null;
    if (!raw) return null;

    const normalized = raw.toLowerCase().replace(/^@/, "");
    const channel = normalized === "twitter" ? "x" : normalized;
    if (VALID_CHANNELS.has(channel)) {
      localStorage.setItem(CHANNEL_KEY, channel);
      return channel;
    }
    localStorage.setItem(CHANNEL_KEY, "other");
    return "other";
  } catch {
    return null;
  }
}

export function getAcquisitionChannel(): string | null {
  try {
    return localStorage.getItem(CHANNEL_KEY);
  } catch {
    return null;
  }
}

/** Preferred short-link slugs for bio URLs — matches backend /go/{slug}. */
export const SHORT_LINK_SLUGS: Record<string, string> = {
  instagram: "ig",
  tiktok: "tt",
  facebook: "fb",
  youtube: "yt",
  x: "x",
  website: "web",
  referral: "ref",
};

export function shortLinkForChannel(channelId: string): string {
  const slug = SHORT_LINK_SLUGS[channelId] ?? channelId;
  return `${window.location.origin}/go/${slug}`;
}

/** Capture UTM if present, then return stored channel (first-touch). */
export function resolveAcquisitionChannel(): string | null {
  captureAcquisitionChannel();
  return getAcquisitionChannel();
}

export const ACQUISITION_CHANNELS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
  { id: "website", label: "Website / Google" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X / Twitter" },
  { id: "referral", label: "Friend referral" },
  { id: "other", label: "Other" },
];

/**
 * Optional demographics for future Account settings only — never used in onboarding.
 * Prefer not to say is the safe default (App Store 5.1.1(v)).
 */
export const SEX_OPTIONS = [
  { id: "prefer_not_to_say", label: "Prefer not to say" },
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "non-binary", label: "Non-binary" },
];

export const GENDER_OPTIONS = [
  { id: "prefer_not_to_say", label: "Prefer not to say" },
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
  { id: "non-binary", label: "Non-binary" },
];
