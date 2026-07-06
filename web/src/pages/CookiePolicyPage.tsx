import { LegalPageLayout } from "../components/LegalPageLayout";

import { LegalNav } from "../components/LegalNav";

import { LEGAL_ENTITY } from "../legal/entity";

import { LegalEntityBlock } from "../legal/LegalEntityBlock";



export function CookiePolicyPage() {

  return (

    <LegalPageLayout title="Cookie Policy" activePage="cookies">

      <LegalNav active="cookies" />

      <p><strong>Effective date:</strong> July 4, 2026</p>

      <LegalEntityBlock />

      <p>

        This Cookie Policy explains how Motive brand Services use cookies, local storage, session storage, and similar

        technologies.

      </p>



      <h2>1. Categories we use</h2>

      <ul>

        <li>

          <strong>Essential (always on):</strong> session tokens, authentication state, MFA session flags, and security

          preferences required to sign in and use the Services.

        </li>

        <li>

          <strong>Functional:</strong> module preferences, platform setup, intel tour completion, legal consent flags,

          and anonymous demo user ID before registration.

        </li>

        <li>

          <strong>Analytics (optional where required):</strong> aggregated usage, performance monitoring, and marketing

          attribution (UTM / referral channel). Non-essential analytics are disabled until you consent where required

          by law.

        </li>

      </ul>

      <p>We do not use third-party advertising cookies on the core product experience.</p>



      <h2>2. Local storage examples</h2>

      <ul>

        <li>Auth session and refresh tokens (httpOnly where applicable via API)</li>

        <li>Last-seen signal IDs for &quot;new signals since visit&quot; banners</li>

        <li>Intel tour and platform setup dismissal flags</li>

        <li>Risk acknowledgment and legal document version acceptance flags</li>

        <li>Optional browser notification preference for intel alerts</li>

      </ul>



      <h2>3. Consent &amp; your choices</h2>

      <p>

        Where required (e.g., EU/UK, Quebec, or similar jurisdictions), we request consent before placing non-essential

        cookies or local storage used for analytics. You can accept or decline optional analytics in Account settings or

        any cookie banner we display.

      </p>

      <p>

        You may withdraw consent at any time by disabling analytics in settings or clearing site data. Essential cookies

        cannot be disabled while using signed-in features.

      </p>

      <p>

        Retention: essential session data lasts for the session or token lifetime; functional flags persist until cleared;

        analytics identifiers, if used, are retained for up to 13 months unless a shorter period applies.

      </p>



      <h2>4. Managing cookies in your browser</h2>

      <p>

        You can clear cookies and site data through your browser settings. Clearing essential cookies will sign you out

        and reset local preferences. Blocking all cookies may prevent the Services from working.

      </p>



      <h2>5. Third-party embeds</h2>

      <p>

        Stripe checkout and billing portals may set their own cookies subject to{" "}

        <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">Stripe&apos;s privacy policy</a>.

      </p>



      <h2>6. Contact</h2>

      <p>

        Questions: <a href={`mailto:${LEGAL_ENTITY.privacyEmail}`}>{LEGAL_ENTITY.privacyEmail}</a>

      </p>

    </LegalPageLayout>

  );

}

