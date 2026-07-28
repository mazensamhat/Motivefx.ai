import { badRequest, json, serverError } from "@/lib/api";
import { accessErrorResponse, requireTerminalSession } from "@/lib/terminal/auth";
import { requireFeature } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { runAskMotive, type AskMessage } from "@/lib/ask-motive/run";
import { CHIEF_DISCLAIMER } from "@/lib/ask-motive/system-prompt";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;

  try {
    const plan = planForUser(auth.session.user);
    requireFeature(plan, "ask_motive");

    const body = (await request.json()) as {
      messages?: AskMessage[];
      context?: { tab?: string; symbol?: string };
    };

    const messages = (body.messages ?? []).filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    );

    if (!messages.length) return badRequest("Send at least one message.");
    if (messages.length > 24) return badRequest("Too many messages.");

    const user = auth.session.user;
    const result = await runAskMotive(messages, {
      userId: user.id,
      displayName: user.displayName ?? user.email?.split("@")[0] ?? null,
      plan,
      context: body.context,
    });

    return json({
      ...result,
      disclaimer: CHIEF_DISCLAIMER,
    });
  } catch (err) {
    try {
      return accessErrorResponse(err);
    } catch {
      const message = err instanceof Error ? err.message : "Chief unavailable";
      return serverError(message);
    }
  }
}
