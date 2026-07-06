import { LegalPageLayout } from "../components/LegalPageLayout";

import { FinancialDisclaimer } from "../components/FinancialDisclaimer";

import { LegalEntityBlock } from "../legal/LegalEntityBlock";



export function DisclaimerPage() {

  return (

    <LegalPageLayout title="Financial &amp; Informational Disclaimer" activePage="disclaimer">

      <p><strong>Effective date:</strong> July 4, 2026</p>

      <LegalEntityBlock />

      <FinancialDisclaimer />

      <h2>Not a broker or gambling operator</h2>

      <p>

        Motive brand Services do not execute trades, hold customer funds, accept real-money wagers, or operate as

        registered investment advisers, broker-dealers, or gambling platforms. Deep links may open third-party apps

        you configure — those transactions occur entirely outside Motive.

      </p>

      <h2>No fiduciary relationship</h2>

      <p>

        Your use of the Services does not create a fiduciary, advisory, brokerage, agency, employment, partnership, or

        professional-client relationship between you and Motive.

      </p>

      <h2>Simulation modules</h2>

      <p>

        Betting and Predictions sandboxes use virtual bankrolls for practice and education. Simulation results

        do not represent real financial outcomes.

      </p>

      <h2>Betting &amp; responsible use</h2>

      <p>

        Users are solely responsible for ensuring participation in betting or prediction-related activities is lawful

        where they reside. Do not use the Services if you are on a self-exclusion list or prohibited from gambling.

        Motive does not determine whether you may legally place a bet or trade. Features may be geofenced or disabled

        by jurisdiction.

      </p>

      <h2>Beta &amp; experimental features</h2>

      <p>

        Certain AI, alert, or analytics features may be labeled Beta or Experimental. They may be modified,

        interrupted, or discontinued without notice and are provided without warranty.

      </p>

      <h2>Service availability</h2>

      <p>

        We do not guarantee uninterrupted availability. Outages may occur due to cloud providers, third-party APIs,

        market closures, or maintenance.

      </p>

      <p>

        Full terms: <a href="/?page=terms">Terms of Service</a> ·{" "}

        <a href="/legal-documents.html">Complete legal pack (HTML)</a>

      </p>

    </LegalPageLayout>

  );

}

