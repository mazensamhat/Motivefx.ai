/** Client recovery policy. Never clear authentication or application storage. */
export const CHUNK_RECOVERY_KEY = "motivefx:chunk-recovery:v1";

type ErrorLike = { name?: unknown; message?: unknown } | null | undefined;
type RecoveryStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
export type ChunkRecoveryResult = "not_chunk_error" | "offline" | "already_attempted" | "storage_unavailable" | "reload";

export function isChunkLoadFailure(error: ErrorLike): boolean {
  if (!error) return false;
  if (error.name === "ChunkLoadError") return true;
  const message = typeof error.message === "string" ? error.message : "";
  return /Loading (?:CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(message);
}

/** Claim one automatic reload for this browser tab. The marker survives reload
 * and is not cleared on another mount, route, release, or repeated error. If the
 * guard cannot be persisted, fail closed and leave recovery to an explicit click. */
export function claimChunkRecovery({ error, online, storage }: {
  error: ErrorLike;
  online: boolean;
  storage: () => RecoveryStorage;
}): ChunkRecoveryResult {
  if (!isChunkLoadFailure(error)) return "not_chunk_error";
  if (!online) return "offline";
  try {
    const guard = storage();
    if (guard.getItem(CHUNK_RECOVERY_KEY) !== null) return "already_attempted";
    guard.setItem(CHUNK_RECOVERY_KEY, "attempted");
    return guard.getItem(CHUNK_RECOVERY_KEY) === "attempted" ? "reload" : "storage_unavailable";
  } catch {
    return "storage_unavailable";
  }
}
