// Persistent (across logout) markers for the guest-login flow.
// - REAL_KEY: this device has signed into a real account at least once → we stop
//   offering "continue as guest" on the login screen.
// - GUEST_OUT_KEY: the guest explicitly logged out. We keep their anonymous
//   Supabase session alive (so "continue as guest" restores the SAME account),
//   but this flag suppresses the silent auto-restore on app launch.

import { secureStorage, KEYS } from './secureStorage';

export async function hasRealAccount(): Promise<boolean> {
  try {
    return (await secureStorage.getItem(KEYS.HAS_REAL_ACCOUNT)) === '1';
  } catch {
    return false;
  }
}

/** Mark this device as having used a real account (also clears guest-logout flag). */
export async function markRealAccount(): Promise<void> {
  try {
    await secureStorage.setItem(KEYS.HAS_REAL_ACCOUNT, '1');
    await secureStorage.removeItem(KEYS.GUEST_LOGGED_OUT);
  } catch {
    /* non-fatal */
  }
}

export async function setGuestLoggedOut(): Promise<void> {
  try {
    await secureStorage.setItem(KEYS.GUEST_LOGGED_OUT, '1');
  } catch {
    /* non-fatal */
  }
}

export async function clearGuestLoggedOut(): Promise<void> {
  try {
    await secureStorage.removeItem(KEYS.GUEST_LOGGED_OUT);
  } catch {
    /* non-fatal */
  }
}

export async function isGuestLoggedOut(): Promise<boolean> {
  try {
    return (await secureStorage.getItem(KEYS.GUEST_LOGGED_OUT)) === '1';
  } catch {
    return false;
  }
}
