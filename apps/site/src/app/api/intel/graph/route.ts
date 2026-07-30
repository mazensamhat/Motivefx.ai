import { json } from "@/lib/api";
import { buildSignalGraph, neighborsOf } from "@/lib/terminal/engines";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const active = url.searchParams.get("node") ?? undefined;
  const boost = url.searchParams.get("boost")?.split(",").filter(Boolean) ?? [];
  const graph = buildSignalGraph({ activeNodeId: active, boostSymbols: boost });
  const neighbors = neighborsOf(graph, graph.activeNodeId);
  return json({ graph, neighbors });
}
