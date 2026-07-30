import { json, unauthorized, badRequest } from "@/lib/api";
import { resolveApiKeyBearer } from "@/lib/terminal/institutional";
import { planForUser, hasFeature } from "@/lib/terminal/plan";
import {
  buildProbabilityViews,
  detectConsensusBreaks,
  simulateFuture,
  buildSignalGraph,
  neighborsOf,
} from "@/lib/terminal/engines";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

async function requireApiUser(request: Request) {
  const row = await resolveApiKeyBearer(request.headers.get("authorization"));
  if (!row?.user) return { error: unauthorized("Invalid or revoked API key") as Response };
  const plan = planForUser(row.user);
  if (!hasFeature(plan, "api_access")) {
    return { error: unauthorized("API access requires Ultra+ or Elite") as Response };
  }
  return { user: row.user, plan };
}

/** GET /api/v1/intel/probability */
export async function GET(request: Request) {
  const auth = await requireApiUser(request);
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

  if (resource === "consensus") {
    const breaks = detectConsensusBreaks(
      opps as never[],
      sentiment,
      String(briefing.marketConfidence ?? "MODERATE")
    );
    return json({ consensusBreaks: breaks });
  }

  if (resource === "graph") {
    const graph = buildSignalGraph({
      boostSymbols: opps.map((o) => String(o.symbol ?? "")).filter(Boolean),
    });
    return json({ graph, neighbors: neighborsOf(graph, graph.activeNodeId) });
  }

  const views = buildProbabilityViews(opps as never[], sentiment);
  return json({ views: views.filter((v) => v.id.startsWith("theme-")) });
}

/** POST /api/v1/intel/simulate — same path file uses GET for reads; separate simulate route preferred.
 *  Kept here as POST on this catch-all for simplicity when resource=simulate via query is awkward.
 */
export async function POST(request: Request) {
  const auth = await requireApiUser(request);
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

  return json({
    simulation,
    disclaimer: "Educational scenario branches only — not forecasts or financial advice.",
  });
}
