import { CONNECTED_NODES } from "@/lib/marketing-copy";
import type { GraphEdge, GraphNode, SignalGraph } from "./types";

/** Static macro relationship seed expanded into a weighted graph. */
const EXTRA_LINKS: Array<{ from: string; to: string; relation: string; weight: number }> = [
  { from: "Housing", to: "Banks", relation: "credit demand", weight: 0.82 },
  { from: "Banks", to: "Consumer Spending", relation: "lending conditions", weight: 0.74 },
  { from: "Oil", to: "Inflation", relation: "cost pressure", weight: 0.88 },
  { from: "Inflation", to: "Interest Rates", relation: "policy response", weight: 0.9 },
  { from: "Semiconductors", to: "AI / Tech", relation: "capacity constraint", weight: 0.86 },
  { from: "Energy", to: "AI / Tech", relation: "power demand", weight: 0.72 },
  { from: "Shipping", to: "Retail", relation: "inventory lag", weight: 0.7 },
];

function slug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Relationship Engine — builds a signal graph from macro seeds + live opportunity hints.
 * No graph DB yet: deterministic expansion with optional feed-driven edge boosts.
 */
export function buildSignalGraph(opts?: {
  activeNodeId?: string;
  boostSymbols?: string[];
}): SignalGraph {
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeKey = new Set<string>();

  function addNode(label: string, kind: GraphNode["kind"], id?: string) {
    const nid = id ?? slug(label);
    if (!nodeMap.has(nid)) {
      nodeMap.set(nid, { id: nid, label, kind });
    }
    return nid;
  }

  for (const seed of CONNECTED_NODES) {
    const fromId = addNode(seed.label, "macro", seed.id);
    for (const child of seed.connected) {
      const toId = addNode(child, "sector");
      const key = `${fromId}->${toId}`;
      if (!edgeKey.has(key)) {
        edgeKey.add(key);
        edges.push({
          from: fromId,
          to: toId,
          relation: "cascades to",
          weight: 0.75,
          evidenceIds: [`seed:${seed.id}`],
        });
      }
    }
  }

  for (const link of EXTRA_LINKS) {
    const fromId = addNode(link.from, "sector");
    const toId = addNode(link.to, nodeMap.get(slug(link.to))?.kind ?? "sector");
    const key = `${fromId}->${toId}:${link.relation}`;
    if (!edgeKey.has(key)) {
      edgeKey.add(key);
      edges.push({
        from: fromId,
        to: toId,
        relation: link.relation,
        weight: link.weight,
        evidenceIds: ["seed:extra"],
      });
    }
  }

  // Soft-boost edges when live symbols mention related themes
  const boosts = (opts?.boostSymbols ?? []).map((s) => s.toUpperCase());
  if (boosts.some((s) => ["XOM", "CVX", "OIL"].includes(s) || s.includes("OIL"))) {
    for (const e of edges) {
      if (e.from === "oil" || e.to.includes("inflat") || e.to === "oil") {
        e.weight = Math.min(0.98, e.weight + 0.08);
      }
    }
  }
  if (boosts.some((s) => ["NVDA", "AMD", "AVGO", "TSM"].includes(s))) {
    for (const e of edges) {
      if (e.from === "ai" || e.to.includes("semicond") || e.from.includes("semicond")) {
        e.weight = Math.min(0.98, e.weight + 0.1);
      }
    }
  }

  const activeNodeId =
    opts?.activeNodeId && nodeMap.has(opts.activeNodeId)
      ? opts.activeNodeId
      : CONNECTED_NODES[0]?.id ?? "rates";

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
    activeNodeId,
    generatedAt: new Date().toISOString(),
  };
}

export function neighborsOf(graph: SignalGraph, nodeId: string) {
  const outs = graph.edges
    .filter((e) => e.from === nodeId)
    .map((e) => ({
      ...e,
      node: graph.nodes.find((n) => n.id === e.to),
    }))
    .filter((x) => x.node);
  return outs.sort((a, b) => b.weight - a.weight);
}
