import { prisma } from "@motivefx/database";

export type PublicComponentStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "unknown";

export type PublicStatusSnapshot = {
  checkedAt: string;
  overall: PublicComponentStatus;
  components: Array<{
    id: string;
    label: string;
    detail: string;
    status: PublicComponentStatus;
    history: Array<PublicComponentStatus | null>;
  }>;
  activeIssues: Array<{
    componentId: string;
    componentLabel: string;
    status: Exclude<PublicComponentStatus, "operational" | "unknown">;
  }>;
  historyAvailable: boolean;
  source: "audit" | "readiness";
};

type IncidentRow = {
  id: string;
  severity: string;
  domain: string;
  title: string;
  description: string;
  status: string;
  lastSeen: Date;
};

type SnapshotRow = {
  observedAt: Date;
  metadataJson: string;
};

const COMPONENTS = [
  {
    id: "web",
    label: "Website & Login",
    detail: "MotiveFX website, terminal access, authentication and sessions",
    terms: ["web", "website", "login", "auth", "session", "entitlement", "vercel", "database"],
  },
  {
    id: "feeds",
    label: "Market Data & Feeds",
    detail: "Stocks, crypto, news, odds and external market-data providers",
    terms: ["feed", "provider", "market data", "crypto", "stocks", "news", "odds", "whale", "screeners"],
  },
  {
    id: "portfolio",
    label: "Portfolios & Saved Items",
    detail: "Holdings, tracked counts, bets, predictions and saved-item review",
    terms: ["portfolio", "holding", "ledger", "tracked", "bet", "prediction", "saved"],
  },
  {
    id: "ai",
    label: "Ask Motive AI",
    detail: "Chief of Finance answers, grounding, latency and model access",
    terms: ["ask motive", "chief of finance", "openai", "ai", "model", "generation"],
  },
  {
    id: "signals",
    label: "Signals & Opportunity Radar",
    detail: "Motive Signal, Opportunity Radar, Signal Graph and deep intelligence",
    terms: ["signal", "radar", "opportunity", "graph", "theme", "intelligence"],
  },
  {
    id: "sports",
    label: "Sports & Predictions",
    detail: "Sports classification, line context and prediction-market intelligence",
    terms: ["sports", "betting", "hockey", "football", "prediction", "polymarket"],
  },
  {
    id: "mobile",
    label: "Mobile Apps",
    detail: "iOS and Android terminal experience",
    terms: ["ios", "android", "mobile", "native", "app crash", "anr"],
  },
  {
    id: "integrations",
    label: "Integrations & Providers",
    detail: "External services, notifications, billing and connected providers",
    terms: ["integration", "stripe", "resend", "notification", "webhook", "api"],
  },
] as const;

const VALID = new Set<PublicComponentStatus>([
  "operational",
  "degraded",
  "partial_outage",
  "major_outage",
  "unknown",
]);

function safeStatus(value: unknown): PublicComponentStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replace(/\s+/g, "_") as PublicComponentStatus;
  return VALID.has(normalized) ? normalized : null;
}

