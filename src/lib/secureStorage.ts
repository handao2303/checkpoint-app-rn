import * as SecureStore from 'expo-secure-store';

/**
 * Async key-value storage backed by expo-secure-store (iOS Keychain / Android Keystore).
 * Provides the same interface as localStorage but async — all callers must await.
 */
export const secureStorage = {
  getItem: (key: string): Promise<string | null> => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
};

/** Storage keys matching the web app's localStorage keys. */
export const KEYS = {
  ACCESS_TOKEN: 'cp_access_token',
  REFRESH_TOKEN: 'cp_refresh_token',
  GUEST_LOGGED_OUT: 'cp_guest_logged_out',
  CHECKIN_QUEUE: 'cp_checkin_queue',
  QUICK_CHECKIN_SETTINGS: 'cp_quick_checkin_settings',
  HAS_REAL_ACCOUNT: 'cp_has_real_account',
} as const;
