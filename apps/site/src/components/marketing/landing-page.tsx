import { CtaSection } from "./cta-section";
import { EcosystemSection, MobileSection } from "./ecosystem-section";
import { FeaturesSection } from "./features-section";
import { Hero } from "./hero";
import { LandingFaq } from "./landing-faq";
import { PricingPreview } from "./pricing-preview";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";
import { TrustBar } from "./trust-bar";

export function LandingPage() {
  return (
    <div className="landing-page">
      <SiteNav />
      <Hero />
      <TrustBar />
      <FeaturesSection />
      <PricingPreview />
      <EcosystemSection />
      <MobileSection />
      <LandingFaq />
      <CtaSection />
      <SiteFooter />
    </div>
  );
}
