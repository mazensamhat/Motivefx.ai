/**
 * Motive-Corp family — sister tools + parent company.
 * Canonical URLs match Motive Corp portfolio (`motive-corp` platforms.ts).
 */

export const MOTIVE_CORP = {
  name: "Motive Corp",
  href: "https://www.motive-corp.com",
} as const;

export type MotiveFamilyLink = {
  id: string;
  name: string;
  tagline: string;
  href: string;
  /** True when this site is the current product. */
  current?: boolean;
};

/** Full family including parent — for footers on every Motive site. */
export const MOTIVE_FAMILY_LINKS: MotiveFamilyLink[] = [
  {
    id: "corp",
    name: "Motive Corp",
    tagline: "Innovate · Connect · Empower",
    href: MOTIVE_CORP.href,
  },
  {
    id: "motivelife",
    name: "Motive Life",
    tagline: "Live better. Grow every day.",
    href: "https://www.mymotivelife.com",
  },
  {
    id: "motivepulse",
    name: "My Motive Pulse",
    tagline: "Insights. Automation. Growth.",
    href: "https://www.mymotivepulse.com",
  },
  {
    id: "motiveiq",
    name: "Motive IQ",
    tagline: "Automotive Intelligence",
    href: "https://www.motiveiqs.com/gate",
  },
  {
    id: "motivefx",
    name: "MotiveFX",
    tagline: "Trade smarter. Move faster.",
    href: "https://www.motivefxai.com",
    current: true,
  },
];

/** Sister tools only (exclude current product) — for outbound CTAs. */
export const MOTIVE_SISTER_LINKS = MOTIVE_FAMILY_LINKS.filter((l) => !l.current);
