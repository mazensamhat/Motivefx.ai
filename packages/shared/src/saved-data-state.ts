/** A failed read is unknown, never evidence that a customer's saved data is empty. */
export function unavailablePersonalized() {
  return {
    savedDataStatus: "unavailable" as const,
    holdingsCount: null,
    watchlistCount: null,
    radarSignalCount: null,
    coverageLine: null,
    intelNote: "Saved holdings and radar are temporarily unavailable. Retry to refresh them.",
    simRecord: null,
    radarHits: [] as Array<{ id: string; symbol: string; title: string; module: string; confidence: number }>,
  };
}

export function unavailableLedger() {
  return {
    trades: null, penny: null, crypto: null, betting: null, predictions: null,
    matched: { trades: null, penny: null, crypto: null, betting: null, predictions: null },
  };
}
