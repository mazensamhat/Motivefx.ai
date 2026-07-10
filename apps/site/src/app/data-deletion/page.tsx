import Link from "next/link";
import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { LEGAL_ENTITY, LEGAL_VERSION, SERVICES_DEFINITION } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Data Deletion & Export",
  description:
    "How to export your MotiveFX.AI data, delete content, or permanently delete your account and personal information.",
  path: "/data-deletion",
});

export default function DataDeletionPage() {
  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Data Deletion", href: "/data-deletion" },
      ]}
      title="Data Deletion & Export"
      kicker="Legal"
      description="How to export a copy of your data, delete specific content, or permanently remove your MotiveFX.AI account."
      cta={false}
    >
      <ContentProse>
        <p>
          <strong>Effective date:</strong> July 4, 2026 · Version {LEGAL_VERSION}
        </p>
        <p>
          You control your account data across {SERVICES_DEFINITION}. This page explains how to export a
          copy, delete specific content, or permanently remove your account.
        </p>
        <p>
          <strong>Contact:</strong>{" "}
          <a href={`mailto:${LEGAL_ENTITY.privacyEmail}`}>{LEGAL_ENTITY.privacyEmail}</a>
          {" · "}
          {LEGAL_ENTITY.address}
        </p>
      </ContentProse>

      <ContentSection title="1. Export your data (download)">
        <ContentProse>
          <p>
            Signed-in users can download a JSON export from <strong>Account → Export my data</strong> in
            the app. The export typically includes:
          </p>
          <ul className="content-list">
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
        </ContentProse>
      </ContentSection>

      <ContentSection title="2. Delete individual content">
        <ContentProse>
          <ul className="content-list">
            <li>
              <strong>Journal entries:</strong> delete from the Paper Intel Journal panel on Home.
            </li>
            <li>
              <strong>Radar symbols:</strong> remove stars from your watchlist on Home.
            </li>
            <li>
              <strong>Holdings:</strong> remove rows from each module ledger.
            </li>
            <li>
              <strong>Alerts:</strong> mark read or dismiss from the alert center.
            </li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="3. Delete your entire account">
        <ContentProse>
          <p>To permanently delete your account and associated personal data:</p>
          <ol className="content-list">
            <li>
              Sign in at{" "}
              <a href="https://www.motivefxai.com/terminal/">motivefxai.com/terminal</a> and open{" "}
              <strong>Account</strong> from the workspace header.
            </li>
            <li>
              Scroll to <strong>Delete account</strong>.
            </li>
            <li>
              Enter your password and type <code>DELETE</code> to confirm.
            </li>
          </ol>
          <p>
            <strong>Account deletion begins immediately</strong> for active app data we control: profile,
            holdings ledgers, journal, radar, alerts, preferences, and session tokens. Active sessions are
            invalidated and backups are purged on our standard retention cycle (typically within 30 days).
          </p>
          <p>
            <strong>Records we may retain:</strong> billing, security, fraud-prevention, tax, dispute, and
            consent/risk acknowledgment records may be retained where necessary for legal, compliance,
            security, or legitimate business purposes — including demonstrating that you accepted our Terms
            and risk disclosures.
          </p>
          <p>Stripe may retain billing records as required by law (typically up to 7 years).</p>
          <p>
            You may also email{" "}
            <a href={`mailto:${LEGAL_ENTITY.privacyEmail}`}>{LEGAL_ENTITY.privacyEmail}</a> with subject
            &quot;Account deletion request&quot; from your registered email address.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="4. Retention after deletion">
        <ContentProse>
          <ul className="content-list">
            <li>Most personal data is removed within 30 days of account deletion.</li>
            <li>Anonymized usage aggregates may be retained for product analytics.</li>
            <li>Legal, fraud-prevention, tax, chargeback, and compliance records may be kept where required.</li>
            <li>Backup systems may retain data for a limited period before automated purge cycles complete.</li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="5. Regional rights">
        <ContentProse>
          <p>
            Canadian users (PIPEDA / Quebec Law 25) and California users (CCPA/CPRA) may request access,
            correction, or deletion by contacting{" "}
            <a href={`mailto:${LEGAL_ENTITY.privacyEmail}`}>{LEGAL_ENTITY.privacyEmail}</a>. We respond
            within applicable statutory timelines.
          </p>
          <p>
            See also our <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </ContentProse>
      </ContentSection>
    </ContentLayout>
  );
}
