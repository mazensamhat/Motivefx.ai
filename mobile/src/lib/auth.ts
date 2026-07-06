import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "motivefx_access_token";
const REFRESH_KEY = "motivefx_refresh_token";
const USER_KEY = "motivefx_auth_user_id";

export interface AuthUser {
  userId: string;
  email: string;
  displayName?: string | null;
  totpEnabled?: boolean;
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function getUserId(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_KEY);
}

export async function setSession(
  accessToken: string,
  refreshToken: string,
  user: AuthUser
): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  await SecureStore.setItemAsync(USER_KEY, user.userId);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
