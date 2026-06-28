// Custom bottom tab bar matching web BottomNav.tsx pixel-perfectly.
// 5 tabs: Map, Discover, Create (auth-gated), Leaderboard, Profile (auth-gated).
// Active: #F05A28 (primary), Inactive: #7A6B5F (foreground-muted).
// Background: #FFFDF8 (surface), border-top: #F5EDE5.

import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';
import { colors } from '../../theme/colors';
import { useAuth } from '../../auth/AuthContext';
import { useAuthGate } from '../../context/AuthGate';
import { useNotifications } from '../../context/NotificationProvider';

type TabConfig = {
  name: string;
  icon: IconName;
  labelKey: string;
  requiresAuth?: boolean;
};

const TABS: TabConfig[] = [
  { name: 'Map',         icon: 'map',         labelKey: 'bottomNav.map' },
  { name: 'Discover',    icon: 'compass',      labelKey: 'bottomNav.discover' },
  { name: 'Create',      icon: 'plus-circle',  labelKey: 'bottomNav.create',           requiresAuth: true },
  { name: 'Leaderboard', icon: 'trophy',       labelKey: 'bottomNav.leaderboard' },
  { name: 'Profile',     icon: 'profile',      labelKey: 'bottomNav.profile',         requiresAuth: true },
];

export function BottomTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { promptLogin } = useAuthGate();
  const { unreadCount } = useNotifications();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {TABS.map((tab, index) => {
        const focused = state.index === index;
        const iconColor = focused ? colors.primary : colors.foregroundMuted;

        const onPress = () => {
          if (tab.requiresAuth && !user) {
            promptLogin({ source: `bottom_nav:${tab.name.toLowerCase()}` });
            return;
          }
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[index]?.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(tab.name);
          }
        };

        return (
          <Pressable
            key={tab.name}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="button"
            accessibilityLabel={t(tab.labelKey)}
          >
            <View style={styles.iconWrap}>
              <Icon
                name={tab.icon}
                size={24}
                color={iconColor}
                strokeWidth={focused ? 2.4 : 2.1}
              />
              {tab.name === 'Profile' && unreadCount > 0 && (
                <View style={styles.unreadBadge} />
              )}
            </View>
            <Text style={[styles.label, { color: iconColor }]}>
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,   // #FFFDF8
    borderTopWidth: 1,
    borderTopColor: '#F5EDE5',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  iconWrap: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4329',
  },
  label: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_500Medium',
    lineHeight: 14,
  },
});
