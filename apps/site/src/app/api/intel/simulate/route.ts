import { badRequest, json } from "@/lib/api";
import { buildSignalGraph, neighborsOf, simulateFuture } from "@/lib/terminal/engines";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    seedEvent?: string;
    horizon?: string;
    nodeId?: string;
    symbols?: string[];
    baseProbability?: number;
    pathCount?: number;
    aggressiveness?: "conservative" | "base" | "aggressive";
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("JSON body required");
  }

  const graph = buildSignalGraph({
    activeNodeId: body.nodeId,
    boostSymbols: body.symbols ?? [],
  });
  const connected = neighborsOf(graph, graph.activeNodeId)
    .slice(0, 5)
    .map((n) => n.node?.label ?? "")
    .filter(Boolean);

  const result = simulateFuture({
    seedEvent: body.seedEvent,
    horizon: body.horizon,
    connectedEffects: connected,
    topSymbols: body.symbols,
    baseProbability: body.baseProbability,
    pathCount: body.pathCount,
    aggressiveness: body.aggressiveness,
  });

  return json({ simulation: result, graphNode: graph.activeNodeId, connected });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seedEvent = url.searchParams.get("seed") ?? undefined;
  const horizon = url.searchParams.get("horizon") ?? undefined;
  const nodeId = url.searchParams.get("node") ?? undefined;
  const symbols = url.searchParams.get("symbols")?.split(",").filter(Boolean);
  const graph = buildSignalGraph({ activeNodeId: nodeId, boostSymbols: symbols });
  const connected = neighborsOf(graph, graph.activeNodeId)
    .slice(0, 5)
    .map((n) => n.node?.label ?? "")
    .filter(Boolean);
  const simulation = simulateFuture({
    seedEvent,
    horizon,
    connectedEffects: connected,
    topSymbols: symbols,
  });
  return json({ simulation, connected });
}
