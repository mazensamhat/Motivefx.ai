import { json, unauthorized, badRequest } from "@/lib/api";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { resolveApiKeyBearer } from "@/lib/terminal/institutional";
import { hasFeature } from "@/lib/terminal/plan";
import {
  buildProbabilityViews,
  detectConsensusBreaks,
  simulateFuture,
  buildSignalGraph,
  neighborsOf,
} from "@/lib/terminal/engines";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { enforceApiRateLimit, withRateLimitHeaders } from "@/lib/terminal/api-metering";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

async function requireApiUser(request: Request, endpoint: string) {
  const row = await resolveApiKeyBearer(request.headers.get("authorization"));
  if (!row?.user) return { error: unauthorized("Invalid or revoked API key") as Response };
  const plan = await entitlementsPlanForUser(row.user);
  if (!hasFeature(plan, "api_access")) {
    return { error: unauthorized("API access requires Ultra+ or Elite") as Response };
  }
  const meter = await enforceApiRateLimit({
    userId: row.user.id,
    apiKeyId: row.id,
    tier: plan.tier,
    endpoint,
  });
  if (!meter.ok) return { error: meter.response };
  return { user: row.user, plan, rate: { remaining: meter.remaining, limit: meter.limit } };
}

/** GET /api/v1/intel?resource=… */
export async function GET(request: Request) {
  const auth = await requireApiUser(request, "/api/v1/intel");
  if ("error" in auth && auth.error) return auth.error;

  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") ?? "probability";

  const briefing = await buildHomeBriefing({
    displayName: auth.user!.displayName,
    userId: auth.user!.id,
    plan: auth.plan,
  });
  const opps = (briefing.opportunities as Array<Record<string, unknown>>) ?? [];
  const sentiment = (briefing.sentiment as { reddit?: string; x?: string; news?: string }) ?? {};

  let payload: Response;
  if (resource === "consensus") {
    const breaks = detectConsensusBreaks(
      opps as never[],
      sentiment,
      String(briefing.marketConfidence ?? "MODERATE")
    );
    payload = json({ consensusBreaks: breaks });
  } else if (resource === "graph") {
    const graph = buildSignalGraph({
      boostSymbols: opps.map((o) => String(o.symbol ?? "")).filter(Boolean),
    });
    payload = json({ graph, neighbors: neighborsOf(graph, graph.activeNodeId) });
  } else {
    const views = buildProbabilityViews(opps as never[], sentiment);
    payload = json({ views: views.filter((v) => v.id.startsWith("theme-")) });
  }

  return withRateLimitHeaders(payload, auth.rate!);
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request, "/api/v1/intel");
  if ("error" in auth && auth.error) return auth.error;

  let body: {
    seedEvent?: string;
    horizon?: string;
    symbols?: string[];
    baseProbability?: number;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("JSON body required");
  }

  const graph = buildSignalGraph({ boostSymbols: body.symbols ?? [] });
  const connected = neighborsOf(graph, graph.activeNodeId)
    .slice(0, 5)
    .map((n) => n.node?.label ?? "")
    .filter(Boolean);

  const simulation = simulateFuture({
    seedEvent: body.seedEvent,
    horizon: body.horizon,
    connectedEffects: connected,
    topSymbols: body.symbols,
    baseProbability: body.baseProbability,
  });

  return withRateLimitHeaders(
    json({
      simulation,
      disclaimer: "Educational scenario branches only — not forecasts or financial advice.",
    }),
    auth.rate!
  );
}
