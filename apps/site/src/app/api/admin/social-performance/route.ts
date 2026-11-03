import { prisma } from "@motivefx/database";
import { requireAdminCapability } from "@/lib/admin";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import { recordAudit } from "@/lib/ops/audit";
import { SOCIAL_METRICS, observedMetrics } from "@/lib/ops/social-observation";
import { syncSocialProviders } from "@/lib/ops/social-provider-sync";

export const maxDuration = 120;

function finiteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function finiteInt(value: unknown, fallback = 0): number {
  return Math.max(0, Math.round(finiteNumber(value, fallback)));
}

export async function GET() {
  const auth = await requireAdminCapability("view_revenue");
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const [channels, recent, creativeCount] = await Promise.all([
      prisma.marketingChannel.findMany({
        orderBy: { platform: "asc" },
        include: {
          credentials: {
            select: {
              connectionStatus: true,
              lastSyncAt: true,
              syncError: true,
            },
          },
        },
      }),
      prisma.socialMetricsSnapshot.findMany({
        orderBy: { syncedAt: "desc" },
        take: 100,
        include: {
          channel: { select: { platform: true, handle: true } },
        },
      }),
      prisma.creativePerformanceEvent.count(),
    ]);

    const latestByChannel = new Map<string, (typeof recent)[number]>();
    for (const row of recent) {
      if (!latestByChannel.has(row.channelId)) latestByChannel.set(row.channelId, row);
    }

    return json({
      generatedAt: new Date().toISOString(),
      creativePerformanceEvents: creativeCount,
      channels: channels.map((channel) => {
        const latest = latestByChannel.get(channel.id);
        return {
          id: channel.id,
          platform: channel.platform,
          handle: channel.handle,
          url: channel.url,
          active: channel.active,
          connectionStatus: channel.credentials?.connectionStatus ?? "disconnected",
          lastSyncAt: channel.credentials?.lastSyncAt?.toISOString() ?? null,
          syncError: channel.credentials?.syncError ?? null,
          latest: latest
            ? {
                snapshotDate: latest.snapshotDate,
                ...observedMetrics(latest),
                syncedAt: latest.syncedAt.toISOString(),
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error("[admin/social-performance GET]", error);
    return serverError("Could not load social performance.");
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminCapability("manage_runtime_config");
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      channelId?: string;
      platform?: string;
      handle?: string | null;
      url?: string | null;
      snapshotDate?: string;
      followers?: number;
      impressions?: number;
      profileViews?: number;
      linkClicks?: number;
      engagementRate?: number;
      postsCount?: number;
      raw?: unknown;
      creative?: {
        runId?: string;
        hypothesisId?: string;
        traderPersona?: string;
        hookFamily?: string;
        visualStrategy?: string;
        videoOpening?: string;
        captionStructure?: string;
        productFeature?: string;
        cta?: string;
        hold3s?: number;
        watchTimeSec?: number;
        landings?: number;
        signups?: number;
        activations?: number;
        paid?: number;
        notes?: string;
      };
    };

    if (body.action === "sync_providers") {
      const result = await syncSocialProviders();
      recordAudit({ actorId: auth.session.id, actorEmail: auth.session.email, action: "social.providers.sync", capability: "manage_runtime_config", result: result.results.some(row => row.status === "failed" || row.status === "disconnected") ? "partial" : "success", after: result });
      return json(result);
    }

    const platform = body.platform?.trim();
    const channelId = body.channelId?.trim() || (platform ? platform.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "");
    if (!channelId || !platform) return badRequest("channelId and platform are required");

    const date = body.snapshotDate?.trim() || new Date().toISOString().slice(0, 10);
    const channel = await prisma.marketingChannel.upsert({
      where: { id: channelId },
      create: {
        id: channelId,
        platform,
        handle: body.handle ?? null,
        url: body.url ?? null,
        active: true,
      },
      update: {
        platform,
        handle: body.handle === undefined ? undefined : body.handle,
        url: body.url === undefined ? undefined : body.url,
      },
    });

    const previous = await prisma.socialMetricsSnapshot.findUnique({ where: { channelId_snapshotDate: { channelId: channel.id, snapshotDate: date } } });
    let previousAvailable: string[] = [];
    try { const available = JSON.parse(previous?.rawJson ?? "{}").availableMetrics; if (Array.isArray(available)) previousAvailable = available; } catch { /* No earlier provenance. */ }
    const providedMetrics = SOCIAL_METRICS.filter(key => body[key] != null && Number.isFinite(Number(body[key])) && Number(body[key]) >= 0);
    const rawJson = JSON.stringify({ source: "admin_import", payload: body.raw ?? null,
      availableMetrics: [...new Set([...previousAvailable, ...providedMetrics])],
    });
    const updatingObservation = SOCIAL_METRICS.some(key => body[key] !== undefined) || body.raw != null;

    const snapshot = await prisma.socialMetricsSnapshot.upsert({
      where: {
        channelId_snapshotDate: {
          channelId: channel.id,
          snapshotDate: date,
        },
      },
      create: {
        channelId: channel.id,
        snapshotDate: date,
        followers: finiteInt(body.followers),
        impressions: finiteInt(body.impressions),
        profileViews: finiteInt(body.profileViews),
        linkClicks: finiteInt(body.linkClicks),
        engagementRate: finiteNumber(body.engagementRate),
        postsCount: finiteInt(body.postsCount),
        rawJson,
      },
      update: {
        followers: body.followers === undefined ? undefined : finiteInt(body.followers),
        impressions: body.impressions === undefined ? undefined : finiteInt(body.impressions),
        profileViews: body.profileViews === undefined ? undefined : finiteInt(body.profileViews),
        linkClicks: body.linkClicks === undefined ? undefined : finiteInt(body.linkClicks),
        engagementRate: body.engagementRate === undefined ? undefined : finiteNumber(body.engagementRate),
        postsCount: body.postsCount === undefined ? undefined : finiteInt(body.postsCount),
        rawJson: updatingObservation ? rawJson : undefined,
        syncedAt: new Date(),
      },
    });

    let creativeEventId: string | null = null;
    if (body.creative) {
      const event = await prisma.creativePerformanceEvent.create({
        data: {
          runId: body.creative.runId || null,
          hypothesisId: body.creative.hypothesisId || null,
          platform,
          traderPersona: body.creative.traderPersona || null,
          hookFamily: body.creative.hookFamily || null,
          visualStrategy: body.creative.visualStrategy || null,
          videoOpening: body.creative.videoOpening || null,
          captionStructure: body.creative.captionStructure || null,
          productFeature: body.creative.productFeature || null,
          cta: body.creative.cta || null,
          impressions: finiteInt(body.impressions),
          hold3s: finiteInt(body.creative.hold3s),
          watchTimeSec: finiteNumber(body.creative.watchTimeSec),
          clicks: finiteInt(body.linkClicks),
          landings: finiteInt(body.creative.landings),
          signups: finiteInt(body.creative.signups),
          activations: finiteInt(body.creative.activations),
          paid: finiteInt(body.creative.paid),
          notes: body.creative.notes || null,
          createdBy: auth.session.email,
        },
      });
      creativeEventId = event.id;
    }

    recordAudit({
      actorId: auth.session.id,
      actorEmail: auth.session.email,
      action: "social.performance.ingest",
      capability: "manage_runtime_config",
      risk: "MEDIUM",
      targetType: "marketing_channel",
      targetId: channel.id,
      result: "success",
      after: {
        snapshotDate: snapshot.snapshotDate,
        platform,
        creativeEventId,
      },
    });

    return json({
      ok: true,
      channelId: channel.id,
      snapshotId: snapshot.id,
      creativeEventId,
    });
  } catch (error) {
    console.error("[admin/social-performance POST]", error);
    return serverError("Could not ingest social performance.");
  }
}
