import { z } from "zod";
import { badRequest, json, unauthorized } from "@/lib/api";
import {
  REFRESH_COOKIE,
  createSessionPair,
  mobileSessionPayload,
  refreshSessionTokens,
} from "@/lib/session";
import { cookies } from "next/headers";

const schema = z.object({
  refreshToken: z.string().min(1).optional(),
  refresh_token: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid refresh request.");

  const cookieStore = await cookies();
  const refreshToken =
    parsed.data.refreshToken ??
    parsed.data.refresh_token ??
    cookieStore.get(REFRESH_COOKIE)?.value ??
    null;

  const refreshed = await refreshSessionTokens(refreshToken);
  if (!refreshed) return unauthorized("Session expired. Sign in again.");

  // createSessionPair re-checks current DB state and sets fresh browser cookies.
  // This second validation is intentionally kept here because refresh is rare and
  // it guarantees the response reflects the latest canonical email/account state.
  const tokens = await createSessionPair(refreshed.user);
  return json(
    mobileSessionPayload(
      refreshed.user,
      tokens.accessToken,
      tokens.refreshToken
    )
  );
}
