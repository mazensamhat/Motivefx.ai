import { prisma } from "@motivefx/database";
import { normalizePrefs } from "@/lib/terminal/engines";
import { upsertAlerts } from "@/lib/terminal/alerts";

export async function runPersistentWatchAgents(limitUsers = 300) {
  const prefsRows = await prisma.userIntelPref.findMany({ take: Math.max(1, Math.min(1000, limitUsers)) });
  const parsed = prefsRows.map((row) => ({ userId: row.userId, prefs: normalizePrefs(JSON.parse(row.prefsJson || "{}")) }));
  const agents = parsed.flatMap(({ userId, prefs }) => (prefs.watchAgents ?? []).filter((a) => a.enabled).map((agent) => ({ userId, agent })));
  const symbols = [...new Set(agents.map((x) => x.agent.symbol.toUpperCase()))];
  if (!symbols.length) return { users: prefsRows.length, agents: 0, triggered: 0 };

  const snapshots = await prisma.signalSnapshot.findMany({
    where: { symbol: { in: symbols } }, orderBy: { recordedAt: "desc" }, take: Math.min(5000, symbols.length * 8),
    select: { ledgerId: true, symbol: true, motiveSignal: true, confidence: true, recordedAt: true },
  });
  const bySymbol = new Map<string, typeof snapshots>();
  for (const row of snapshots) {
    const key = row.symbol.toUpperCase();
    const list = bySymbol.get(key) ?? [];
    if (list.length < 2) list.push(row);
    bySymbol.set(key, list);
  }
  let triggered = 0;
  for (const { userId, agent } of agents) {
    const rows = bySymbol.get(agent.symbol.toUpperCase()) ?? [];
    const latest = rows[0], prior = rows[1];
    if (!latest) continue;
    const signal = latest.motiveSignal;
    const confidence = latest.confidence;
    const change = signal != null && prior?.motiveSignal != null ? signal - prior.motiveSignal : null;
    const value = agent.metric === "confidence" ? confidence : agent.metric === "signal_change" ? (change == null ? null : Math.abs(change)) : signal;
    if (value == null || !Number.isFinite(value)) continue;
    const hit = agent.operator === "below" ? value < agent.threshold : value > agent.threshold;
    if (!hit) continue;
    const metricLabel = agent.metric === "confidence" ? "Evidence confidence" : agent.metric === "signal_change" ? "Signal change" : "Motive Signal";
    await upsertAlerts(userId, [{
      module: agent.module, symbol: agent.symbol,
      title: `Watch Agent: ${agent.name}`,
      body: `${metricLabel} ${Math.round(value * 10) / 10} ${agent.operator === "below" ? "<" : ">"} ${agent.threshold}. Triggered from recorded signal evidence; monitor-only.`,
      confidence: confidence == null ? undefined : Math.round(confidence),
      alertKey: `agent-${agent.id}-${latest.ledgerId}`,
    }]);
    triggered += 1;
  }
  return { users: prefsRows.length, agents: agents.length, triggered };
}
