const ADMIN_KEY = "motivefx_admin_key";

export function getAdminKey(): string {
  return sessionStorage.getItem(ADMIN_KEY) ?? "";
}

export function setAdminKey(key: string) {
  sessionStorage.setItem(ADMIN_KEY, key);
}

export async function adminGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    headers: { "X-Admin-Key": getAdminKey() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Admin request failed: ${res.status}`);
  }
  return res.json();
}

export async function adminPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    method: "POST",
    headers: {
      "X-Admin-Key": getAdminKey(),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Admin request failed: ${res.status}`);
  }
  return res.json();
}

export interface AdminDashboard {
  generatedAt: string;
  kpis: {
    totalUsers: number;
    activeModuleSubscriptions: number;
    annualSubscribers: number;
    estimatedMrrUsd: number;
    usageEvents24h: number;
    churnEvents30d: number;
    annualPriceUsd: number;
  };
  subscriptionsByModule: { module: string; active: number; inactive: number }[];
  moduleHealth: {
    module: string;
    label: string;
    status: string;
    usage7d: number;
    avgLatencyMs: number;
    errors7d: number;
    ok: boolean;
  }[];
  activityHeatmap: {
    days: string[];
    modules: string[];
    cells: Record<string, Record<string, number>>;
    max: number;
  };
  moduleActivityRanking: { module: string; events: number; unique_users: number }[];
  churnByModule: { module: string; cancellations: number }[];
  demographics: {
    cohorts: { cohort: string; c: number }[];
    sex: { sex: string; c: number }[];
    gender: { gender: string; c: number }[];
    ageBuckets: { bucket: string; c: number }[];
    topLocations: { country: string; region: string; city: string; c: number }[];
    paymentMethods: { payment_method: string; c: number }[];
  };
  payments: {
    revenueUsd: number;
    transactions: number;
    avgTicketUsd: number;
    byPlanTier: { plan_tier: string; revenue: number; cnt: number }[];
    byPaymentMethod: { payment_method: string; revenue: number; cnt: number }[];
    recent: {
      user_id: string;
      amount_usd: number;
      payment_method: string;
      plan_tier: string;
      module: string;
      status: string;
      created_at: string;
    }[];
  };
  recentUsers: {
    user_id: string;
    cohort: string | null;
    age: number | null;
    sex: string | null;
    gender: string | null;
    city: string | null;
    country: string | null;
    payment_method: string | null;
    acquisition_channel: string | null;
    active_modules: string | null;
    last_seen_at: string;
  }[];
  channelPerformance?: {
    days: number;
    topRevenueChannel: string | null;
    channels: {
      id: string;
      platform: string;
      handle: string;
      url: string | null;
      visits?: number;
      visitToSignupRate?: number;
      socialFollowers?: number;
      socialImpressions?: number;
      socialLinkClicks?: number;
      lastSocialSync?: string;
      signups: number;
      subscriptions: number;
      payments: number;
      churns: number;
      revenueUsd: number;
      conversionRate: number;
    }[];
  };
}

export interface SocialIntegration {
  id: string;
  platform: string;
  handle: string;
  url: string | null;
  configured: boolean;
  credentialSource: string;
  connectionStatus: string;
  lastSyncAt: string | null;
  syncError: string | null;
  accountId: string | null;
  latestMetrics: {
    followers: number;
    impressions: number;
    profile_views: number;
    link_clicks: number;
    engagement_rate: number;
    synced_at: string;
  } | null;
}

export interface SocialIntegrationsResponse {
  integrations: SocialIntegration[];
}

export interface AdminAiAnalysis {
  snapshot: AdminDashboard;
  analysis: {
    generatedAt: string;
    model: string;
    narrative: string;
    highlights: { type: string; text: string }[];
  };
}
