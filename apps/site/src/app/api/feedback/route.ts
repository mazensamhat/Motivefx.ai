import { z } from "zod";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";
import { getBackendApiUrl } from "@/lib/backend";
import { getSession } from "@/lib/session";

const schema = z.object({
  kind: z.enum(["bug", "feature", "billing", "other"]),
  message: z.string().min(8).max(4000),
  pagePath: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest("Please write at least a few words describing your feedback.");
    }

    const secret = process.env.BACKEND_SYNC_SECRET?.trim();
    if (secret) {
      await fetch(`${getBackendApiUrl()}/api/internal/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Backend-Sync-Secret": secret,
        },
        body: JSON.stringify({
          email: session.email,
          kind: parsed.data.kind,
          message: parsed.data.message,
          page_path: parsed.data.pagePath ?? null,
        }),
      }).catch((err) => console.error("[feedback] backend forward failed", err));
    }

    console.info("[feedback]", {
      email: session.email,
      kind: parsed.data.kind,
      message: parsed.data.message.slice(0, 200),
      pagePath: parsed.data.pagePath,
    });

    return json({ ok: true }, 201);
  } catch (error) {
    console.error("[api/feedback]", error);
    return serverError("Could not save feedback.");
  }
}
