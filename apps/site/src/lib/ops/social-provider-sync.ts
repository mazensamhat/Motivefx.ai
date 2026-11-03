import { prisma } from "@motivefx/database";
import { metaProfileObservation } from "./social-observation";

/** Read only already-connected company accounts; never discovers or grants access. */
export async function syncSocialProviders() {
  const startedAt = Date.now();
  const channels = await prisma.marketingChannel.findMany({
    where: { active: true }, include: { credentials: true }, take: 20,
  });
  const results: Array<{ channelId: string; status: string; error?: string }> = [];
  for (const channel of channels) {
    if (Date.now() - startedAt > 60_000) {
      results.push({ channelId: channel.id, status: "deferred" }); continue;
    }
    const platform = channel.platform.toLowerCase();
    if (platform !== "instagram" && platform !== "facebook") {
      results.push({ channelId: channel.id, status: "unsupported" }); continue;
    }
    const credential = channel.credentials;
    if (!credential?.accessToken?.trim() || !credential.accountId?.match(/^\d+$/) || /^(disconnected|revoked)$/i.test(credential.connectionStatus)) {
      results.push({ channelId: channel.id, status: "disconnected", error: "Connect this company account before syncing" }); continue;
    }
    try {
      const fields = platform === "instagram" ? "id,followers_count,media_count" : "id,followers_count";
      const url = new URL(`https://graph.facebook.com/v21.0/${credential.accountId}`);
      url.searchParams.set("fields", fields);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${credential.accessToken.trim()}` },
        cache: "no-store", signal: AbortSignal.timeout(5_000),
      });
      // Provider response/error bodies can contain credentials or unrelated
      // account information. Keep diagnostics to a status code only.
      if (!response.ok) throw new Error(`Provider account read failed (HTTP ${response.status})`);
      const observation = metaProfileObservation(platform, credential.accountId, await response.json());
      const observedAt = new Date();
      const snapshotDate = observedAt.toISOString().slice(0, 10);
      const previous = await prisma.socialMetricsSnapshot.findUnique({ where: { channelId_snapshotDate: { channelId: channel.id, snapshotDate } } });
      let previousAvailable: string[] = [];
      try { const available = JSON.parse(previous?.rawJson ?? "{}").availableMetrics; if (Array.isArray(available)) previousAvailable = available; } catch { /* No earlier provenance. */ }
      const availableMetrics = [...new Set([...previousAvailable, ...Object.entries(observation).filter(([, value]) => value != null).map(([key]) => key)])];
      const values = {
        ...(observation.followers == null ? {} : { followers: observation.followers }),
        ...(observation.postsCount == null ? {} : { postsCount: observation.postsCount }),
        rawJson: JSON.stringify({ source: "meta_graph_account", accountId: credential.accountId, observedAt: observedAt.toISOString(), availableMetrics }),
      };
      await prisma.$transaction([
        prisma.socialMetricsSnapshot.upsert({
          where: { channelId_snapshotDate: { channelId: channel.id, snapshotDate } },
          create: { channelId: channel.id, snapshotDate, ...values },
          update: { ...values, syncedAt: observedAt },
        }),
        prisma.socialChannelCredential.update({ where: { channelId: channel.id }, data: { connectionStatus: "connected", lastSyncAt: observedAt, syncError: null } }),
      ]);
      results.push({ channelId: channel.id, status: "synced" });
    } catch (error) {
      const message = error instanceof Error && /^(Provider |Connect )/.test(error.message) ? error.message : "Provider sync failed; retry or reconnect the company account";
      await prisma.socialChannelCredential.update({ where: { channelId: channel.id }, data: { connectionStatus: "sync_failed", syncError: message } });
      results.push({ channelId: channel.id, status: "failed", error: message });
    }
  }
  return { synced: results.filter(row => row.status === "synced").length, results };
}
