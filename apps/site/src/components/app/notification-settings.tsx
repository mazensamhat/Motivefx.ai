"use client";
import { useCallback, useEffect, useState } from "react";
type Preferences = { state: string; deliveryActive?: boolean; verificationAvailable?: boolean; emailVerified?: boolean; dailyEligible?: boolean; dailyEnabled?: boolean; emailSuppressed?: boolean; devices?: Array<{ id: string; platform: string }> };
export function NotificationSettings() {
  const [prefs, setPrefs] = useState<Preferences | null>(null), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    try { const response = await fetch("/api/notifications/preferences", { cache: "no-store" }); if (!response.ok) throw new Error(); setPrefs(await response.json()); }
    catch { setPrefs({ state: "unavailable" }); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  async function mutate(path: string, body: unknown, method = "POST") {
    setBusy(true); setMessage("");
    try { const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); setMessage(data.message ?? data.error ?? (response.ok ? "Preferences saved." : `Could not save: ${data.state ?? "please retry"}.`)); await reload(); }
    catch { setMessage("Could not reach the server. Please retry."); }
    finally { setBusy(false); }
  }
  return <section className="app-panel space-y-4"><h2 className="font-semibold text-white">Email and notifications</h2>
    {!prefs && <p className="text-sm text-slate-400">Loading preferences…</p>}
    {prefs?.state === "inactive" && <p className="text-sm text-slate-400">Email verification, Motive Daily email and background push are not active yet. Saved alerts remain available in the app.</p>}
    {prefs?.state === "unavailable" && <p role="alert" className="text-sm text-amber-400">Preferences are temporarily unavailable. Your existing choices have not been changed.</p>}
    {prefs?.state === "available" && <>
      <p className="text-sm text-slate-400">Email address: {prefs.emailVerified ? "Verified" : "Not verified"}.</p>
      {!prefs.emailVerified && <button className="app-cta-btn" disabled={busy || !prefs.verificationAvailable} onClick={() => void mutate("/api/auth/email-verification", { purpose: "account" })}>Send verification email</button>}
      <p className="text-sm text-slate-400">Motive Daily: {prefs.dailyEnabled ? "Subscribed" : "Off"}. {!prefs.deliveryActive && "Delivery is not active yet."}</p>
      {prefs.dailyEnabled ? <button className="app-cta-btn" disabled={busy} onClick={() => void mutate("/api/notifications/preferences", { channel: "daily_email", enabled: false })}>Unsubscribe from Motive Daily</button> : <>
        <p className="text-sm text-slate-400">Choose to receive daily research email, then confirm your address using the email link. You can unsubscribe at any time.</p>
        <button className="app-cta-btn" disabled={busy || !prefs.verificationAvailable || !prefs.dailyEligible || prefs.emailSuppressed} onClick={() => void mutate("/api/auth/email-verification", { purpose: "daily_email" })}>Request Motive Daily confirmation</button>
      </>}
      {prefs.emailSuppressed && <p className="text-sm text-amber-400">Email delivery is suppressed. Contact support before requesting another subscription.</p>}
      <h3 className="text-sm font-semibold text-white">Push devices</h3>
      {!prefs.devices?.length && <p className="text-sm text-slate-400">No registered devices. Push permission must be granted in a supported native build.</p>}
      {prefs.devices?.map(device => <div key={device.id} className="flex items-center gap-3 text-sm text-slate-400"><span>{device.platform} device</span><button className="app-cta-btn" disabled={busy} onClick={() => void mutate("/api/notifications/devices", { deviceId: device.id }, "DELETE")}>Revoke</button></div>)}
      {!!prefs.devices?.length && <button className="app-cta-btn" disabled={busy} onClick={() => void mutate("/api/notifications/preferences", { channel: "expo_push", enabled: false })}>Turn off all push alerts</button>}
    </>}
    {message && <p role="status" className="text-sm text-slate-300">{message}</p>}
  </section>;
}
