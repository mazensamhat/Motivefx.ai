export type ChiefWireMessage = { role: "user" | "assistant"; content: string };
export type ChiefReply = {
  reply: string;
  actions?: Array<{ type: string; tab?: string }>;
  followUps?: string[];
  degraded?: boolean;
};

function errorMessage(body: unknown, status: number): string {
  if (status === 401) return "Your session has expired. Sign in again to use Ask Motive.";
  if (status === 429) return "Ask Motive is busy. Please wait a moment, then retry.";
  if (status >= 500) return "Ask Motive could not finish because a service is unavailable. Your question is saved; retry shortly.";
  if (body && typeof body === "object") {
    const data = body as { detail?: unknown; error?: unknown };
    if (typeof data.detail === "string") return data.detail;
    if (data.detail && typeof data.detail === "object" && "message" in data.detail && typeof data.detail.message === "string") return data.detail.message;
    if (typeof data.error === "string") return data.error;
  }
  return `Ask Motive request failed (${status}). Please retry.`;
}

/** One bounded request. Retrying is explicit to avoid duplicate paid generations. */
export async function requestChief(
  messages: ChiefWireMessage[],
  context: { tab: string; symbol?: string },
  options: { signal?: AbortSignal; token?: string | null; fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<ChiefReply> {
  const ctrl = new AbortController();
  let timedOut = false;
  const abort = () => ctrl.abort();
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, options.timeoutMs ?? 50_000);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    const windowMessages = messages.slice(-24).map((m) => ({ ...m, content: m.content.slice(0, 4000) }));
    let body = JSON.stringify({ messages: windowMessages, context });
    while (body.length > 60_000 && windowMessages.length > 1) {
      windowMessages.shift();
      body = JSON.stringify({ messages: windowMessages, context });
    }
    const response = await (options.fetcher ?? fetch)("/api/ask-motive", {
      method: "POST", credentials: "same-origin", headers, signal: ctrl.signal,
      body,
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(errorMessage(data, response.status));
    if (!data || typeof data !== "object" || !("reply" in data) || typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("Ask Motive returned an empty response. Your question is saved; please retry.");
    }
    const reply = data as ChiefReply;
    return {
      reply: reply.reply,
      actions: Array.isArray(reply.actions) ? reply.actions.filter((a) => a && typeof a.type === "string") : [],
      followUps: Array.isArray(reply.followUps) ? reply.followUps.filter((s) => typeof s === "string") : [],
      degraded: reply.degraded === true,
    };
  } catch (error) {
    if (timedOut) throw new Error("Ask Motive took too long. Your question is saved; please retry.");
    if (options.signal?.aborted) throw new Error("Request stopped. Your question is saved.");
    if (error instanceof TypeError) throw new Error("Could not connect to Ask Motive. Check your connection and retry.");
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
