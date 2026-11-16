import type { DeliveryJob, DeliveryRecipient } from "./policy";
import { safeNotificationContent } from "./policy";
import type { ProviderResult } from "./worker";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function renderDailyEmail(job: DeliveryJob, options: { appUrl: string; unsubscribeUrl: string; postalAddress: string }) {
  const content = safeNotificationContent(job.content);
  const app = new URL(options.appUrl);
  const unsubscribe = new URL(options.unsubscribeUrl);
  if (app.protocol !== "https:" || unsubscribe.protocol !== "https:" || unsubscribe.origin !== app.origin || !options.postalAddress.trim()) throw new Error("Email identity and unsubscribe configuration required");
  const href = new URL(content.path, app).href;
  const footer = "Motive Signal describes evidence strength; it is not a calibrated forecast probability. Informational research only.";
  const text = `${content.title}\n\n${content.body}\n\nOpen MotiveFX: ${href}\n\n${footer}\n${options.postalAddress}\nUnsubscribe: ${unsubscribe.href}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(content.title)}</title></head><body><h1>${escapeHtml(content.title)}</h1><p>${escapeHtml(content.body).replace(/\n/g, "<br>")}</p><p><a href="${escapeHtml(href)}">Open MotiveFX</a></p><p>${footer}</p><p>${escapeHtml(options.postalAddress)}</p><p><a href="${escapeHtml(unsubscribe.href)}">Unsubscribe from Motive Daily</a></p></body></html>`;
  return { subject: content.title, html, text, headers: {
    "List-Unsubscribe": `<${unsubscribe.href}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  } };
}

/** Explicitly disabled unless the deployment is separately activated. Never log
 * recipient addresses, tokens, authorization headers, or provider response bodies. */
export async function sendDelivery(job: DeliveryJob, recipient: DeliveryRecipient, options: {
  enabled: boolean;
  resendApiKey?: string;
  from?: string;
  appUrl?: string;
  unsubscribeUrl?: string;
  postalAddress?: string;
  expoAccessToken?: string;
  fetcher?: typeof fetch;
}): Promise<ProviderResult> {
  if (!options.enabled) return { kind: "failed", code: "delivery_disabled" };
  const fetcher = options.fetcher ?? fetch;
  const content = safeNotificationContent(job.content);
  if (job.channel === "daily_email") {
    if (!options.resendApiKey || !options.from || !options.appUrl || !options.unsubscribeUrl || !options.postalAddress || !recipient.email) return { kind: "failed", code: "email_configuration_missing" };
    const email = renderDailyEmail(job, { appUrl: options.appUrl, unsubscribeUrl: options.unsubscribeUrl, postalAddress: options.postalAddress });
    try {
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST", signal: AbortSignal.timeout(10_000),
        headers: { Authorization: `Bearer ${options.resendApiKey}`, "Content-Type": "application/json", "Idempotency-Key": job.key },
        body: JSON.stringify({ from: options.from, to: [recipient.email], ...email,
          tags: [{ name: "motive_notification", value: job.key }] }),
      });
      if (response.status === 429 || response.status >= 500) return { kind: "retry", code: `email_http_${response.status}` };
      if (!response.ok) return { kind: "failed", code: `email_http_${response.status}` };
      const data = await response.json() as { id?: unknown };
      return typeof data.id === "string" && data.id ? { kind: "accepted", providerId: data.id } : { kind: "unknown", code: "email_ack_missing" };
    } catch { return { kind: "retry", code: "email_transport_uncertain" }; }
  }
  if (!recipient.pushToken) return { kind: "failed", code: "device_unavailable" };
  try {
    const response = await fetcher("https://exp.host/--/api/v2/push/send", {
      method: "POST", signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "application/json", Accept: "application/json",
        ...(options.expoAccessToken ? { Authorization: `Bearer ${options.expoAccessToken}` } : {}) },
      body: JSON.stringify({ to: recipient.pushToken, title: content.title, body: content.body.slice(0, 160), sound: "default", data: { eventKey: job.key, path: content.path } }),
    });
    if (response.status === 429) return { kind: "retry", code: "push_rate_limited" };
    // Expo does not offer our durable exactly-once key. Ambiguous network/5xx
    // outcomes require reconciliation rather than blind resend.
    if (response.status >= 500) return { kind: "unknown", code: "push_acceptance_unknown" };
    if (!response.ok) return { kind: "failed", code: `push_http_${response.status}` };
    const json = await response.json() as { data?: { status?: string; id?: string; details?: { error?: string } } };
    const ticket = json.data;
    if (ticket?.status === "ok" && ticket.id) return { kind: "accepted", providerId: ticket.id };
    if (ticket?.details?.error === "DeviceNotRegistered") return { kind: "revoke_device", code: "device_not_registered" };
    return { kind: "failed", code: "push_ticket_rejected" };
  } catch { return { kind: "unknown", code: "push_acceptance_unknown" }; }
}
