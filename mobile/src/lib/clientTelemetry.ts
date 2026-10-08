import { Platform } from "react-native";
import { API_BASE, APP_VERSION, IOS_BUILD_NUMBER } from "../config";

type NativeClientError = {
  surface: string;
  errorName?: string;
  message?: string;
};

const recent = new Map<string, number>();

export function reportNativeClientError(input: NativeClientError): void {
  const key = [input.surface, input.errorName ?? "Error", input.message ?? ""].join("|").slice(0, 400);
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < 30_000) return;
  recent.set(key, now);

  void fetch(`${API_BASE}/client-error`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      platform: Platform.OS,
      surface: input.surface,
      errorName: (input.errorName ?? "Error").slice(0, 80),
      message: (input.message ?? "").slice(0, 1000),
      route: "native",
      appVersion: Platform.OS === "ios" ? `${APP_VERSION} (${IOS_BUILD_NUMBER})` : APP_VERSION,
    }),
  }).catch(() => undefined);
}
