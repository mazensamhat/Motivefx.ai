/**
 * Universal telemetry envelope (Ops Master Plan §7).
 */

import { resolveEventName, type MotiveFxEventName } from "./event-registry";
import { resolveDesk, resolveProduct, type MotiveFxDesk, type MotiveFxProduct } from "./product-registry";
import type { TruthState } from "./truth-state";

export type TelemetryStatus = "ok" | "error" | "timeout" | "suppressed" | "unknown";

export type SourceClass =
  | "user"
  | "system"
  | "provider"
  | "pipeline"
  | "ai"
  | "ops"
  | "unknown";

export type PrivacyClass =
  | "public"
  | "internal"
  | "pii"
  | "sensitive"
  | "restricted";

export type TelemetryEnvelope = {
  eventId: string;
  eventName: MotiveFxEventName;
  version: number;
  userId?: string;
  sessionId?: string;
  product?: MotiveFxProduct;
  desk?: MotiveFxDesk;
  symbol?: string;
  themeId?: string;
  signalId?: string;
  opportunityId?: string;
  provider?: string;
  environment: string;
  platform?: string;
  appVersion?: string;
  observedAt: string;
  ingestedAt: string;
  durationMs?: number;
  status?: TelemetryStatus;
  errorCode?: string;
  metadata: Record<string, unknown>;
  sourceClass: SourceClass;
  privacyClass: PrivacyClass;
  /** Optional truth state when the event carries market data. */
  truthState?: TruthState;
  /** Instrumentation flags when registries could not resolve inputs. */
  instrumentationErrors: string[];
};

export type TelemetryInput = {
  eventName: string;
  version?: number;
  userId?: string;
  sessionId?: string;
  product?: string;
  desk?: string;
  symbol?: string;
  themeId?: string;
  signalId?: string;
  opportunityId?: string;
  provider?: string;
  environment?: string;
  platform?: string;
  appVersion?: string;
  observedAt?: string;
  durationMs?: number;
  status?: TelemetryStatus;
  errorCode?: string;
  metadata?: Record<string, unknown>;
  sourceClass?: SourceClass;
  privacyClass?: PrivacyClass;
  truthState?: TruthState;
  eventId?: string;
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function resolveEnvironment(): string {
  return (
    process.env.VERCEL_ENV?.trim() ||
    process.env.NODE_ENV?.trim() ||
    "development"
  );
}

/** Build a normalized envelope. Unknown product/desk/event → UNKNOWN + instrumentationErrors. */
export function buildTelemetryEnvelope(input: TelemetryInput): TelemetryEnvelope {
  const instrumentationErrors: string[] = [];
  const event = resolveEventName(input.eventName);
  if (!event.known) instrumentationErrors.push(`unknown_event:${event.raw || "(empty)"}`);

  let product: MotiveFxProduct | undefined;
  if (input.product != null && input.product !== "") {
    const resolved = resolveProduct(input.product);
    product = resolved.value;
    if (!resolved.known) instrumentationErrors.push(`unknown_product:${resolved.raw}`);
  }

  let desk: MotiveFxDesk | undefined;
  if (input.desk != null && input.desk !== "") {
    const resolved = resolveDesk(input.desk);
    desk = resolved.value;
    if (!resolved.known) instrumentationErrors.push(`unknown_desk:${resolved.raw}`);
  }

  const now = new Date().toISOString();
  return {
    eventId: input.eventId ?? newId(),
    eventName: event.value,
    version: input.version ?? 1,
    userId: input.userId,
    sessionId: input.sessionId,
    product,
    desk,
    symbol: input.symbol,
    themeId: input.themeId,
    signalId: input.signalId,
    opportunityId: input.opportunityId,
    provider: input.provider,
    environment: input.environment ?? resolveEnvironment(),
    platform: input.platform,
    appVersion: input.appVersion,
    observedAt: input.observedAt ?? now,
    ingestedAt: now,
    durationMs: input.durationMs,
    status: input.status ?? "ok",
    errorCode: input.errorCode,
    metadata: input.metadata ?? {},
    sourceClass: input.sourceClass ?? "system",
    privacyClass: input.privacyClass ?? "internal",
    truthState: input.truthState,
    instrumentationErrors,
  };
}

/** In-memory ring buffer for Ops live feed until durable store lands. */
const RING_MAX = 200;
const ring: TelemetryEnvelope[] = [];

export function recordTelemetry(input: TelemetryInput): TelemetryEnvelope {
  const envelope = buildTelemetryEnvelope(input);
  ring.unshift(envelope);
  if (ring.length > RING_MAX) ring.length = RING_MAX;
  if (envelope.instrumentationErrors.length > 0) {
    console.warn("[ops/telemetry] instrumentation", envelope.eventId, envelope.instrumentationErrors);
  }
  return envelope;
}

export function getRecentTelemetry(limit = 50): TelemetryEnvelope[] {
  return ring.slice(0, Math.max(1, Math.min(limit, RING_MAX)));
}

export function telemetryInstrumentationStats(): {
  buffered: number;
  withErrors: number;
} {
  return {
    buffered: ring.length,
    withErrors: ring.filter((e) => e.instrumentationErrors.length > 0).length,
  };
}
