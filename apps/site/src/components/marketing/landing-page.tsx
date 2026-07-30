import { CtaSection } from "./cta-section";
import { ConnectedMarketsSection } from "./connected-markets-section";
import { EcosystemSection, MobileSection } from "./ecosystem-section";
import { FeaturesSection } from "./features-section";
import { Hero } from "./hero";
import { LandingFaq } from "./landing-faq";
import { AskQuestionsSection } from "./ask-questions-section";
import { MarketDnaSection } from "./market-dna-section";
import { MorningIntelligenceSection } from "./morning-intelligence-section";
import { OpportunityRadarSection } from "./opportunity-radar-section";
import { PricingPreview } from "./pricing-preview";
import { SignalEngineSection } from "./signal-engine-section";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";
import { TrustBar } from "./trust-bar";
import { UseCasesSection } from "./use-cases-section";
import { WorldIntelligenceSection } from "./world-intelligence-section";
import { AudienceSection, WhyProfessionalsSection } from "./why-audience-section";

export function LandingPage() {
  return (
    <div className="landing-page">
      <SiteNav />
      <Hero />
      <TrustBar />
      <ConnectedMarketsSection />
      <WorldIntelligenceSection />
      <SignalEngineSection />
      <OpportunityRadarSection />
      <AskQuestionsSection />
      <MarketDnaSection />
      <UseCasesSection />
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
