/**
 * MotiveFX iOS App Store shell (Expo WebView userAgent).
 * Free informational reader — market tabs must stay viewable without paid unlock.
 */
export function isNativeIosAppStoreRequest(request: Request): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  return /MotiveFXNative/i.test(ua) && /\(iOS/i.test(ua);
}