import Link from "next/link";
import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { LEGAL_ENTITY, LEGAL_VERSION, SERVICES_DEFINITION } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "Terms of Service for MotiveFX.AI — informational market intelligence only. No brokerage, betting execution, or fiduciary advice.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Terms of Service", href: "/terms" },
      ]}
      title="Terms of Service"
      kicker="Legal"
      description="Rules that govern your access to MotiveFX.AI and related Motive-branded services."
      cta={false}
    >
      <ContentProse>
        <p>
          <strong>Effective date:</strong> July 4, 2026 · Version {LEGAL_VERSION}
        </p>
        <p>
          <strong>Defined terms:</strong> {SERVICES_DEFINITION} are provided by {LEGAL_ENTITY.legalName}{" "}
          (&quot;Motive,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). Product names are branding only;
          your contract is with {LEGAL_ENTITY.legalName}.
        </p>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to the Services. By creating an account or
          using any Service, you agree to these Terms, our{" "}
          <Link href="/privacy">Privacy Policy</Link>, and related disclosures including{" "}
          <Link href="/data-deletion">Data Deletion &amp; Export</Link>.
        </p>
      </ContentProse>

      <ContentSection title="1. The Services — informational only">
        <ContentProse>
          <p>
            MotiveFX.AI provides informational market analytics, holdings tracking, simulation tools, and AI-assisted
            intel for stocks, crypto, options, sports betting odds, prediction markets, and pink sheets. We do not
            execute trades, accept deposits, hold customer funds, settle wagers, or operate as a broker, dealer,
            investment adviser, portfolio manager, exchange, money services business, or gambling operator.
          </p>
          <p>
            AI features identify informational signals and educational scenarios for your review — they do not
            constitute personalized recommendations to buy, sell, hold, wager, or invest.
          </p>
          <p>
            <strong>No fiduciary or professional relationship.</strong> Your use of the Services does not create a
            fiduciary, advisory, brokerage, agency, employment, partnership, or professional-client relationship.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="2. Eligibility">
        <ContentProse>
          <ul className="content-list">
            <li>You must be at least 18 years old (19+ in some Canadian provinces).</li>
            <li>You may not use the Services where prohibited by local law.</li>
            <li>You are responsible for tax and regulatory compliance in your jurisdiction.</li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="3. Betting, prediction markets &amp; responsible use">
        <ContentProse>
          <p>
            Betting, odds, and prediction-market features may be unavailable or restricted in certain jurisdictions.
            You remain solely responsible for ensuring your use is lawful where you are located.
          </p>
          <ul className="content-list">
            <li>Do not use the Services if you are on a self-exclusion list or prohibited from gambling.</li>
            <li>Do not represent AI output as guaranteed picks, locks, or sure outcomes.</li>
            <li>Do not scrape or arbitrage against third-party platforms using Service output.</li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="4. Accounts, billing &amp; acceptable use">
        <ContentProse>
          <p>
            Provide accurate registration information, keep credentials confidential, and enable multi-factor
            authentication where available. Subscriptions renew until cancelled; manage billing through the Stripe
            customer portal linked from Account settings.
          </p>
          <p>
            You may not use the Services for unlawful activity, market manipulation, scraping for resale, credential
            sharing, or misrepresenting AI output as professional advice.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="5. Disclaimers &amp; liability">
        <ContentProse>
          <p>
            THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND.
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, MOTIVE IS NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR TRADING/BETTING LOSSES. OUR TOTAL LIABILITY IS LIMITED TO THE AMOUNT
            YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM, EXCEPT WHERE LIABILITY CANNOT BE LIMITED UNDER
            APPLICABLE CONSUMER LAW.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="6. Termination &amp; data">
        <ContentProse>
          <p>
            You may close your account at any time. See our{" "}
            <Link href="/data-deletion">Data Deletion &amp; Export</Link> policy. We may suspend or terminate access
            for breach, non-payment, risk, or legal requirement.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="7. Contact">
        <ContentProse>
          <p>
            {LEGAL_ENTITY.legalName} —{" "}
            <a href={`mailto:${LEGAL_ENTITY.supportEmail}`}>{LEGAL_ENTITY.supportEmail}</a>
            {" · "}
            Legal: <a href={`mailto:${LEGAL_ENTITY.legalEmail}`}>{LEGAL_ENTITY.legalEmail}</a>
            {" · "}
            Privacy: <a href={`mailto:${LEGAL_ENTITY.privacyEmail}`}>{LEGAL_ENTITY.privacyEmail}</a>
          </p>
          <p>
            Related: <Link href="/privacy">Privacy Policy</Link> ·{" "}
            <Link href="/data-deletion">Data deletion</Link>
          </p>
        </ContentProse>
      </ContentSection>
    </ContentLayout>
  );
}
