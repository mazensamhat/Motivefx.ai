import Link from "next/link";
import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { LEGAL_ENTITY, LEGAL_VERSION, SERVICES_DEFINITION } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How MotiveFX.AI collects, uses, and protects personal information — PIPEDA, Quebec Law 25, GDPR, and U.S. state privacy rights.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Privacy Policy", href: "/privacy" },
      ]}
      title="Privacy Policy"
      kicker="Legal"
      description="How we collect, use, disclose, and protect personal information when you use MotiveFX.AI."
      cta={false}
    >
      <ContentProse>
        <p>
          <strong>Effective date:</strong> July 4, 2026 · Version {LEGAL_VERSION}
        </p>
        <p>
          <strong>Data controller:</strong> {LEGAL_ENTITY.legalName} controls personal information processed
          through {SERVICES_DEFINITION}, except where a payment processor or other service provider acts as
          an independent controller for its own services.
        </p>
        <p>
          <strong>Privacy Officer:</strong> {LEGAL_ENTITY.privacyOfficerTitle} —{" "}
          <a href={`mailto:${LEGAL_ENTITY.privacyEmail}`}>{LEGAL_ENTITY.privacyEmail}</a>
          {" · "}
          Mailing address: {LEGAL_ENTITY.address}
        </p>
      </ContentProse>

      <ContentSection title="1. Information we collect">
        <ContentProse>
          <ul className="content-list">
            <li>
              <strong>Account data:</strong> email, display name, password (hashed), optional demographics.
            </li>
            <li>
              <strong>Usage data:</strong> modules accessed, sessions, acquisition channel, feature interactions.
            </li>
            <li>
              <strong>Holdings &amp; activity:</strong> positions you track, bets, predictions, platform
              preferences.
            </li>
            <li>
              <strong>Intel features:</strong> radar symbols, journal notes, alerts, signal saves/exports.
            </li>
            <li>
              <strong>Consent records:</strong> privacy, terms, and risk acknowledgement timestamps and
              document versions.
            </li>
            <li>
              <strong>Payment data:</strong> via Stripe — we store subscription metadata, not full card numbers.
            </li>
            <li>
              <strong>Device &amp; logs:</strong> IP, browser, app version, crash logs when enabled.
            </li>
          </ul>
          <p>
            <strong>Sensitive information.</strong> Holdings, betting, journal, and demographic data may be
            sensitive in some jurisdictions. Provide it only if you choose to use those features.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="2. How we use information">
        <ContentProse>
          <ul className="content-list">
            <li>Provide, operate, secure, and improve the Services, including AI-generated intel (informational only).</li>
            <li>Process subscriptions, billing, fraud prevention, and support.</li>
            <li>Record consent and risk acknowledgements for compliance.</li>
            <li>Send service, security, and billing communications.</li>
            <li>Send marketing emails only with your consent; you may unsubscribe anytime.</li>
            <li>Enforce Terms and comply with legal obligations.</li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="3. Legal bases">
        <ContentProse>
          <p>
            Contract performance, consent (marketing, optional fields, non-essential cookies where required),
            and legitimate interests (security, analytics, product improvement, and compliance records) as
            permitted under PIPEDA, Quebec Law 25, GDPR, and applicable US state laws.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="4. AI data handling">
        <ContentProse>
          <ul className="content-list">
            <li>
              Prompts are sent to third-party AI providers <strong>only when you use AI features</strong> (e.g.,
              analyze, explain, chat).
            </li>
            <li>
              Holdings or journal context is included <strong>only when relevant to the feature you invoke</strong>,
              not by default for all requests.
            </li>
            <li>We may store prompts and outputs to provide history, support, and security review for a limited period.</li>
            <li>
              Unless stated otherwise, we configure AI providers so your personal information is{" "}
              <strong>not used to train their general-purpose models</strong>. Verify this against current
              provider terms.
            </li>
            <li>We minimize financial and betting details sent to AI providers where feasible.</li>
            <li>AI features can be avoided by not using AI analyze, explain, or chat tools.</li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="5. Automated processing (Quebec Law 25)">
        <ContentProse>
          <p>
            Some features use automated processing to rank signals, generate summaries, or produce
            signal-strength scores. These outputs are informational and are not used as the sole basis for
            decisions that produce legal or similarly significant effects about you. You may request
            information about automated processing by contacting our Privacy Officer.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="6. Sharing &amp; subprocessors">
        <ContentProse>
          <p>We share data with service providers only as needed to operate the Services:</p>
          <ul className="content-list">
            <li>Stripe (payments and billing)</li>
            <li>OpenAI and other AI providers (AI insights features — see Section 4)</li>
            <li>Cloud hosting, email, and notification providers</li>
            <li>Market data and odds API partners (generally no personal data; may include request metadata)</li>
            <li>Analytics and error monitoring (where enabled)</li>
          </ul>
          <p>
            We do not sell personal information. We do not share personal information for cross-context
            behavioral advertising. We may disclose information if required by law or to protect rights and
            safety.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="7. International transfers">
        <ContentProse>
          <p>
            Data may be processed in Canada, the United States, and other provider locations. Data stored or
            processed outside your country may be subject to foreign laws and government access requests. We
            use contractual safeguards where required.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="8. Retention">
        <ContentProse>
          <ul className="content-list">
            <li>Account data: while active and as required afterward for legal, tax, or dispute purposes.</li>
            <li>
              Consent and risk acknowledgement records: retained as needed to demonstrate compliance — not
              deleted immediately on account closure.
            </li>
            <li>Telemetry: typically 90 days unless needed for security.</li>
            <li>Payment records: up to 7 years for tax/accounting.</li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="9. Your rights">
        <ContentProse>
          <p>
            Depending on your location, you may have rights to access, correct, delete, export, restrict, or
            object to processing, and withdraw consent where processing is consent-based.
          </p>
          <ul className="content-list">
            <li>
              <strong>Access &amp; correction:</strong> update profile fields in Account settings or email us.
            </li>
            <li>
              <strong>Deletion &amp; export:</strong> Account settings or contact{" "}
              <a href={`mailto:${LEGAL_ENTITY.privacyEmail}`}>{LEGAL_ENTITY.privacyEmail}</a>.
            </li>
            <li>
              <strong>Marketing:</strong> unsubscribe via email links or contact us.
            </li>
            <li>
              <strong>California (CCPA/CPRA):</strong> request disclosure or deletion; authorized agents may
              submit requests with verification.
            </li>
            <li>
              <strong>Appeals:</strong> if we deny a privacy request where an appeal right applies, contact us
              for review.
            </li>
            <li>
              <strong>Non-discrimination:</strong> we will not discriminate against you for exercising privacy
              rights where prohibited.
            </li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="10. Security">
        <ContentProse>
          <p>
            TLS encryption, password hashing, optional MFA, access controls, and monitoring. We strongly
            recommend enabling multi-factor authentication where available. No method is 100% secure.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="11. Children">
        <ContentProse>
          <p>Not directed to anyone under 18 (or local age of majority).</p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="12. Changes">
        <ContentProse>
          <p>Material changes notified via the Services or email with an updated effective date.</p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="Disclaimer">
        <ContentProse>
          <p>
            MotiveFX provides informational market intelligence only — not financial, investment, tax, or
            legal advice. Past performance does not guarantee future results. See our{" "}
            <Link href="/faq/is-motivefx-ai-financial-advice">financial advice FAQ</Link> and{" "}
            <Link href="/data-sources">data methodology</Link>.
          </p>
        </ContentProse>
      </ContentSection>
    </ContentLayout>
  );
}
