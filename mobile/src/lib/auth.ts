/**
 * Session storage. SecureStore is loaded lazily so a native-module failure
 * cannot crash the app during JS bundle evaluation (Android clear-cache loop).
 */

const ACCESS_KEY = "motivefx_access_token";
const REFRESH_KEY = "motivefx_refresh_token";
const USER_KEY = "motivefx_auth_user_id";

export interface AuthUser {
  userId: string;
  email: string;
  displayName?: string | null;
  totpEnabled?: boolean;
}

type SecureStoreModule = typeof import("expo-secure-store");

let secureStorePromise: Promise<SecureStoreModule | null> | null = null;

async function getSecureStore(): Promise<SecureStoreModule | null> {
  if (!secureStorePromise) {
    secureStorePromise = import("expo-secure-store")
      .then((mod) => mod)
      .catch((e) => {
        console.warn("expo-secure-store unavailable", e);
        return null;
      });
  }
  return secureStorePromise;
}

async function safeGet(key: string): Promise<string | null> {
  try {
    const store = await getSecureStore();
    if (!store) return null;
    return await store.getItemAsync(key);
  } catch (e) {
    console.warn(`SecureStore get failed for ${key}`, e);
    return null;
  }
}

async function safeSet(key: string, value: string): Promise<void> {
  try {
    const store = await getSecureStore();
    if (!store) return;
    await store.setItemAsync(key, value);
  } catch (e) {
    console.warn(`SecureStore set failed for ${key}`, e);
  }
}

async function safeDelete(key: string): Promise<void> {
  try {
    const store = await getSecureStore();
    if (!store) return;
    await store.deleteItemAsync(key);
  } catch (e) {
    console.warn(`SecureStore delete failed for ${key}`, e);
  }
}

export async function getAccessToken(): Promise<string | null> {
  return safeGet(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return safeGet(REFRESH_KEY);
}

export async function getUserId(): Promise<string | null> {
  return safeGet(USER_KEY);
}

export async function setSession(
  accessToken: string,
  refreshToken: string,
  user: AuthUser
): Promise<void> {
  await safeSet(ACCESS_KEY, accessToken);
  await safeSet(REFRESH_KEY, refreshToken);
  await safeSet(USER_KEY, user.userId);
}

export async function clearSession(): Promise<void> {
  await safeDelete(ACCESS_KEY);
  await safeDelete(REFRESH_KEY);
  await safeDelete(USER_KEY);
}
