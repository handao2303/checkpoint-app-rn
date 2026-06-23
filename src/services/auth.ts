import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import {
  exchange,
  getMe,
  loginWithPassword,
  logoutFromBackend,
  setAuthExpiredHandler,
  initTokens,
  type User,
} from "../lib/api";
import {
  clearGuestLoggedOut,
  isGuestLoggedOut,
  markRealAccount,
  setGuestLoggedOut,
} from "../lib/guestSession";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: Platform.OS === "web",
        detectSessionInUrl: Platform.OS === "web",
      },
    });
  }
  return supabase;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export type AuthListener = (state: AuthState) => void;

class AuthService {
  private _user: User | null = null;
  private _loading = true;
  private _listeners = new Set<AuthListener>();

  get user(): User | null {
    return this._user;
  }

  get loading(): boolean {
    return this._loading;
  }

  subscribe(listener: AuthListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private notify() {
    const state = { user: this._user, loading: this._loading };
    this._listeners.forEach((fn) => fn(state));
  }

  private setUser(u: User | null) {
    this._user = u;
    if (u && !u.is_anonymous) markRealAccount();
    this.notify();
  }

  async init(): Promise<void> {
    await initTokens();
    setAuthExpiredHandler(() => {
      this.setUser(null);
    });

    // Try to restore session
    try {
      if (getAccessToken()) {
        const restored = await getMe();
        this.setUser(restored);
        this._loading = false;
        this.notify();
        return;
      }
    } catch {
      // fall through
    }

    // Try Supabase session
    const sb = getSupabase();
    if (sb) {
      try {
        const { data } = await sb.auth.getSession();
        if (data.session) {
          if (data.session.user?.is_anonymous && isGuestLoggedOut()) {
            this._loading = false;
            this.notify();
            return;
          }
          const restored = await exchange(data.session.access_token);
          this.setUser(restored);
        }
      } catch {
        // fall through
      }
    }

    this._loading = false;
    this.notify();
  }

  async loginEmail(email: string, password: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const nextUser = await exchange(data.session.access_token);
    this.setUser(nextUser);
  }

  async loginIdentifier(identifier: string, password: string): Promise<void> {
    const nextUser = await loginWithPassword(identifier, password);
    this.setUser(nextUser);
  }

  async signupEmail(email: string, password: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session) {
      const nextUser = await exchange(data.session.access_token);
      this.setUser(nextUser);
    }
  }

  async loginGoogle(): Promise<void> {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");

    const redirectTo = Platform.OS === "web"
      ? window.location.origin
      : "checkpoint://auth/callback";

    // If anonymous, link identity
    if (this._user?.is_anonymous) {
      const { error } = await sb.auth.linkIdentity({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } else {
      await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
    }
  }

  async loginAnonymous(): Promise<void> {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    clearGuestLoggedOut();

    // Reuse existing anonymous session if available
    const { data: existing } = await sb.auth.getSession();
    if (existing.session?.user?.is_anonymous) {
      const nextUser = await exchange(existing.session.access_token);
      this.setUser(nextUser);
      return;
    }

    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw new Error("khong_tao_duoc_phien_khach");
    const session = data.session;
    if (!session) throw new Error("khong_tao_duoc_phien_khach");
    const nextUser = await exchange(session.access_token);
    this.setUser(nextUser);
  }

  async upgradeAccount(email: string, password: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
      const result = await sb.auth.updateUser({ email, password });
    if (result.error) throw result.error;
    const session = (result.data as any)?.session;
    if (session) {
      const nextUser = await exchange(session.access_token);
      this.setUser(nextUser);
    }
  }

  async signOut(): Promise<void> {
    const sb = getSupabase();
    if (this._user?.is_anonymous) {
      setGuestLoggedOut();
    }
    await logoutFromBackend();
    if (sb) {
      await sb.auth.signOut();
    }
    this.setUser(null);
  }
}

export const authService = new AuthService();
function getAccessToken(): string | null {
  const { getAccessToken } = require("../lib/api");
  return getAccessToken();
}
