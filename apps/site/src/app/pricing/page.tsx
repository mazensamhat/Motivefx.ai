import { PricingCheckout } from "@/components/marketing/pricing-checkout";
import { JsonLdScript } from "@/components/seo/json-ld";
import { PRICING_FAQS } from "@/content/faq/items";
import { faqJsonLd, pageMetadata, pricingOffersJsonLd } from "@/lib/seo";
import { formatTierPrice, tierById } from "@/lib/tiers";

export const metadata = pageMetadata({
  title: "Pricing",
  description: `MotiveFX plans from ${formatTierPrice(tierById("lite"))} (Lite) and ${formatTierPrice(tierById("pro"))} (Pro). Ultra ${formatTierPrice(tierById("ultra"))}, Ultra+ ${formatTierPrice(tierById("ultra_plus"))}, Elite ${formatTierPrice(tierById("elite"))}. Paid subscriptions, no free trial.`,
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <JsonLdScript data={[pricingOffersJsonLd(), faqJsonLd(PRICING_FAQS)]} />
      <PricingCheckout />
    </>
  );
}
