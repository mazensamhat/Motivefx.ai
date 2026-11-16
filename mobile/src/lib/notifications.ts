import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { API_BASE } from "../config";
import { getUserId } from "./auth";
import { authenticatedFetch, fetchWithTimeout } from "./api";
import { createPushLifecycle, safePushPath, type PushRegistration } from "./push-lifecycle";
import appConfig from "../../app.json";
const STORAGE_KEY = "motivefx_push_registration_v1";
export function nativePushEnabled() { return Platform.OS === "android" && process.env.EXPO_PUBLIC_PUSH_ENABLED === "true"; }
async function readRegistration(): Promise<PushRegistration | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY); if (!raw) return null;
  const value = JSON.parse(raw) as PushRegistration;
  if (!value.userId || !value.deviceId || !value.revocationToken) throw new Error("Push preferences need recovery");
  return value;
}
async function writeRegistration(value: PushRegistration | null) {
  if (value) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value)); else await AsyncStorage.removeItem(STORAGE_KEY);
}
const lifecycle = createPushLifecycle({
  enabled: nativePushEnabled, platform: () => Platform.OS, userId: getUserId, read: readRegistration, write: writeRegistration,
  available: async () => {
    const response = await authenticatedFetch(`${API_BASE}/notifications/preferences`);
    return response.ok && (await response.json()).pushRegistrationAvailable === true;
  },
  permission: async ask => {
    const notifications = await import("expo-notifications");
    await notifications.setNotificationChannelAsync("motivefx-alerts", { name: "MotiveFX research alerts", importance: notifications.AndroidImportance.DEFAULT });
    let permission = await notifications.getPermissionsAsync();
    if (permission.status !== "granted" && ask) permission = await notifications.requestPermissionsAsync();
    return permission.status === "granted";
  },
  token: async () => (await (await import("expo-notifications")).getExpoPushTokenAsync({ projectId: appConfig.expo.extra.eas.projectId })).data,
  register: async token => {
    const response = await authenticatedFetch(`${API_BASE}/notifications/devices`, { method: "POST", body: JSON.stringify({ token, platform: "android", permission: "granted" }) });
    if (!response.ok) throw new Error("Push registration is unavailable. Check your plan and device preferences.");
    return response.json();
  },
  revoke: async token => {
    try { return (await fetchWithTimeout(`${API_BASE}/notifications/devices/revoke`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }, 8000)).ok; }
    catch { return false; }
  },
});
export const enableNativePush = () => lifecycle.enable();
export const refreshNativePush = () => lifecycle.refresh();
export const revokeNativePush = () => lifecycle.revoke();
export async function observeNativePush(onOpen: (path: string) => void): Promise<() => void> {
  if (!nativePushEnabled()) return () => {};
  const record = await readRegistration(), userId = await getUserId();
  if (!record || record.pendingRevocation || record.userId !== userId) return () => {};
  const notifications = await import("expo-notifications");
  const handle = async (response: import("expo-notifications").NotificationResponse | null) => {
    const current = await readRegistration();
    if (!current || current.pendingRevocation || current.userId !== await getUserId()) return;
    const path = safePushPath(response?.notification.request.content.data?.path);
    if (path) { onOpen(path); await notifications.clearLastNotificationResponseAsync(); }
  };
  await handle(await notifications.getLastNotificationResponseAsync());
  const tap = notifications.addNotificationResponseReceivedListener(response => { void handle(response).catch(() => {}); });
  const token = notifications.addPushTokenListener(() => { void lifecycle.refresh().catch(() => {}); });
  return () => { tap.remove(); token.remove(); };
}
