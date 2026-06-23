import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { getBadges } from "../src/lib/api";
import { colors } from "../src/theme/tokens";
import { Card } from "../src/components/ui/Card";
import { useAuth } from "../src/hooks/useAuth";

export default function BadgeCollectionScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: badges = [] } = useQuery({
    queryKey: ["badges"],
    queryFn: getBadges,
    enabled: !!user,
  });

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{t("profile.badges")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        {badges.map((b) => (
          <Card key={b.key} style={{ width: "47%", alignItems: "center", padding: 16 }}>
            <Text style={{ fontSize: 32 }}>{b.awarded ? "🏅" : "🔒"}</Text>
            <Text style={[styles.badgeName, !b.awarded && { color: colors.neutral[400] }]}>
              {b.name}
            </Text>
            <Text style={[styles.badgeDesc, !b.awarded && { color: colors.neutral[300] }]}>
              {b.description}
            </Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  title: { fontSize: 22, fontWeight: "700", color: colors.neutral[800] },
  badgeName: { fontSize: 14, fontWeight: "600", marginTop: 8, textAlign: "center" },
  badgeDesc: { fontSize: 12, color: colors.neutral[500], marginTop: 4, textAlign: "center" },
});
