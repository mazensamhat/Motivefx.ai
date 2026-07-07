import { getAppUrl } from "@/lib/stripe";
import { SITE } from "@/lib/site-config";
import {
  DEFAULT_EMAIL_FROM,
  SHARED_RESEND_DOMAIN,
} from "@/lib/email-config";

function readEnvString(name: string): string {
  const raw = process.env[name]?.trim() ?? "";
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1).trim();
  }
  return raw;
}

export function getResendApiKey() {
  return readEnvString("RESEND_API_KEY");
}

export function getEmailFrom() {
  return readEnvString("EMAIL_FROM") || DEFAULT_EMAIL_FROM;
}

export function hasResendApiKey() {
  const key = getResendApiKey();
  return Boolean(key && key.startsWith("re_"));
}

function parseEmailFrom(from: string) {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] ?? from).trim().toLowerCase();
}

function getKeyDiagnostic(): string {
  const raw = process.env.RESEND_API_KEY?.trim() ?? "";
  if (!raw) {
    return "RESEND_API_KEY is not set. Copy the same key from Motive Life Vercel → Production.";
  }
  if (raw.startsWith('"') || raw.startsWith("'")) {
    return 'RESEND_API_KEY has quote characters — paste the key only, no quotes.';
  }
  const key = getResendApiKey();
  if (!key.startsWith("re_")) {
    return "RESEND_API_KEY must start with re_ — copy the full key from Resend → API Keys.";
  }
  return "";
}

export interface ResendSetupStep {
  step: number;
  title: string;
  detail: string;
  href: string;
}

export function getResendSetupSteps(): ResendSetupStep[] {
  return [
    {
      step: 1,
      title: "Copy RESEND_API_KEY from Motive Life",
      detail: "Vercel → motivelife-web → Settings → Environment Variables → Production.",
      href: "https://vercel.com/docs/projects/environment-variables",
    },
    {
      step: 2,
      title: "Add to MotiveFX Vercel Production",
      detail: `RESEND_API_KEY (same value) and EMAIL_FROM=${DEFAULT_EMAIL_FROM}`,
      href: "https://vercel.com/docs/projects/environment-variables",
    },
    {
      step: 3,
      title: "Redeploy MotiveFX",
      detail: "No new Resend domain — uses verified mymotivelife.com.",
      href: SITE.url,
    },
    {
      step: 4,
      title: "Send test email",
      detail: "Sign in → /app/settings → Send test email.",
      href: `${SITE.url}/app/settings`,
    },
  ];
}

export function getEmailConfigStatus() {
  const from = getEmailFrom();
  const fromAddress = parseEmailFrom(from);
  const apiKeySet = hasResendApiKey();
  const fromExplicit = Boolean(readEnvString("EMAIL_FROM"));
  const fromLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromAddress);
  const fromDomain = fromAddress.split("@")[1] ?? "";
  const domainMatches = fromDomain === SHARED_RESEND_DOMAIN;
  const appUrl = readEnvString("NEXT_PUBLIC_APP_URL");
  const appUrlHttps = appUrl.startsWith("https://");

  return {
    configured: apiKeySet && fromLooksValid && domainMatches && appUrlHttps,
    sharedAccount: true,
    resendDomain: SHARED_RESEND_DOMAIN,
    from,
    fromAddress,
    expectedFrom: DEFAULT_EMAIL_FROM,
    diagnostic:
      getKeyDiagnostic() ||
      (!domainMatches
        ? `EMAIL_FROM must use @${SHARED_RESEND_DOMAIN} (shared Motive Life Resend domain)`
        : "") ||
      (!appUrlHttps ? "NEXT_PUBLIC_APP_URL must be your https:// production URL" : ""),
    keyConfigured: apiKeySet,
    checklist: [
      { ok: apiKeySet, label: "RESEND_API_KEY is set (same as Motive Life)" },
      {
        ok: fromExplicit || fromLooksValid,
        label: `EMAIL_FROM is set (default: ${DEFAULT_EMAIL_FROM})`,
      },
      { ok: fromLooksValid, label: "Sender address format is valid" },
      {
        ok: domainMatches,
        label: `Sender uses @${SHARED_RESEND_DOMAIN} (no new Resend domain)`,
      },
      { ok: appUrlHttps, label: "NEXT_PUBLIC_APP_URL is HTTPS" },
    ],
    setupNote:
      "Copy RESEND_API_KEY from Motive Life Vercel → set EMAIL_FROM on MotiveFX Vercel → redeploy. No Resend upgrade needed.",
    setupSteps: getResendSetupSteps(),
  };
}

type SendResult = { ok: true } | { ok: false; error: string };

async function sendViaResend(to: string, subject: string, html: string): Promise<SendResult> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not set" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email] Resend error:", res.status, body);
    return { ok: false, error: body || `Resend HTTP ${res.status}` };
  }

  return { ok: true };
}

export async function sendTestEmail(to: string) {
  const subject = "MotiveFX email test";
  const html = `
    <p>This is a test email from MotiveFX.</p>
    <p>If you received this, password reset emails should work.</p>
    <p>— MotiveFX · <a href="${SITE.url}">${SITE.url}</a></p>
  `.trim();
  return sendViaResend(to, subject, html);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = "Reset your MotiveFX password";
  const html = `
    <p>We received a request to reset your MotiveFX password.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    <p>— MotiveFX · <a href="${SITE.url}">${SITE.url}</a></p>
  `.trim();

  const result = await sendViaResend(email, subject, html);

  if (!result.ok && process.env.NODE_ENV === "development") {
    console.log(`[email] Password reset link for ${email}: ${resetUrl}`);
    return true;
  }

  return result.ok;
}

export async function fetchResendDomainStatus(domain = SHARED_RESEND_DOMAIN) {
  const apiKey = getResendApiKey();
  if (!apiKey) return null;

  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    data?: { id: string; name: string; status: string }[];
  };
  const row = data.data?.find((d) => d.name === domain);
  if (!row) return { exists: false as const, domain };

  return {
    exists: true as const,
    domain,
    id: row.id,
    status: row.status,
  };
}