function parseMetadata(raw: string): Record<string, unknown> {
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function statusMap(raw: string | undefined): Record<string, PublicComponentStatus> {
  if (!raw) return {};
  const metadata = parseMetadata(raw);
  const candidate = metadata.componentStatus;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return {};
  return Object.fromEntries(
    Object.entries(candidate as Record<string, unknown>)
      .map(([key, value]) => [key, safeStatus(value)] as const)
      .filter((entry): entry is readonly [string, PublicComponentStatus] => Boolean(entry[1]))
  );
}

function rank(status: PublicComponentStatus): number {
  switch (status) {
    case "major_outage": return 5;
    case "partial_outage": return 4;
    case "degraded": return 3;
    case "unknown": return 2;
    case "operational":
    default: return 1;
  }
}

function maxStatus(a: PublicComponentStatus, b: PublicComponentStatus): PublicComponentStatus {
  return rank(b) > rank(a) ? b : a;
}

function incidentStatus(severity: string): Exclude<PublicComponentStatus, "operational" | "unknown"> | null {
  switch (severity.toUpperCase()) {
    case "CRITICAL": return "major_outage";
    case "HIGH": return "partial_outage";
    case "WARNING":
    case "MEDIUM": return "degraded";
    default: return null;
  }
}

function matchingComponentIds(row: IncidentRow): string[] {
  const haystack = [row.id, row.domain, row.title, row.description].join(" ").toLowerCase();
  return COMPONENTS
    .filter((component) => component.terms.some((term) => haystack.includes(term)))
    .map((component) => component.id);
}

export async function buildPublicStatusSnapshot(): Promise<PublicStatusSnapshot> {
  const now = new Date();
  const freshAfter = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const incidentAfter = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  let databaseReady = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseReady = false;
  }

  let latest: SnapshotRow | undefined;
  let dailyRows: SnapshotRow[] = [];
  let incidents: IncidentRow[] = [];
  let auditSourceAvailable = true;

  try {
    [latest, dailyRows, incidents] = await Promise.all([
      prisma.$queryRaw<SnapshotRow[]>`
        SELECT "observedAt", "metadataJson"
        FROM "OpsTelemetryEvent"
        WHERE "eventName" = 'system_status_snapshot'
          AND "product" = 'motivefx'
          AND "environment" = 'production'
          AND "observedAt" >= ${freshAfter}
        ORDER BY "observedAt" DESC
        LIMIT 1
      `.then((rows) => rows[0]),
      prisma.$queryRaw<SnapshotRow[]>`
        SELECT "observedAt", "metadataJson"
        FROM "OpsTelemetryEvent"
        WHERE "eventName" = 'system_status_snapshot'
          AND "product" = 'motivefx'
          AND "environment" = 'production'
          AND "metadataJson" LIKE '%"cadence":"daily"%'
        ORDER BY "observedAt" DESC
        LIMIT 89
      `,
      prisma.$queryRaw<IncidentRow[]>`
        SELECT "id", "severity", "domain", "title", "description", "status", "lastSeen"
        FROM "OpsIncidentRecord"
        WHERE LOWER("status") NOT IN ('resolved', 'closed', 'fixed')
          AND "lastSeen" >= ${incidentAfter}
        ORDER BY "lastSeen" DESC
        LIMIT 100
      `,
    ]);
  } catch {
    auditSourceAvailable = false;
  }

  const latestMap = statusMap(latest?.metadataJson);
  const statusById = new Map<string, PublicComponentStatus>();
  for (const component of COMPONENTS) {
    statusById.set(
      component.id,
      latestMap[component.id] ?? (latest ? "unknown" : auditSourceAvailable ? "unknown" : "unknown")
    );
  }

  if (!databaseReady) {
    statusById.set("web", "major_outage");
    statusById.set("portfolio", maxStatus(statusById.get("portfolio") ?? "unknown", "partial_outage"));
  } else if (!latest) {
    statusById.set("web", "operational");
  }

  const active = new Map<string, Exclude<PublicComponentStatus, "operational" | "unknown">>();
  for (const row of incidents) {
    const status = incidentStatus(row.severity);
    if (!status) continue;
    for (const componentId of matchingComponentIds(row)) {
      statusById.set(componentId, maxStatus(statusById.get(componentId) ?? "operational", status));
      const previous = active.get(componentId);
      if (!previous || rank(status) > rank(previous)) active.set(componentId, status);
    }
  }

  const historyRows = dailyRows.slice().reverse();
  const components = COMPONENTS.map((component) => ({
    id: component.id,
    label: component.label,
    detail: component.detail,
    status: statusById.get(component.id) ?? "unknown",
    history: historyRows.map((row) => statusMap(row.metadataJson)[component.id] ?? null),
  }));

  for (const component of components) {
    if (component.status !== "operational" && component.status !== "unknown" && !active.has(component.id)) {
      active.set(component.id, component.status);
    }
  }

  const activeIssues = components.flatMap((component) => {
    const status = active.get(component.id);
    return status ? [{ componentId: component.id, componentLabel: component.label, status }] : [];
  });

  const overall = components.reduce<PublicComponentStatus>(
    (current, component) => maxStatus(current, component.status),
    "operational"
  );

  return {
    checkedAt: (latest?.observedAt ?? now).toISOString(),
    overall,
    components,
    activeIssues,
    historyAvailable: dailyRows.length > 0,
    source: latest ? "audit" : "readiness",
  };
}
