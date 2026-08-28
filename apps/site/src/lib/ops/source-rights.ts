/**
 * Source rights registry — fail-closed when unknown (Ops Master Plan §37).
 */

export type SourceRights = {
  providerId: string;
  displayAllowed: boolean;
  derivativeAnalyticsAllowed: boolean;
  storageAllowed: boolean;
  historicalRetentionDays: number | null;
  redistributionAllowed: boolean;
  aiProcessingAllowed: boolean;
  citationRequired: boolean;
  cacheDurationSeconds: number | null;
  rightsKnown: boolean;
  notes?: string;
};

/** Seed rights for known MotiveFX providers. Unknown → DO NOT PUBLISH. */
const REGISTRY: Record<string, SourceRights> = {
  finnhub: {
    providerId: "finnhub",
    displayAllowed: true,
    derivativeAnalyticsAllowed: true,
    storageAllowed: true,
    historicalRetentionDays: 90,
    redistributionAllowed: false,
    aiProcessingAllowed: true,
    citationRequired: false,
    cacheDurationSeconds: 60,
    rightsKnown: true,
  },
  coinstats: {
    providerId: "coinstats",
    displayAllowed: true,
    derivativeAnalyticsAllowed: true,
    storageAllowed: true,
    historicalRetentionDays: 90,
    redistributionAllowed: false,
    aiProcessingAllowed: true,
    citationRequired: false,
    cacheDurationSeconds: 60,
    rightsKnown: true,
  },
  "the-odds-api": {
    providerId: "the-odds-api",
    displayAllowed: true,
    derivativeAnalyticsAllowed: true,
    storageAllowed: true,
    historicalRetentionDays: 30,
    redistributionAllowed: false,
    aiProcessingAllowed: true,
    citationRequired: false,
    cacheDurationSeconds: 30,
    rightsKnown: true,
  },
  polymarket: {
    providerId: "polymarket",
    displayAllowed: true,
    derivativeAnalyticsAllowed: true,
    storageAllowed: true,
    historicalRetentionDays: 90,
    redistributionAllowed: false,
    aiProcessingAllowed: true,
    citationRequired: false,
    cacheDurationSeconds: 30,
    rightsKnown: true,
  },
  openai: {
    providerId: "openai",
    displayAllowed: true,
    derivativeAnalyticsAllowed: false,
    storageAllowed: true,
    historicalRetentionDays: 30,
    redistributionAllowed: false,
    aiProcessingAllowed: true,
    citationRequired: false,
    cacheDurationSeconds: null,
    rightsKnown: true,
    notes: "AI explanation only — never invent market facts",
  },
};

export function getSourceRights(providerId: string): SourceRights {
  const key = providerId.trim().toLowerCase();
  const known = REGISTRY[key];
  if (known) return known;
  return {
    providerId: key || "unknown",
    displayAllowed: false,
    derivativeAnalyticsAllowed: false,
    storageAllowed: false,
    historicalRetentionDays: null,
    redistributionAllowed: false,
    aiProcessingAllowed: false,
    citationRequired: true,
    cacheDurationSeconds: null,
    rightsKnown: false,
    notes: "DO NOT PUBLISH — rights unknown",
  };
}

export function mayDisplay(providerId: string): boolean {
  const r = getSourceRights(providerId);
  return r.rightsKnown && r.displayAllowed;
}

export function mayUseForDerivatives(providerId: string): boolean {
  const r = getSourceRights(providerId);
  return r.rightsKnown && r.derivativeAnalyticsAllowed;
}

export function mayProcessWithAi(providerId: string): boolean {
  const r = getSourceRights(providerId);
  return r.rightsKnown && r.aiProcessingAllowed;
}

export function listSourceRights(): SourceRights[] {
  return Object.values(REGISTRY);
}
