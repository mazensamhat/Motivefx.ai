import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "motivefx_age_verified_v1";

export async function isAgeVerified(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch {
    return false;
  }
}

export async function setAgeVerified(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}
