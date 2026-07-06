/** Record a visit from a marketing channel (bio link / UTM landing). */
import { resolveAcquisitionChannel } from "./acquisition";

export async function trackChannelVisit(channel: string, userId?: string): Promise<void> {
  try {
    const params = new URLSearchParams({ channel });
    if (userId) params.set("user_id", userId);
    await fetch(`/api/track/visit?${params.toString()}`);
  } catch {
    /* non-blocking */
  }
}

/** On app load: capture UTM, log visit, first-touch sync to profile. */
export async function persistAcquisitionOnLoad(userId: string): Promise<string | null> {
  const channel = resolveAcquisitionChannel();
  if (!channel) return null;
  await trackChannelVisit(channel, userId);
  try {
    await fetch("/api/advisor/profile/acquisition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, acquisition_channel: channel }),
    });
  } catch {
    /* non-blocking */
  }
  return channel;
}
