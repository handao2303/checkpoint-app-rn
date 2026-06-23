import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../hooks/useAuth";
import { Icon, type IconName } from "./ui/Icon";
import { colors } from "../theme/tokens";

const TABS: { key: string; route: string; icon: IconName; labelKey: string; requiresAuth?: boolean }[] = [
  { key: "index", route: "/", icon: "map", labelKey: "bottomNav.map" },
  { key: "discover", route: "/discover", icon: "search", labelKey: "bottomNav.discover" },
  { key: "create", route: "/create", icon: "plus-circle", labelKey: "bottomNav.create", requiresAuth: true },
  { key: "leaderboard", route: "/leaderboard", icon: "trophy", labelKey: "bottomNav.leaderboard" },
  { key: "profile", route: "/profile", icon: "user", labelKey: "bottomNav.profile", requiresAuth: true },
];

export function BottomNav() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const isActive = (route: string) => {
    if (route === "/") return pathname === "/" || pathname === "";
    return pathname?.startsWith(route);
  };

  const handlePress = (tab: typeof TABS[0]) => {
    if (tab.requiresAuth && !user) {
      router.push("/login");
      return;
    }
    router.push(tab.route as any);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 4 }]}>
      {TABS.map((tab) => {
        const active = isActive(tab.route);
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => handlePress(tab)}
          >
            <Icon
              name={tab.icon}
              size={22}
              color={active ? colors.primary[500] : colors.neutral[400]}
            />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {t(tab.labelKey as any)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    backgroundColor: colors.neutral[0],
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 1,
    borderTopWidth: 2,
    borderTopColor: "transparent",
  },
  tabActive: {
    borderTopColor: colors.primary[500],
  },
  tabIcon: { fontSize: 20, opacity: 0.6 },
  tabIconActive: { opacity: 1 },
  tabLabel: {
    fontSize: 10,
    color: colors.neutral[400],
    fontWeight: "500",
  },
  tabLabelActive: {
    color: colors.primary[500],
    fontWeight: "700",
  },
});
