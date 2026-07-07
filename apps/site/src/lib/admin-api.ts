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
      signups: number;
      payments: number;
      churns: number;
      revenueUsd: number;
      conversionRate: number;
    }[];
  };
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

export async function adminGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api/admin${path}`, { cache: "no-store" });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(err.error ?? err.detail ?? `Admin request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function adminPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    method: "POST",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(err.error ?? err.detail ?? `Admin request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
