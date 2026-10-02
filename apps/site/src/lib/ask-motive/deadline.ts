export class AskDeadlineError extends Error {
  constructor(stage: string) { super(`Ask Motive deadline: ${stage}`); this.name = "AskDeadlineError"; }
}

/** Bounds waiting and clears timers/listeners. Callers must forward abort to cancellable I/O. */
export function withDeadline<T>(work: () => Promise<T>, ms: number, stage: string, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => { if (timer) clearTimeout(timer); signal?.removeEventListener("abort", onAbort); };
    const settle = (error: unknown, value?: T) => {
      if (settled) return;
      settled = true; cleanup();
      if (error !== null) reject(error); else resolve(value as T);
    };
    const onAbort = () => settle(new AskDeadlineError(stage));
    if (signal?.aborted) { onAbort(); return; }
    signal?.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(onAbort, ms);
    Promise.resolve().then(work).then((value) => settle(null, value), (error) => settle(error));
  });
}
