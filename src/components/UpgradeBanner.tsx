import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, shadow, fontFamily } from "../theme/tokens";
import { t } from "../lib/i18n";
import { useAuth } from "../hooks/useAuth";

interface UpgradeBannerProps {
  style?: ViewStyle;
}

/**
 * Shown to guest / anonymous users prompting them to create a real account.
 * Renders null for signed-in (non-anonymous) users or when signed out.
 * Mirrors web `components/UpgradeBanner.tsx`; navigation goes to /login.
 */
export function UpgradeBanner({ style }: UpgradeBannerProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  // Only guests (anonymous accounts) see the banner.
  if (!user || !user.is_anonymous) return null;

  return (
    <View
      style={[
        styles.banner,
        shadow.sm,
        { backgroundColor: theme.primary, borderRadius: radius.lg },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.22)" }]}>
          <Icon name="sparkle" size={22} color={theme.primaryForeground} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.primaryForeground }]}>
            {t("login.upgradeBannerTitle")}
          </Text>
          <Text style={[styles.subtitle, { color: theme.primaryForeground }]}>
            {t("login.upgradeBannerSubtitle")}
          </Text>
        </View>
      </View>

      <Button
        variant="ghost"
        fullWidth
        onPress={() => router.push("/login")}
        style={styles.cta}
      >
        <Text style={[styles.ctaText, { color: theme.primary }]}>
          {t("login.upgradeBannerCta")}
        </Text>
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontFamily: fontFamily.bold, fontWeight: "700" },
  subtitle: { fontSize: 13, opacity: 0.92, lineHeight: 18 },
  cta: { backgroundColor: "#fff" },
  ctaText: { fontSize: 14, fontWeight: "700" },
});
