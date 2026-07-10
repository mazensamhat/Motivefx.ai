/**
 * Session storage via AsyncStorage (no SecureStore native module).
 * SecureStore was crashing Android on cold start for this project.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_KEY = "motivefx_access_token";
const REFRESH_KEY = "motivefx_refresh_token";
const USER_KEY = "motivefx_auth_user_id";

export interface AuthUser {
  userId: string;
  email: string;
  displayName?: string | null;
  totpEnabled?: boolean;
}

async function safeGet(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.warn(`AsyncStorage get failed for ${key}`, e);
    return null;
  }
}

async function safeSet(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.warn(`AsyncStorage set failed for ${key}`, e);
  }
}

async function safeDelete(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn(`AsyncStorage delete failed for ${key}`, e);
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
