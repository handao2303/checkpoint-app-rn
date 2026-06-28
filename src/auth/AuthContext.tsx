// Auth context for React Native.
// Ported from web/src/auth/AuthContext.tsx with the following changes:
// - localStorage → secureStorage (async)
// - Google OAuth: expo-web-browser + expo-auth-session instead of browser redirect
//   Deep link callback URL: checkpoint://auth/callback
//   The `checkpoint` URL scheme must be registered in app.json (done in Task 1)
//   and in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
// - All window / document / location.href references removed.
// - guestSession helpers are now async.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

import { supabase } from '../lib/supabase';
import {
  exchange,
  getMe,
  loginWithPassword,
  logout,
  setAuthExpiredHandler,
  tokens,
  type User,
} from '../lib/api';
import {
  clearGuestLoggedOut,
  isGuestLoggedOut,
  markRealAccount,
  setGuestLoggedOut,
} from '../lib/guestSession';
import { setObservabilityUser, trackError, trackEvent } from '../lib/observability';

// Required by expo-web-browser to complete the auth session on Android.
WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  user: User | null;
  loading: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  /** Log in by username OR email + password (resolved server-side). */
  loginIdentifier: (identifier: string, password: string) => Promise<void>;
  signupEmail: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  loginAnonymous: () => Promise<void>;
  upgradeAccount: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Replace the cached user (e.g. after editing profile / avatar). */
  applyUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Single place to commit an authenticated user: updates state, observability,
  // and remembers (per-device) once a real, non-anonymous account is used.
  const commitUser = (u: User) => {
    setUser(u);
    setObservabilityUser(u);
    if (!u.is_anonymous) {
      void markRealAccount();
    }
  };

  // Restore session on load: load tokens from SecureStore, then prefer our
  // stored backend token; else exchange a live Supabase session.
  useEffect(() => {
    (async () => {
      try {
        // Hydrate the in-memory token cache from SecureStore.
        await tokens.load();

        if (tokens.access) {
          try {
            const restored = await getMe();
            commitUser(restored);
            trackEvent('auth_session_restore', { source: 'backend_token', status: 'success' });
            return;
          } catch {
            await tokens.clear();
            trackEvent('auth_session_restore', { source: 'backend_token', status: 'failed' });
          }
        }
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          // A guest who explicitly logged out keeps their anonymous session alive
          // (so they can restore it on demand) but should NOT be auto-logged back
          // in on app launch.
          if (data.session.user?.is_anonymous && (await isGuestLoggedOut())) {
            trackEvent('auth_session_restore', {
              source: 'supabase_session',
              status: 'skipped_guest_logout',
            });
            return;
          }
          const restored = await exchange(data.session.access_token);
          commitUser(restored);
          trackEvent('auth_session_restore', { source: 'supabase_session', status: 'success' });
        }
      } catch {
        await tokens.clear();
        trackError(new Error('session restore failed'), {
          feature: 'auth',
          action: 'auth_session_restore',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Catch sign-ins (OAuth deep link) and account upgrades (USER_UPDATED, e.g.
  // after an anonymous user confirms their email) — re-exchange to sync the BE.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) return;
      const isNewSignIn = event === 'SIGNED_IN' && !tokens.access;
      if (isNewSignIn || event === 'USER_UPDATED') {
        try {
          const nextUser = await exchange(session.access_token);
          commitUser(nextUser);
          trackEvent('auth_exchange_success', { source: event.toLowerCase() });
        } catch {
          trackError(new Error('auth state exchange failed'), {
            feature: 'auth',
            action: 'auth_state_change',
          });
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // When apiFetch can't re-auth (refresh token AND Supabase session both gone),
  // drop the user → the app renders the Login screen.
  useEffect(() => {
    setAuthExpiredHandler(() => {
      trackEvent('auth_expired');
      setObservabilityUser(null);
      setUser(null);
    });
    return () => setAuthExpiredHandler(null);
  }, []);

  const loginEmail = async (email: string, password: string) => {
    trackEvent('login_attempt', { method: 'email' });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const nextUser = await exchange(data.session.access_token);
      commitUser(nextUser);
      trackEvent('login_success', { method: 'email' });
    } catch (error) {
      trackError(error, { feature: 'auth', action: 'login_email' });
      trackEvent('login_failed', { method: 'email' });
      throw error;
    }
  };

  const loginIdentifier = async (identifier: string, password: string) => {
    trackEvent('login_attempt', { method: 'identifier' });
    try {
      const nextUser = await loginWithPassword(identifier, password);
      commitUser(nextUser);
      trackEvent('login_success', { method: 'identifier' });
    } catch (error) {
      trackError(error, { feature: 'auth', action: 'login_identifier' });
      trackEvent('login_failed', { method: 'identifier' });
      throw error;
    }
  };

  const signupEmail = async (email: string, password: string) => {
    trackEvent('login_attempt', { method: 'signup_email' });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      trackEvent('login_failed', { method: 'signup_email' });
      throw error;
    }
    // If email confirmation is off, a session exists immediately.
    if (data.session) {
      const nextUser = await exchange(data.session.access_token);
      commitUser(nextUser);
      trackEvent('signup_success', { method: 'email' });
    } else {
      trackEvent('signup_success', { method: 'email', requires_confirmation: true });
      throw new Error(t('kiem_tra_email_de_xac'));
    }
  };

  /**
   * Google OAuth via expo-web-browser.
   *
   * The redirect URL uses the `checkpoint` custom URL scheme registered in
   * app.json (scheme: "checkpoint"). Supabase Redirect URLs must include:
   *   checkpoint://auth/callback
   *   checkpoint://*  (wildcard alternative)
   *
   * After the browser closes, the Supabase onAuthStateChange listener (above)
   * will fire SIGNED_IN and exchange the session for our backend token.
   *
   * For anonymous users, we LINK Google to the same Supabase user (preserving
   * their data) rather than creating a new account.
   */
  const loginGoogle = async () => {
    trackEvent('login_attempt', { method: 'google', is_linking: !!user?.is_anonymous });

    // The redirect URI that the browser will return to after OAuth.
    // makeRedirectUri uses the `scheme` option to build checkpoint://auth/callback.
    const redirectUrl = makeRedirectUri({ scheme: 'checkpoint', path: 'auth/callback' });

    if (user?.is_anonymous) {
      // Link Google to the existing anonymous Supabase user (preserves their data).
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });
      if (error) {
        trackEvent('login_failed', { method: 'google_link' });
        throw error;
      }
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type !== 'success') {
          // User cancelled or browser dismissed without redirect
          throw new Error(t('dang_nhap_that_bai') ?? 'Login cancelled');
        }
      }
    } else {
      // Standard Google sign-in.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });
      if (error) {
        trackEvent('login_failed', { method: 'google' });
        throw error;
      }
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type !== 'success') {
          // User cancelled or browser dismissed without redirect
          throw new Error(t('dang_nhap_that_bai') ?? 'Login cancelled');
        }
      }
    }
    // onAuthStateChange handles exchange + commitUser after the browser returns.
  };

  const loginAnonymous = async () => {
    trackEvent('login_attempt', { method: 'anonymous' });
    await clearGuestLoggedOut();
    // If the previous guest's anonymous session is still alive (we keep it on
    // guest logout), reuse it so the SAME account is restored — Supabase's
    // signInAnonymously() would otherwise always mint a brand-new user.
    const { data: existing } = await supabase.auth.getSession();
    if (existing.session?.user?.is_anonymous) {
      const nextUser = await exchange(existing.session.access_token);
      commitUser(nextUser);
      trackEvent('anonymous_login_success', { restored: true });
      return;
    }
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      trackEvent('login_failed', { method: 'anonymous' });
      throw error;
    }
    if (!data.session) throw new Error(t('khong_tao_duoc_phien_khach'));
    const nextUser = await exchange(data.session.access_token);
    commitUser(nextUser);
    trackEvent('anonymous_login_success', { restored: false });
  };

  // Convert the current anonymous user into a permanent account. Supabase keeps
  // the same user id (sub), so all their data is preserved. If email
  // confirmation is on, is_anonymous only flips to false after the user
  // confirms — the USER_UPDATED listener re-syncs the backend at that point.
  const upgradeAccount = async (email: string, password: string) => {
    const { error } = await supabase.auth.updateUser({ email, password });
    if (error) throw error;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const nextUser = await exchange(data.session.access_token);
      commitUser(nextUser);
      trackEvent('signup_success', { method: 'upgrade_email' });
    }
  };

  const signOut = async () => {
    trackEvent('logout_click');
    const wasAnonymous = !!user?.is_anonymous;
    try {
      await logout(); // clears our backend tokens from SecureStore
      if (wasAnonymous) {
        // Keep the anonymous Supabase session alive so "continue as guest"
        // restores the SAME account; just flag it so app launch doesn't auto-login.
        await setGuestLoggedOut();
      } else {
        await supabase.auth.signOut();
      }
      trackEvent('logout_success');
    } catch (error) {
      trackError(error, { feature: 'auth', action: 'logout' });
      throw error;
    } finally {
      setObservabilityUser(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginEmail,
        loginIdentifier,
        signupEmail,
        loginGoogle,
        loginAnonymous,
        upgradeAccount,
        signOut,
        applyUser: commitUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
