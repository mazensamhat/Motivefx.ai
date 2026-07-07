import { SITE_EMBED } from "./embed";

async function readSiteAuthError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
  return data.error ?? data.detail ?? `Request failed: ${res.status}`;
}

/** Authenticated site cookie API — used by embedded terminal account/security flows. */
export async function siteAuthPost<T>(path: string, body: unknown = {}): Promise<T> {
  if (!SITE_EMBED) {
    throw new Error("Site auth API is only available in the embedded terminal.");
  }
  const res = await fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readSiteAuthError(res));
  return res.json() as Promise<T>;
}

export async function openSiteBillingPortal(): Promise<void> {
  const res = await fetch("/api/billing/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: "{}",
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Billing portal unavailable.");
  }
  window.location.href = data.url;
}
