// Auth gate context for React Native.
// Ported from web/src/context/AuthGate.tsx.
// Uses Alert + navigation instead of Sheet + react-router navigate.

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

interface AuthGateState {
  /** Show login prompt for anonymous users. */
  promptLogin: (opts?: { reason?: string; source?: string }) => void;
  /** Run action if signed in, otherwise open login prompt. Returns true when action ran. */
  requireAuth: (action: () => void, opts?: { reason?: string; source?: string }) => boolean;
}

const AuthGateContext = createContext<AuthGateState | null>(null);

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<RootNav>();

  const promptLogin = useCallback(
    (_opts?: { reason?: string; source?: string }) => {
      Alert.alert(
        t('dang_nhap_de_su_dung'),
        t('login_prompt_body'),
        [
          { text: t('huy'), style: 'cancel' },
          {
            text: t('dang_nhap'),
            onPress: () => navigation.navigate('Login'),
          },
        ],
        { cancelable: true },
      );
    },
    [navigation, t],
  );

  const requireAuth = useCallback(
    (action: () => void, opts?: { reason?: string; source?: string }) => {
      if (user) {
        action();
        return true;
      }
      promptLogin(opts);
      return false;
    },
    [user, promptLogin],
  );

  return (
    <AuthGateContext.Provider value={{ promptLogin, requireAuth }}>
      {children}
    </AuthGateContext.Provider>
  );
}

export function useAuthGate(): AuthGateState {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error('useAuthGate must be inside AuthGateProvider');
  return ctx;
}
