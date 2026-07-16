import { prisma } from "@motivefx/database";
import { getEmailConfigStatus, hasResendApiKey } from "@/lib/email";
import { getStripe } from "@/lib/stripe";

export type PlatformCheck = { ok: boolean; label: string; detail?: string };

export type PlatformCard = {
  id: string;
  name: string;
  status: "healthy" | "warn" | "error" | "unknown";
  summary: string;
  metrics: Array<{ label: string; value: string }>;
  checklist: PlatformCheck[];
  dashboardUrl: string | null;
  billingUrl: string | null;
};

function parseSupabaseProjectRef(): string | null {
  const url = process.env.DATABASE_URL?.trim() ?? process.env.DIRECT_URL?.trim() ?? "";
  const poolerMatch = url.match(/postgres\.([a-z0-9]+):/i);
  if (poolerMatch?.[1]) return poolerMatch[1];
  const directMatch = url.match(/db\.([a-z0-9]+)\.supabase\.co/i);
  if (directMatch?.[1]) return directMatch[1];
  return null;
}

async function stripeCard(): Promise<PlatformCard> {
  const stripe = getStripe();
  if (!stripe) {
    return {
      id: "stripe",
      name: "Stripe",
      status: "error",
      summary: "STRIPE_SECRET_KEY missing",
      metrics: [],
      checklist: [{ ok: false, label: "STRIPE_SECRET_KEY set" }],
      dashboardUrl: "https://dashboard.stripe.com",
      billingUrl: "https://dashboard.stripe.com/settings/billing",
    };
  }

  try {
    const mode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test";
    const subs = await stripe.subscriptions.list({ status: "active", limit: 100 });
    return {
      id: "stripe",
      name: "Stripe",
      status: "healthy",
      summary: `${subs.data.length} active · ${mode} mode`,
      metrics: [
        { label: "Mode", value: mode },
        { label: "Active subs", value: String(subs.data.length) },
      ],
      checklist: [
        { ok: true, label: "API connection OK" },
        { ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()), label: "Webhook secret set" },
      ],
      dashboardUrl: "https://dashboard.stripe.com",
      billingUrl: "https://dashboard.stripe.com/settings/billing",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 80) : "Stripe API error";
    return {
      id: "stripe",
      name: "Stripe",
      status: "error",
      summary: msg,
      metrics: [],
      checklist: [{ ok: false, label: "API connection", detail: msg }],
      dashboardUrl: "https://dashboard.stripe.com",
      billingUrl: null,
    };
  }
}

async function supabaseCard(): Promise<PlatformCard> {
  const ref = parseSupabaseProjectRef();
  let status: PlatformCard["status"] = "unknown";
  let summary = "Not configured";
  const checklist: PlatformCheck[] = [];
  let userCount = "—";

  if (!process.env.DATABASE_URL?.trim()) {
    return {
      id: "supabase",
      name: "Supabase",
      status: "error",
      summary: "DATABASE_URL missing",
      metrics: [],
      checklist: [{ ok: false, label: "DATABASE_URL set" }],
      dashboardUrl: "https://supabase.com/dashboard",
      billingUrl: null,
    };
  }

  try {
    userCount = String(await prisma.user.count());
    checklist.push({ ok: true, label: "Database reachable" });
    status = "healthy";
    summary = `${userCount} site users`;
  } catch (e) {
    status = "error";
    summary = e instanceof Error ? e.message.slice(0, 60) : "DB error";
    checklist.push({ ok: false, label: "Database connection", detail: summary });
  }

  return {
    id: "supabase",
    name: "Supabase",
    status,
    summary,
    metrics: [{ label: "Site users", value: userCount }],
    checklist: [
      ...checklist,
      { ok: Boolean(ref), label: "Project ref detected", detail: ref ?? undefined },
    ],
    dashboardUrl: ref ? `https://supabase.com/dashboard/project/${ref}` : "https://supabase.com/dashboard",
    billingUrl: null,
  };
}

