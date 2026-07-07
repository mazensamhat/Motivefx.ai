import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getAdminApiKey, requireAdmin } from "@/lib/admin";
import { getBackendApiUrl } from "@/lib/backend";

async function proxyAdmin(request: Request, pathParts: string[]) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  const adminKey = getAdminApiKey();
  if (!adminKey) {
    return serverError("ADMIN_API_KEY is not set on Vercel.");
  }

  const path = pathParts.join("/");
  const url = new URL(request.url);
  const target = `${getBackendApiUrl()}/api/admin/${path}${url.search}`;

  const headers = new Headers();
  headers.set("X-Admin-Key", adminKey);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const res = await fetch(target, init);
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyAdmin(request, path);
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyAdmin(request, path);
}

export async function DELETE(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyAdmin(request, path);
}
