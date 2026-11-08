import type { Metadata } from "next";
import { MOTIVE_CORP } from "./motive-family";
import { SITE } from "./site-config";
import { SOCIAL_LINKS } from "./social";
import {
  ANDROID_PACKAGE_ID,
  IOS_APP_STORE_ID,
  IOS_APP_STORE_URL,
  IOS_APP_STORE_URL_GLOBAL,
  PLAY_STORE_URL,
} from "./store-links";
import { formatTierPrice, PRICING_TIERS } from "./tiers";

export function pageMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  const url = `${SITE.url}${path}`;
  const image = {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: `${SITE.name} — ${SITE.tagline}`,
  };
  return {
    title: `${title} | ${SITE.name}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      type,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}

/** Auth, account, and app shells should not compete with public landing pages. */
export function noIndexMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false },
  };
}

export type BreadcrumbItem = { name: string; href: string };

export type JsonLd = Record<string, unknown>;

export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE.url}${item.href}`,
    })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function articleJsonLd({
  title,
  description,
  path,
  author = "MotiveFX Research Team",
}: {
  title: string;
  description: string;
  path: string;
  author?: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    author: { "@type": "Organization", name: author },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
      logo: { "@type": "ImageObject", url: `${SITE.url}/brand/motivefx-logo.png` },
    },
    mainEntityOfPage: `${SITE.url}${path}`,
  };
}

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    email: SITE.email,
    logo: `${SITE.url}/brand/motivefx-logo.png`,
    parentOrganization: {
      "@type": "Organization",
      name: MOTIVE_CORP.name,
      url: MOTIVE_CORP.href,
    },
    sameAs: [
      PLAY_STORE_URL,
      IOS_APP_STORE_URL,
      IOS_APP_STORE_URL_GLOBAL,
      ...SOCIAL_LINKS.map((link) => link.href),
    ],
  };
}

export function webSiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: "en",
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
  };
}

/** Public plan offers. Prices come from the same tier table the pricing page renders. */
export function pricingOffersJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "MotiveFX",
    description: SITE.description,
    brand: { "@type": "Brand", name: SITE.name },
    url: `${SITE.url}/pricing`,
    offers: PRICING_TIERS.map((tier) => ({
      "@type": "Offer",
      name: tier.name,
      description: `${tier.tagline} — ${formatTierPrice(tier)}`,
      price: tier.annualUsd ?? tier.monthlyUsd,
      priceCurrency: "USD",
      url: `${SITE.url}/pricing#${tier.id === "ultra_plus" ? "ultra-plus" : tier.id}`,
    })),
  };
}

/** Android + iOS SoftwareApplication nodes for Google / store discovery. */
export function softwareApplicationJsonLd(): JsonLd[] {
  const sharedOffer = {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  } as const;

  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "MotiveFX",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Android",
      url: PLAY_STORE_URL,
      downloadUrl: PLAY_STORE_URL,
      installUrl: PLAY_STORE_URL,
      applicationSuite: SITE.name,
      identifier: ANDROID_PACKAGE_ID,
      offers: sharedOffer,
      publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "MotiveFX.AI",
      alternateName: "MotiveFX",
      applicationCategory: "FinanceApplication",
      operatingSystem: "iOS",
      url: IOS_APP_STORE_URL,
      downloadUrl: IOS_APP_STORE_URL_GLOBAL,
      installUrl: IOS_APP_STORE_URL,
      applicationSuite: SITE.name,
      identifier: IOS_APP_STORE_ID,
      offers: sharedOffer,
      publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
      sameAs: [IOS_APP_STORE_URL, IOS_APP_STORE_URL_GLOBAL],
    },
  ];
}

/** Safari Smart App Banner content value. */
export function appleItunesAppMeta(): string {
  return `app-id=${IOS_APP_STORE_ID}, app-argument=${SITE.url}`;
}
