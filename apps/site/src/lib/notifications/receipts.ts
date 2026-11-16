import { Webhook } from "svix";

export type EmailReceipt = { id: string; eventType: string; providerId: string; deliveryKey: string; state: "provider_confirmed" | "suppressed" | "failed"; suppress: boolean };

export function verifyEmailReceipt(rawBody: string, headers: Headers, secret: string): EmailReceipt | null {
  if (Buffer.byteLength(rawBody, "utf8") > 65_536) throw new Error("receipt_payload_too_large");
  const id = headers.get("svix-id") ?? "";
  new Webhook(secret).verify(rawBody, {
    "svix-id": id,
    "svix-timestamp": headers.get("svix-timestamp") ?? "",
    "svix-signature": headers.get("svix-signature") ?? "",
  });
  const event = JSON.parse(rawBody) as { type?: unknown; data?: { email_id?: unknown; tags?: { motive_notification?: unknown } } };
  const type = event.type;
  if (typeof type !== "string" || !["email.delivered", "email.bounced", "email.complained", "email.suppressed", "email.failed"].includes(type)) return null;
  const deliveryKey = event.data?.tags?.motive_notification;
  // This Resend account is shared with other Motive products and transactional
  // mail. Do not retry or modify unrelated messages from that account.
  if (typeof deliveryKey !== "string" || !/^motivefx-v1-[a-f0-9]{64}$/.test(deliveryKey)) return null;
  if (!id || id.length > 200 || typeof event.data?.email_id !== "string" || !event.data.email_id || event.data.email_id.length > 200) throw new Error("receipt_identity_invalid");
  const suppress = ["email.bounced", "email.complained", "email.suppressed"].includes(type);
  return { id: `resend:${id}`, eventType: type, providerId: event.data.email_id, deliveryKey, suppress,
    state: suppress ? "suppressed" : type === "email.delivered" ? "provider_confirmed" : "failed" };
}

export function classifyPushReceipt(raw: unknown): "provider_confirmed" | "revoke_device" | "failed" | "pending" {
  if (!raw || typeof raw !== "object") return "pending";
  const receipt = raw as { status?: unknown; details?: { error?: unknown } };
  if (receipt.status === "ok") return "provider_confirmed";
  if (receipt.details?.error === "DeviceNotRegistered") return "revoke_device";
  return receipt.status === "error" ? "failed" : "pending";
}
