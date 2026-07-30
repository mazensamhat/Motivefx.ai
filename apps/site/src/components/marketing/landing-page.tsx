import { CtaSection } from "./cta-section";
import { ConnectedMarketsSection } from "./connected-markets-section";
import { EcosystemSection, MobileSection } from "./ecosystem-section";
import { FeaturesSection } from "./features-section";
import { Hero } from "./hero";
import { LandingFaq } from "./landing-faq";
import { MorningIntelligenceSection } from "./morning-intelligence-section";
import { OpportunityRadarSection } from "./opportunity-radar-section";
import { PricingPreview } from "./pricing-preview";
import { SignalEngineSection } from "./signal-engine-section";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";
import { TrustBar } from "./trust-bar";
import { AudienceSection, WhyProfessionalsSection } from "./why-audience-section";

export function LandingPage() {
  return (
    <div className="landing-page">
      <SiteNav />
      <Hero />
      <TrustBar />
      <ConnectedMarketsSection />
      <SignalEngineSection />
      <OpportunityRadarSection />
      <MorningIntelligenceSection />
      <FeaturesSection />
      <WhyProfessionalsSection />
      <AudienceSection />
      <PricingPreview />
      <EcosystemSection />
      <MobileSection />
      <LandingFaq />
      <CtaSection />
      <SiteFooter />
    </div>
  );
}
