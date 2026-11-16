import { deliveryEligibility, retryAt, type DeliveryJob, type DeliveryRecipient, type DeliveryState } from "./policy";

export type ProviderResult =
  | { kind: "accepted"; providerId: string }
  | { kind: "retry" | "failed" | "unknown" | "revoke_device"; code: string };
export type DeliveryResult = { state: DeliveryState; code?: string; providerId?: string; nextAttemptAt?: number };
export interface DeliveryStore {
  /** Atomically claim only one queued/retry row; increment its attempt count. */
  claim(key: string, now: number): Promise<DeliveryJob | null>;
  loadRecipient(job: DeliveryJob): Promise<DeliveryRecipient | null>;
  finish(key: string, attempt: number, result: DeliveryResult): Promise<void>;
  revokeDevice(job: DeliveryJob): Promise<void>;
}

export async function runDelivery(key: string, dependencies: {
  enabled: boolean;
  now: () => number;
  store: DeliveryStore;
  send: (job: DeliveryJob, recipient: DeliveryRecipient) => Promise<ProviderResult>;
}): Promise<DeliveryResult | { state: "disabled" | "not_claimed" }> {
  // This gate precedes every DB read/write and every provider call.
  if (!dependencies.enabled) return { state: "disabled" };
  const job = await dependencies.store.claim(key, dependencies.now());
  if (!job) return { state: "not_claimed" };
  let result: DeliveryResult;
  try {
    // Recheck entitlement, consent, address/device identity and suppression at
    // dispatch, not just at enqueue. Revoking consent cancels pending deliveries.
    const recipient = await dependencies.store.loadRecipient(job);
    const reason = deliveryEligibility({ ...job, attempts: job.attempts - 1 }, recipient, dependencies.now());
    if (reason) {
      result = { state: "suppressed", code: reason };
    } else {
      const response = await dependencies.send(job, recipient!);
      if (response.kind === "accepted") result = { state: "accepted", providerId: response.providerId };
      else if (response.kind === "revoke_device") {
        await dependencies.store.revokeDevice(job);
        result = { state: "suppressed", code: response.code };
      } else if (response.kind === "retry") {
        const next = retryAt(job, dependencies.now());
        result = next ? { state: "retry", code: response.code, nextAttemptAt: next } : { state: "failed", code: "retry_window_exhausted" };
      } else result = { state: response.kind, code: response.code };
    }
  } catch {
    // A crash or ambiguous provider response must not be automatically resent.
    result = { state: "unknown", code: "dispatch_unconfirmed" };
  }
  await dependencies.store.finish(key, job.attempts, result);
  return result;
}
