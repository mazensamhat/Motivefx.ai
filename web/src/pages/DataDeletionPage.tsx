import { LegalPageLayout } from "../components/LegalPageLayout";

import { LegalNav } from "../components/LegalNav";

import { LEGAL_ENTITY } from "../legal/entity";

import { LegalEntityBlock } from "../legal/LegalEntityBlock";



export function DataDeletionPage() {

  return (

    <LegalPageLayout title="Data Deletion &amp; Export" activePage="data-deletion">

      <LegalNav active="data-deletion" />

      <p><strong>Effective date:</strong> July 4, 2026</p>

      <LegalEntityBlock />

      <p>

        You control your account data across Motive brand Services. This page explains how to export a copy, delete

        specific content, or permanently remove your account.

      </p>



      <h2>1. Export your data (download)</h2>

      <p>

        Signed-in users can download a JSON export from <strong>Account → Export my data</strong> in the app.

        The export typically includes:

      </p>

      <ul>

        <li>Profile and account settings (email, display name, cohort preferences)</li>

        <li>Holdings ledgers (trades, crypto, pink slips)</li>

        <li>Bets and prediction positions (including simulation records)</li>

        <li>Platform connection preferences</li>

        <li>Intel Radar (watchlist) symbols</li>

        <li>Paper Intel Journal entries</li>

        <li>In-app intel alert history</li>

        <li>Subscription and module status metadata</li>

        <li>Consent and risk acknowledgment records (timestamps and document versions)</li>

      </ul>

      <p>Payment card numbers are never stored by Motive — Stripe holds billing details.</p>



      <h2>2. Delete individual content</h2>

      <ul>

        <li><strong>Journal entries:</strong> delete from the Paper Intel Journal panel on Home.</li>

        <li><strong>Radar symbols:</strong> remove stars from your watchlist on Home.</li>

        <li><strong>Holdings:</strong> remove rows from each module ledger.</li>

        <li><strong>Alerts:</strong> mark read or dismiss from the alert center.</li>

      </ul>



      <h2>3. Delete your entire account</h2>

      <p>To permanently delete your account and associated personal data:</p>

      <ol>

        <li>Sign in and open <strong>Account</strong> from the workspace header.</li>

        <li>Scroll to <strong>Delete account</strong>.</li>

        <li>Enter your password and type <code>DELETE</code> to confirm.</li>

      </ol>

      <p>

        <strong>Account deletion begins immediately</strong> for active app data we control: profile, holdings ledgers,

        journal, radar, alerts, preferences, and session tokens. Active sessions are invalidated and backups are purged

        on our standard retention cycle (typically within 30 days).

      </p>

      <p>

        <strong>Records we may retain:</strong> billing, security, fraud-prevention, tax, dispute, and consent/risk

        acknowledgment records may be retained where necessary for legal, compliance, security, or legitimate business

        purposes — including demonstrating that you accepted these Terms and risk disclosures.

      </p>

      <p>

        Stripe may retain billing records as required by law (typically up to 7 years).

      </p>

      <p>

        You may also email{" "}

        <a href={`mailto:${LEGAL_ENTITY.privacyEmail}`}>{LEGAL_ENTITY.privacyEmail}</a> with subject &quot;Account deletion request&quot;

        from your registered email address.

      </p>



      <h2>4. Retention after deletion</h2>

      <ul>

        <li>Most personal data is removed within 30 days of account deletion.</li>

        <li>Anonymized usage aggregates may be retained for product analytics.</li>

        <li>Legal, fraud-prevention, tax, chargeback, and compliance records may be kept where required.</li>

        <li>Backup systems may retain data for a limited period before automated purge cycles complete.</li>

      </ul>



      <h2>5. Regional rights</h2>

      <p>

        Canadian users (PIPEDA / Quebec Law 25) and California users (CCPA/CPRA) may request access, correction,

        or deletion by contacting{" "}

        <a href={`mailto:${LEGAL_ENTITY.privacyEmail}`}>{LEGAL_ENTITY.privacyEmail}</a>. We respond within applicable

        statutory timelines.

      </p>



      <p>

        See also our <a href="/?page=privacy">Privacy Policy</a> and <a href="/?page=terms">Terms of Service</a>.

      </p>

    </LegalPageLayout>

  );

}

