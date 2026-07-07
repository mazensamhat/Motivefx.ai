import { badRequest, json, unauthorized } from "@/lib/api";
import { proxyBackendRequest } from "@/lib/backend-proxy";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function targetPath(request: Request): string | null {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path || !path.startsWith("/api/")) return null;
  const extra = url.searchParams.toString();
  const withoutPath = extra
    .split("&")
    .filter((p) => !p.startsWith("path="))
    .join("&");
  if (!withoutPath) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}${withoutPath}`;
}

async function handle(request: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const path = targetPath(request);
  if (!path) return badRequest("Missing or invalid path.");

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await request.text().catch(() => undefined);

  const upstream = await proxyBackendRequest(
    session.email,
    path,
    {
      method,
      body,
      headers: { "Content-Type": "application/json" },
    },
    { forceSync: method !== "GET" }
  );

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}

export async function PATCH(request: Request) {
  return handle(request);
}

export async function PUT(request: Request) {
  return handle(request);
}
