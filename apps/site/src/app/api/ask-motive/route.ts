import { z } from "zod";
import { accessErrorResponse, requireTerminalSession, AccessDeniedError, FeatureLockedError, ModuleLockedError } from "@/lib/terminal/auth";
import { requireFeature } from "@/lib/terminal/access";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { runAskMotiveBounded } from "@/lib/ask-motive/run-bounded";
import { AskDeadlineError, withDeadline } from "@/lib/ask-motive/deadline";
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
  // Authentication + plan + generation must finish before the platform kills the function.
  const timer = setTimeout(onAbort, 44_000);
  const startedAt = Date.now();
  try {
    const auth = await withDeadline(() => requireTerminalSession(), 6_000, "session", ctrl.signal);
    if (!auth.ok) return auth.response;
    const plan = await withDeadline(() => entitlementsPlanForUser(auth.session.user), 6_000, "entitlements", ctrl.signal);
    requireFeature(plan, "ask_motive");
    const raw = await withDeadline(() => request.text(), 2_000, "request-body", ctrl.signal);
    if (raw.length > 64_000) return Response.json({ error: "Message history is too large." }, { status: 413 });
    let decoded: unknown;
    try { decoded = JSON.parse(raw); }
    catch { return Response.json({ error: "Send a valid JSON message." }, { status: 400 }); }
    const body = RequestBody.safeParse(decoded);
    if (!body.success) return Response.json({ error: "Send 1–24 user/assistant messages, each no longer than 4,000 characters." }, { status: 400 });
    const user = auth.session.user;
    const result = await runAskMotiveBounded(body.data.messages, {
      userId: user.id, displayName: user.displayName ?? user.email?.split("@")[0] ?? null,
      plan, context: body.data.context,
    }, ctrl.signal);
    return Response.json({ ...result, disclaimer: CHIEF_DISCLAIMER }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AccessDeniedError || err instanceof FeatureLockedError || err instanceof ModuleLockedError) return accessErrorResponse(err);
    const timedOut = err instanceof AskDeadlineError || ctrl.signal.aborted;
    console.error("[ask-motive] request_failed", { code: timedOut ? "deadline" : "dependency", elapsedMs: Date.now() - startedAt });
    return Response.json({ detail: { code: timedOut ? "ask_motive_timeout" : "ask_motive_unavailable",
      message: "Ask Motive could not finish because a service is unavailable. Your question is saved; please retry shortly." } },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "10" } });
  } finally {
    clearTimeout(timer); ctrl.abort(); request.signal.removeEventListener("abort", onAbort);
  }
}
