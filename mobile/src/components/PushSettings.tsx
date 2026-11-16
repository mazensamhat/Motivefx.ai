import { useEffect, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { enableNativePush, nativePushEnabled, observeNativePush, refreshNativePush, revokeNativePush } from "../lib/notifications";
import { colors } from "../theme";
const messages: Record<string, string> = { registered: "Push permission and device registration saved.", off: "Push alerts are off.", inactive: "Push is not active in this build.", unavailable: "Push is not available for this account yet.", sign_in_required: "Sign in to manage push alerts.", permission_denied: "Notification permission is off in device settings.", revocation_pending: "Revocation is pending. Reconnect to finish turning off push alerts." };
export function PushSettings({ onOpen }: { onOpen: (path: string) => void }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!nativePushEnabled()) return;
    let stopped = false, stop = () => {};
    void refreshNativePush().then(state => { if (!stopped && state === "revocation_pending") setMessage(messages[state]!); }).catch(() => {});
    void observeNativePush(onOpen).then(cleanup => { if (stopped) cleanup(); else stop = cleanup; }).catch(() => {});
    const listener = AppState.addEventListener("change", state => { if (state === "active") void refreshNativePush().catch(() => {}); });
    return () => { stopped = true; stop(); listener.remove(); };
  }, [onOpen, revision]);
  if (!nativePushEnabled()) return null;
  async function change(enable: boolean) { setBusy(true); try { const state = await (enable ? enableNativePush() : revokeNativePush()); setMessage(messages[state] ?? "Preferences saved."); setRevision(value => value + 1); } catch { setMessage("Push preferences could not be saved. Please reconnect and retry."); } finally { setBusy(false); } }
  return <View style={{ padding: 10, backgroundColor: colors.bg }}>
    <View style={{ flexDirection: "row", gap: 20 }}><Pressable disabled={busy} onPress={() => void change(true)} accessibilityRole="button"><Text style={{ color: colors.accent }}>Enable push alerts</Text></Pressable><Pressable disabled={busy} onPress={() => void change(false)} accessibilityRole="button"><Text style={{ color: colors.muted }}>Turn off push</Text></Pressable></View>
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, marginTop: 6 }}>{message}</Text>}
  </View>;
}
