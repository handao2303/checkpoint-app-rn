import AsyncStorage from "@react-native-async-storage/async-storage";

// Thin wrapper around AsyncStorage so we can swap to MMKV later if needed.

export function getItem(key: string): string | null {
  // Synchronous for simple flags; fallback to null
  try {
    // AsyncStorage.getItem is async, but we use a sync pattern for small flags.
    // In practice this is called during app init so we use a simple read.
    // For truly sync storage, switch to react-native-mmkv.
    void AsyncStorage.getItem(key).then((v) => {
      if (v !== null) _cache[key] = v;
    });
    return _cache[key] ?? null;
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  _cache[key] = value;
  try {
    void AsyncStorage.setItem(key, value);
  } catch {
    // non-fatal
  }
}

export function removeItem(key: string): void {
  delete _cache[key];
  try {
    void AsyncStorage.removeItem(key);
  } catch {
    // non-fatal
  }
}

// In-memory cache for synchronous reads on app start.
const _cache: Record<string, string> = {};

export async function loadCache(): Promise<void> {
  try {
    const keys = [
      "cp_has_real_account",
      "cp_guest_logged_out",
      "cp.geo.located",
      "cp.geo.autoAskDismissed",
      "cp.settings.openCreateOnLaunch",
      "cp.settings.preferCameraOnCheckin",
      "cp.settings.theme",
    ];
    const pairs = await AsyncStorage.multiGet(keys);
    for (const [key, value] of pairs) {
      if (value !== null) _cache[key] = value;
    }
  } catch {
    // non-fatal
  }
}
