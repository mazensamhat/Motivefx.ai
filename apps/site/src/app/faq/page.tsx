import { FaqHubContent } from "@/components/content/faq-hub";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { FAQ_ITEMS } from "@/content/faq/items";
import { JsonLdScript } from "@/components/seo/json-ld";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "FAQ",
  description: "Frequently asked questions about MotiveFX AI market intelligence, Motive Signal, data sources, and pricing.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <MarketingShell>
      <JsonLdScript data={faqJsonLd(FAQ_ITEMS)} />
      <FaqHubContent />
    </MarketingShell>
  );
}
