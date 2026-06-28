import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY — ' +
      'copy mobile/.env.example to mobile/.env.local and fill them in.',
  );
}

/**
 * Supabase client for React Native.
 * - Uses AsyncStorage for session persistence (not localStorage).
 * - detectSessionInUrl is false — OAuth redirects are handled via deep links
 *   (checkpoint://auth/callback) via expo-web-browser / expo-auth-session.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
