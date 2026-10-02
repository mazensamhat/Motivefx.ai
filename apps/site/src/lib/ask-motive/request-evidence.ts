/** Request-local sharing only. Never cache a user's ledger in another user's request. */
export type PortfolioModule = "trades" | "crypto" | "penny" | "betting" | "predictions";
export const PORTFOLIO_MODULES: readonly PortfolioModule[] = ["trades", "crypto", "penny", "betting", "predictions"];
export type EvidenceFailure = {
  unavailable: true;
  empty: false;
  module?: PortfolioModule;
  message: string;
};
export type PortfolioEvidence = { module: PortfolioModule; empty: boolean; [key: string]: unknown };

export function unavailableEvidence(module?: PortfolioModule): EvidenceFailure {
  return { unavailable: true, empty: false, ...(module ? { module } : {}),
    message: "The data source did not complete. Saved positions are unknown, not empty. Do not tell the user to recreate holdings or invent a result." };
}

export function summarizePortfolioScan(results: PortfolioEvidence[]) {
  const unavailable = results.filter((r) => r.unavailable === true);
  const empty = results.filter((r) => r.unavailable !== true && r.empty === true);
  const withData = results.filter((r) => r.unavailable !== true && r.empty === false);
  return {
    desksScanned: results.length,
    desksWithData: withData.length,
    desksEmpty: empty.length,
    desksUnavailable: unavailable.length,
    partial: unavailable.length > 0,
    results,
    note: unavailable.length
      ? "Some saved ledgers could not be read. Describe only the successful results; unread ledgers are unknown, not empty. Do not ask the user to re-enter holdings as a repair."
      : results.length && empty.length === results.length
        ? "All selected, authorized ledgers were read successfully and contain no open positions."
        : "Summarize the successfully read ledgers. Signal scores are not probabilities or trade instructions.",
  };
}

/** Cache the original promise, including rejection. A timed-out read is not started twice. */
export function createRequestEvidence(signal: AbortSignal) {
  const reads = new Map<string, Promise<unknown>>();
  let started = 0;
  let reused = 0;
  return {
    read<T>(key: string, work: () => Promise<T>): Promise<T> {
      if (signal.aborted) return Promise.reject(new Error("ask_motive_cancelled"));
      const hit = reads.get(key);
      if (hit) { reused += 1; return hit as Promise<T>; }
      started += 1;
      const pending = Promise.resolve().then(() => {
        if (signal.aborted) throw new Error("ask_motive_cancelled");
        return work();
      });
      reads.set(key, pending);
      return pending;
    },
    stats() { return { readsStarted: started, readsReused: reused }; },
  };
}

/** Reserve the last model step for a visible answer instead of another tool call. */
export function finalAnswerStep(stepNumber: number): { toolChoice: "none" } | undefined {
  return stepNumber >= 3 ? { toolChoice: "none" } : undefined;
}

/** Stable diagnostics only: never log raw provider text, API keys, prompts or holdings. */
export function classifyAskFailure(error: unknown): string {
  const e = error && typeof error === "object" ? error as { name?: unknown; message?: unknown; statusCode?: unknown; code?: unknown } : {};
  const message = typeof e.message === "string" ? e.message : "";
  if (e.name === "AskDeadlineError") {
    if (message.endsWith(": session")) return "session_timeout";
    if (message.endsWith(": entitlements")) return "entitlements_timeout";
    if (message.endsWith(": request-body")) return "request_timeout";
    return "generation_timeout";
  }
  if (e.name === "AbortError" || e.name === "TimeoutError" || message === "ask_motive_cancelled") return "generation_cancelled";
  if (e.statusCode === 401 || e.statusCode === 403) return "provider_auth";
  if (e.statusCode === 429) return "provider_rate_limit";
  if (typeof e.statusCode === "number" && e.statusCode >= 400) return "provider_failure";
  if (e.code === "P2024" || /ECHECKOUTTIMEOUT|connection pool/i.test(message)) return "database_pool";
  if (message === "ask_motive_empty_response") return "empty_response";
  return "dependency_failure";
}
