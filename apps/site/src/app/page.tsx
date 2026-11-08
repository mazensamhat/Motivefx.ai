import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";
import { JsonLdScript } from "@/components/seo/json-ld";
import { LANDING_FAQS } from "@/content/faq/items";
import { faqJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site-config";

const title = "MotiveFX.AI — Predictive Market Intelligence";

export const metadata: Metadata = {
  title: { absolute: title },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description: SITE.description,
    url: "/",
    siteName: SITE.name,
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: SITE.description,
    images: ["/opengraph-image"],
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLdScript data={faqJsonLd(LANDING_FAQS)} />
      <LandingPage />
    </>
  );
}
