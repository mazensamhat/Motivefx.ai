import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { StoreBadges } from "@/components/marketing/store-badges";
import { JsonLdScript } from "@/components/seo/json-ld";
import { pageMetadata, softwareApplicationJsonLd } from "@/lib/seo";
import { STORE_COPY } from "@/lib/store-links";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Download MotiveFX",
    description:
      "Download MotiveFX.AI on the App Store (iOS) and Google Play (Android). Predictive market intelligence — Motive Signal™ on the go.",
    path: "/download",
  }),
};

export default function DownloadPage() {
  return (
    <>
      <JsonLdScript data={softwareApplicationJsonLd()} />
      <SiteNav />
      <main className="section-pad">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <p className="section-kicker">Mobile apps</p>
          <h1 className="section-title">Download MotiveFX</h1>
          <p className="section-desc mt-4">{STORE_COPY.mobileBody}</p>
          <div className="mt-8 flex justify-center">
            <StoreBadges />
          </div>
          <p className="mt-8 text-sm text-white/50">
            Free informational reader on iOS. Web plans available at{" "}
            <a href="/pricing" className="text-brand-green underline-offset-2 hover:underline">
              motivefxai.com/pricing
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