async function terminalApiCard(): Promise<PlatformCard> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://127.0.0.1:3010";
  try {
    const res = await fetch(`${appUrl}/api/health`, { cache: "no-store" });
    const body = res.ok
      ? ((await res.json()) as {
          status?: string;
          feeds?: Record<string, boolean>;
          quota?: {
            sharp_api?: { remaining?: number | null };
            the_odds_api?: { remaining?: number | null };
          };
        })
      : null;
    const feeds = body?.feeds ?? {};
    const feedOk = Object.values(feeds).filter(Boolean).length;
    const feedTotal = Object.keys(feeds).length;
    const sharpLeft = body?.quota?.sharp_api?.remaining;
    const oddsLeft = body?.quota?.the_odds_api?.remaining;
    const preferredLeft =
      sharpLeft != null && Number.isFinite(sharpLeft) ? sharpLeft : oddsLeft;
    const preferredLabel =
      sharpLeft != null && Number.isFinite(sharpLeft) ? "Sharp" : "Odds";
    return {
      id: "terminal-api",
      name: "Terminal API",
      status: res.ok ? "healthy" : "error",
      summary: res.ok
        ? `Native API online · ${feedOk}/${feedTotal} feeds configured${
            preferredLeft != null && Number.isFinite(preferredLeft)
              ? ` · ${preferredLabel} ${Math.round(preferredLeft).toLocaleString()} left`
              : ""
          }`
        : `HTTP ${res.status}`,
      metrics: [
        { label: "Host", value: appUrl.replace("https://", "") },
        ...(preferredLeft != null && Number.isFinite(preferredLeft)
          ? [{ label: `${preferredLabel} quota`, value: String(Math.round(preferredLeft)) }]
          : []),
      ],
      checklist: Object.entries(feeds).map(([key, value]) => ({ ok: value, label: `${key} feed` })),
      dashboardUrl: "https://vercel.com/dashboard",
      billingUrl: null,
    };
  } catch (error) {
    return {
      id: "terminal-api",
      name: "Terminal API",
      status: "error",
      summary: error instanceof Error ? error.message.slice(0, 60) : "Unreachable",
      metrics: [{ label: "Host", value: appUrl.replace("https://", "") }],
      checklist: [{ ok: false, label: "Health check failed" }],
      dashboardUrl: "https://vercel.com/dashboard",
      billingUrl: null,
    };
  }
}

function resendCard(): PlatformCard {
  const email = getEmailConfigStatus();
  return {
    id: "resend",
    name: "Resend",
    status: email.configured ? "healthy" : email.keyConfigured ? "warn" : "error",
    summary: email.configured ? "Email ready" : email.diagnostic || "Needs setup",
    metrics: [{ label: "From", value: email.fromAddress }],
    checklist: email.checklist,
    dashboardUrl: "https://resend.com/emails",
    billingUrl: "https://resend.com/settings/billing",
  };
}

function vercelCard(): PlatformCard {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  const onVercel = Boolean(process.env.VERCEL);
  return {
    id: "vercel",
    name: "Vercel",
    status: appUrl.startsWith("https://") ? "healthy" : "warn",
    summary: onVercel ? "Deployed on Vercel" : "Local / custom host",
    metrics: [
      { label: "App URL", value: appUrl || "—" },
      { label: "Environment", value: process.env.VERCEL_ENV ?? "local" },
    ],
    checklist: [
      { ok: Boolean(appUrl), label: "NEXT_PUBLIC_APP_URL set" },
      { ok: appUrl.startsWith("https://"), label: "HTTPS production URL" },
      { ok: hasResendApiKey(), label: "RESEND_API_KEY set" },
    ],
    dashboardUrl: "https://vercel.com/dashboard",
    billingUrl: "https://vercel.com/account/billing",
  };
}

export async function getPlatformMonitorSnapshot() {
  const [stripe, supabase, terminalApi] = await Promise.all([
    stripeCard(),
    supabaseCard(),
    terminalApiCard(),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    platforms: [vercelCard(), supabase, stripe, resendCard(), terminalApi],
  };
}

export async function getStripeStatusForAdmin() {
  const card = await stripeCard();
  return {
    configured: card.status === "healthy",
    mode: card.metrics.find((m) => m.label === "Mode")?.value ?? "unknown",
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.motivefxai.com"}/api/webhooks/stripe`,
    checklist: card.checklist,
  };
}
