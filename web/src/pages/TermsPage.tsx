import { LegalPageLayout } from "../components/LegalPageLayout";
import { LEGAL_ENTITY, SERVICES_DEFINITION } from "../legal/entity";
import { PRODUCT_TAGLINE } from "../config/productCopy";
import { LegalEntityBlock } from "../legal/LegalEntityBlock";

export function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" activePage="terms">
      <p><strong>Effective date:</strong> July 4, 2026</p>
      <LegalEntityBlock />
      <p className="legal-def-block">
        <strong>Defined terms:</strong> {SERVICES_DEFINITION} are provided by {LEGAL_ENTITY.legalName} (&quot;Motive,&quot;
        &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). Product names are branding only; your contract is with{" "}
        {LEGAL_ENTITY.legalName}.
      </p>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to the Services. By creating an account or using
        any Service, you agree to these Terms, our Privacy Policy, Cookie Policy, and Financial Disclaimer.
      </p>

      <h2>1. The Services — informational only</h2>
      <p>
        MotiveFX.AI is an {PRODUCT_TAGLINE}. The Services provide informational market analytics, holdings tracking,
        simulation tools, and AI-assisted intel for stocks, crypto, betting odds, and prediction markets. We do not execute trades, accept deposits, hold
        customer funds, settle wagers, or operate as a broker, dealer, investment adviser, portfolio manager, exchange,
        money services business, or gambling operator.
      </p>
      <p>
        AI features <strong>identify informational signals, screened data points, and educational scenarios</strong> for
        your review — they do not constitute personalized recommendations to buy, sell, hold, wager, or invest.
      </p>
      <p>
        <strong>No fiduciary or professional relationship.</strong> Your use of the Services does not create a fiduciary,
        advisory, brokerage, agency, employment, partnership, or professional-client relationship between you and Motive.
      </p>
      <p>
        <strong>No legal, tax, or financial-planning advice.</strong> We do not provide legal, tax, accounting,
        financial-planning, investment-advisory, or gambling advice. Consult qualified professionals where appropriate.
      </p>

      <h2>2. Eligibility &amp; sanctions</h2>
      <ul>
        <li>You must be at least 18 years old (19+ in some Canadian provinces).</li>
        <li>You may not use the Services where prohibited by local law.</li>
        <li>You are responsible for compliance with tax and regulatory obligations in your jurisdiction.</li>
        <li>
          You may not use the Services if you are located in, organized under the laws of, or ordinarily resident in a
          country or territory subject to comprehensive sanctions, or if you are listed on any applicable sanctions or
          restricted-party list.
        </li>
      </ul>

      <h2>3. Betting, prediction markets &amp; responsible use</h2>
      <p>
        Betting, odds, and prediction-market features may be unavailable or restricted in certain jurisdictions. We may
        use location, account, payment, or other signals to restrict access, but <strong>you remain solely responsible</strong>{" "}
        for ensuring your use is lawful where you are located. Motive does not determine whether you may legally place a
        bet or prediction-market trade.
      </p>
      <ul>
        <li>You confirm sports betting, prediction markets, or similar activities are lawful in your jurisdiction.</li>
        <li>Do not use the Services if you are on a self-exclusion list or prohibited from gambling.</li>
        <li>Do not use the Services to circumvent sportsbook, exchange, or prediction-market rules or limits.</li>
        <li>Do not scrape, automate, or arbitrage against third-party betting platforms using Service output.</li>
        <li>Do not represent AI output as guaranteed picks, locks, or sure outcomes.</li>
      </ul>
      <p>
        <strong>Responsible gaming.</strong> Betting and prediction features are for informational, educational, and
        simulation purposes. Motive does not encourage excessive gambling or financial risk-taking. If you believe you may
        have a gambling problem, seek help from a qualified support organization in your jurisdiction.
      </p>

      <h2>4. Accounts &amp; security</h2>
      <ul>
        <li>Provide accurate registration information and keep it current.</li>
        <li>Keep credentials confidential; we strongly recommend enabling multi-factor authentication where available.</li>
        <li>You are responsible for activity under your account.</li>
        <li>
          Notify us promptly of unauthorized access at{" "}
          <a href={`mailto:${LEGAL_ENTITY.supportEmail}`}>{LEGAL_ENTITY.supportEmail}</a>.
        </li>
      </ul>

      <h2>5. Subscriptions, billing &amp; refunds</h2>
      <ul>
        <li>Prices are shown at checkout. Fees are exclusive of applicable taxes unless stated otherwise.</li>
        <li>
          You are responsible for applicable sales, use, GST/HST, VAT, or similar taxes except taxes based on our income.
        </li>
        <li>By subscribing, you consent to automatic renewal at the displayed rate until you cancel.</li>
        <li>Free trials convert to paid subscriptions unless cancelled before the trial ends.</li>
        <li>Cancellations take effect at the end of the current billing period unless required otherwise by law.</li>
        <li>Manage billing and payment methods through Stripe&apos;s customer portal linked from Account settings.</li>
        <li>Failed payments may suspend paid features until resolved.</li>
        <li>
          If you dispute a charge, contact{" "}
          <a href={`mailto:${LEGAL_ENTITY.supportEmail}`}>{LEGAL_ENTITY.supportEmail}</a> first so we can investigate.
          Chargebacks or payment disputes may lead to temporary suspension pending review. Nothing here limits lawful
          consumer payment dispute rights.
        </li>
        <li>Refunds are provided where required by applicable law; otherwise at our discretion.</li>
        <li>Nothing in these Terms limits non-waivable consumer rights under applicable law.</li>
      </ul>

      <h2>6. Acceptable use, community &amp; copyright</h2>
      <p>You may not use the Services to:</p>
      <ul>
        <li>Engage in unlawful activity, market manipulation, fraud, or harassment.</li>
        <li>Post spam, malware, or content that disrupts other users or the platform.</li>
        <li>Scrape, crawl, reverse engineer, decompile, or extract AI models, signals, or data for resale.</li>
        <li>Operate automated bots to access, copy, or redistribute alerts, feeds, or intel without permission.</li>
        <li>Resell, sublicense, or commercially redistribute Service output (including signals and alerts).</li>
        <li>Share account credentials or circumvent access controls or module gates.</li>
        <li>Misrepresent AI output as guaranteed financial results or professional advice.</li>
        <li>Upload content that violates third-party rights or applicable law.</li>
      </ul>
      <p>
        <strong>User content.</strong> Journal notes and other content you submit remain yours. You grant Motive a
        license to host and display that content solely to operate the Services. We may remove content that violates
        these Terms, respond to reports, and suspend repeat offenders. User content is not reviewed for accuracy — do
        not rely on other users&apos; content.
      </p>
      <p>
        <strong>Copyright complaints.</strong> Send DMCA or copyright notices to{" "}
        <a href={`mailto:${LEGAL_ENTITY.legalEmail}`}>{LEGAL_ENTITY.legalEmail}</a> with sufficient detail to identify
        the work and allegedly infringing material.
      </p>

      <h2>7. Market data, availability &amp; geofencing</h2>
      <p>
        Quotes, prices, news, odds, and market data may be delayed, incomplete, or unavailable. Verify information with
        official exchanges, sportsbooks, or data providers before acting.
      </p>
      <p>
        We do not guarantee uninterrupted availability. Third-party providers may suspend, modify, or discontinue
        services at any time. We may restrict, suspend, or disable features based on location, account type, legal risk,
        vendor restrictions, or compliance requirements. Availability of a feature does not mean it is lawful or
        appropriate for your jurisdiction.
      </p>

      <h2>8. API access (if enabled)</h2>
      <p>If we provide API keys or programmatic access, you must:</p>
      <ul>
        <li>Keep API keys confidential and not share them.</li>
        <li>Respect published rate limits and usage policies.</li>
        <li>Not resell, redistribute, or build competing datasets or products from API output.</li>
        <li>Not cache data beyond permitted periods or circumvent data-vendor restrictions.</li>
        <li>Accept that APIs may change, be rate-limited, or deprecated without SLA guarantees.</li>
      </ul>

      <h2>9. AI, beta &amp; experimental features</h2>
      <p>
        When you use AI-enabled features, information you submit or select for analysis may be sent to third-party AI
        providers to generate outputs. We use reasonable measures to limit shared information to what is necessary for
        the requested feature. Unless otherwise stated in our Privacy Policy, we do not permit third-party AI providers
        to use your personal information to train their general-purpose models.
      </p>
      <p>
        AI-generated analyses, summaries, signal-strength scores, scenario labels, and explanations may be incorrect,
        incomplete, inconsistent, hallucinated, or based on outdated information. You must independently verify all intel
        before acting.
      </p>
      <p>
        Features labeled Beta, Experimental, or similar may change, break, or be discontinued without notice. They are
        provided as-is with no warranty.
      </p>

      <h2>10. No performance guarantees</h2>
      <p>
        Motive does not guarantee profits, successful trades, increased investment returns, successful betting outcomes,
        prediction accuracy, or any financial result. Past patterns shown in the Services are not forecasts of future
        performance.
      </p>

      <h2>11. Intellectual property &amp; your data</h2>
      <p>
        We own the Services, branding, software, and underlying technology. You retain ownership of data you input.
      </p>
      <p>
        You grant Motive a license to host, process, transmit, and display your data <strong>only as necessary to
        provide, secure, and support the Services</strong>, comply with law, and enforce these Terms. We may use
        aggregated or de-identified data for analytics and product improvement. We do not use your personal journal or
        holdings content to train third-party general-purpose AI models except as described in our Privacy Policy.
      </p>
      <p>You may not copy, modify, or create derivative works of the Services except as permitted by law.</p>

      <h2>12. Disclaimers</h2>
      <p>
        THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND. WE
        DISCLAIM ALL IMPLIED WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
        NON-INFRINGEMENT.
      </p>

      <h2>13. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, MOTIVE AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS ARE NOT
        LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR
        TRADING LOSSES. OUR TOTAL LIABILITY IS LIMITED TO THE AMOUNT YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM,
        EXCEPT WHERE LIABILITY CANNOT BE LIMITED UNDER APPLICABLE CONSUMER LAW.
      </p>

      <h2>14. Indemnification</h2>
      <p>
        You agree to indemnify us against claims arising from your misuse of the Services or violation of these Terms.
      </p>

      <h2>15. Governing law &amp; disputes</h2>
      <p>
        These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable
        therein, without regard to conflict-of-law principles. Subject to non-waivable consumer rights, you agree that
        courts located in Ontario, Canada shall have exclusive jurisdiction over disputes arising from these Terms.
      </p>

      <h2>16. Termination &amp; data</h2>
      <p>
        You may close your account at any time via Account settings. See our{" "}
        <a href="/?page=data-deletion">Data Deletion &amp; Export</a> policy. We may suspend or terminate access for
        breach, non-payment, risk, or legal requirement.
      </p>

      <h2>17. Contact</h2>
      <p>
        {LEGAL_ENTITY.legalName} —{" "}
        <a href={`mailto:${LEGAL_ENTITY.supportEmail}`}>{LEGAL_ENTITY.supportEmail}</a>
        {" · "}
        Legal: <a href={`mailto:${LEGAL_ENTITY.legalEmail}`}>{LEGAL_ENTITY.legalEmail}</a>
      </p>
    </LegalPageLayout>
  );
}
