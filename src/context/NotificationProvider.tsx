// Notification context for React Native.
// Ported from web/src/context/NotificationProvider.tsx with these changes:
// - localStorage → SecureStorage (async) for lastSeen persistence
// - No tanstack-query (following-feed derived notifications omitted — mobile
//   shows only stored Firestore notifications, matching the brief scope)
// - No Toast / navigation — the web's in-app toast is omitted in mobile
//   (push notifications handle that layer via expo-notifications in a later task)

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  subscribeNotifications,
  type AppNotification,
} from '../lib/notifications';

const LAST_SEEN_KEY = (userId: string) => `cp.notif.lastSeen.${userId}`;

async function getLastSeenAsync(userId: string): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(LAST_SEEN_KEY(userId));
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

async function setLastSeenAsync(userId: string, ts: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SEEN_KEY(userId), String(ts));
  } catch {
    // best-effort
  }
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  markAllSeen: () => void;
}

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [lastSeen, setLastSeenState] = useState(0);
  const storedInitialized = useRef(false);

  // Subscribe to stored notifications from Firestore and load lastSeen.
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      storedInitialized.current = false;
      return;
    }

    // Load persisted lastSeen from AsyncStorage
    void getLastSeenAsync(user.id).then((ts) => setLastSeenState(ts));

    storedInitialized.current = false;
    const unsubscribe = subscribeNotifications(user.id, (notifs) => {
      storedInitialized.current = true;
      setNotifications(notifs);
    });

    return unsubscribe;
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.created_at.getTime() > lastSeen).length,
    [notifications, lastSeen],
  );

  const markAllSeen = useCallback(() => {
    if (!user) return;
    const now = Date.now();
    setLastSeenState(now);
    void setLastSeenAsync(user.id, now);
  }, [user]);

  const value = useMemo(
    () => ({ notifications, unreadCount, markAllSeen }),
    [notifications, unreadCount, markAllSeen],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationState {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within <NotificationProvider>');
  return ctx;
}
