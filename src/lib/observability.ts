// Observability for the mobile app — Firebase Analytics + structured logging.
// @react-native-firebase/analytics requires a native build (expo prebuild).
// Uses the v22+ modular API (getAnalytics/logEvent) — the namespaced
// analytics().logEvent() form is deprecated.

import {
  getAnalytics,
  logEvent,
  setUserId,
  setUserProperties,
} from '@react-native-firebase/analytics';
import type { User } from './api';

type EventParam = string | number | boolean | null | undefined;
type EventParams = Record<string, EventParam>;

let currentUserId: string | null = null;
let currentAuthState: 'anonymous' | 'authenticated' | 'guest' = 'guest';

function isDev(): boolean {
  return __DEV__;
}

export function trackEvent(name: string, params: EventParams = {}): void {
  if (isDev()) {
    console.log('[analytics]', name, params);
  }
  // Fire-and-forget; errors are swallowed so analytics never crashes the app.
  logEvent(getAnalytics(), name, params as Record<string, string | number | boolean>).catch(
    () => {},
  );
}

export function trackError(error: unknown, context: EventParams = {}): void {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const name = error instanceof Error ? error.name : 'unknown';
  if (isDev()) {
    console.warn('[analytics:error]', name, message, context);
  }
  logEvent(getAnalytics(), 'app_error', {
    error_name: name,
    error_message: message,
    ...context,
  } as Record<string, string | number | boolean>).catch(() => {});
}

export function setObservabilityUser(user: User | null): void {
  currentUserId = user?.id ?? null;
  currentAuthState = user
    ? user.is_anonymous
      ? 'anonymous'
      : 'authenticated'
    : 'guest';
  if (isDev()) {
    console.log('[analytics:user]', currentUserId, currentAuthState);
  }
  const a = getAnalytics();
  setUserId(a, currentUserId).catch(() => {});
  setUserProperties(a, { auth_state: currentAuthState }).catch(() => {});
}

export { currentUserId, currentAuthState };
