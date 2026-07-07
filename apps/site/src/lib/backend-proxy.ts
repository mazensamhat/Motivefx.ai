import { getBackendApiUrl, getBackendSession } from "./backend";

const USER_ID_PATH_PATTERNS = [
  /\/portfolio\/[^/?]+/,
  /\/modules\/[^/?]+/,
  /\/bets\/[^/?]+/,
  /\/journal\/[^/?]+/,
  /\/alerts\/[^/?]+/,
  /\/watchlist\/[^/?]+/,
];

export function rewriteBackendPath(path: string, backendUserId: string): string {
  let out = path;
  for (const pattern of USER_ID_PATH_PATTERNS) {
    out = out.replace(pattern, (match) => {
      const prefix = match.slice(0, match.lastIndexOf("/") + 1);
      return `${prefix}${encodeURIComponent(backendUserId)}`;
    });
  }
  out = out.replace(/([?&])user_id=[^&]*/g, `$1user_id=${encodeURIComponent(backendUserId)}`);
  return out;
}

export function rewriteBackendBody(body: string | null, backendUserId: string): string | null {
  if (!body) return body;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && "user_id" in parsed) {
      parsed.user_id = backendUserId;
      return JSON.stringify(parsed);
    }
  } catch {
    /* non-json body */
  }
  return body;
}

export async function proxyBackendRequest(
  email: string,
  path: string,
  init: RequestInit = {},
  opts?: { forceSync?: boolean }
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const forceSync = opts?.forceSync ?? method !== "GET";
  const backend = await getBackendSession(email, { force: forceSync });
  if (!backend) {
    return Response.json(
      { detail: { message: "Backend unavailable. Check MOTIVEFX_API_URL and BACKEND_SYNC_SECRET." } },
      { status: 503 }
    );
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const rewrittenPath = rewriteBackendPath(normalizedPath, backend.userId);
  const url = `${getBackendApiUrl()}${rewrittenPath}`;

  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : rewriteBackendBody(
          typeof init.body === "string" ? init.body : init.body ? String(init.body) : null,
          backend.userId
        );

  return fetch(url, {
    ...init,
    method,
    body,
    headers: {
      ...(init.headers as Record<string, string>),
      Authorization: `Bearer ${backend.accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
}
