import { z } from "zod";
import { accessErrorResponse, requireTerminalSession, AccessDeniedError, FeatureLockedError, ModuleLockedError } from "@/lib/terminal/auth";
import { requireFeature } from "@/lib/terminal/access";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { runAskMotiveBounded } from "@/lib/ask-motive/run-bounded";
import { withDeadline } from "@/lib/ask-motive/deadline";
import { classifyAskFailure } from "@/lib/ask-motive/request-evidence";
import { CHIEF_DISCLAIMER } from "@/lib/ask-motive/system-prompt";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const RequestBody = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) })).min(1).max(24),
  context: z.object({ tab: z.enum(["home", "stocks", "crypto", "penny", "betting", "predictions"]).optional(), symbol: z.string().max(100).optional() }).optional(),
});

export async function POST(request: Request) {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (request.signal.aborted) onAbort();
  else request.signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(onAbort, 44_000);
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  let stage = "session";
  const respond = (response: Response) => {
    response.headers.set("X-Motive-Request-Id", requestId);
    response.headers.set("Server-Timing", `motive;dur=${Date.now() - startedAt}`);
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  try {
    const auth = await withDeadline(() => requireTerminalSession(), 6_000, "session", ctrl.signal);
    if (!auth.ok) return respond(auth.response);
    stage = "entitlements";
    const plan = await withDeadline(() => entitlementsPlanForUser(auth.session.user), 6_000, "entitlements", ctrl.signal);
    requireFeature(plan, "ask_motive");
    stage = "request-body";
    const raw = await withDeadline(() => request.text(), 2_000, "request-body", ctrl.signal);
    if (raw.length > 64_000) return respond(Response.json({ error: "Message history is too large." }, { status: 413 }));
    let decoded: unknown;
    try { decoded = JSON.parse(raw); }
    catch { return respond(Response.json({ error: "Send a valid JSON message." }, { status: 400 })); }
    const body = RequestBody.safeParse(decoded);
    if (!body.success) return respond(Response.json({ error: "Send 1–24 user/assistant messages, each no longer than 4,000 characters." }, { status: 400 }));
    const user = auth.session.user;
    stage = "generation";
    const result = await runAskMotiveBounded(body.data.messages, {
      userId: user.id, displayName: user.displayName ?? user.email?.split("@")[0] ?? null,
      plan, context: body.data.context,
    }, ctrl.signal);
    return respond(Response.json({ ...result, disclaimer: CHIEF_DISCLAIMER }));
  } catch (err) {
    if (err instanceof AccessDeniedError || err instanceof FeatureLockedError || err instanceof ModuleLockedError) return respond(accessErrorResponse(err));
    const code = classifyAskFailure(err);
    console.error("[ask-motive] request_failed", { code, stage, requestId, elapsedMs: Date.now() - startedAt });
    return respond(Response.json({ detail: { code: "ask_motive_unavailable", requestId,
      message: "Ask Motive could not finish because a service is unavailable. Your question is saved; please retry shortly." } },
      { status: 503, headers: { "Retry-After": "10" } }));
  } finally {
    clearTimeout(timer); ctrl.abort(); request.signal.removeEventListener("abort", onAbort);
  }
}
