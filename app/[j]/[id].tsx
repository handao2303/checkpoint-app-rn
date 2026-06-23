import React from "react";
import { View, Text, StyleSheet, ScrollView, FlatList } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { getJourney } from "../../src/lib/api";
import { CATEGORIES } from "../../src/lib/maps";
import { colors } from "../../src/theme/tokens";
import { Card } from "../../src/components/ui/Card";
import { DetailSheetSkeleton } from "../../src/components/ui/Skeleton";

export default function JourneyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery({
    queryKey: ["journey", id],
    queryFn: () => getJourney(id!),
    enabled: !!id,
  });

  if (isLoading || !data) return <DetailSheetSkeleton />;

  const { journey, stats, checkpoints } = data;

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Header */}
      <Card>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 24 }}>🛤️</Text>
            <Text style={styles.title}>{journey.title}</Text>
          </View>
          {journey.description && (
            <Text style={{ color: colors.neutral[600] }}>{journey.description}</Text>
          )}
          {journey.is_active && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeText}>{t("journey.active")}</Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.checkpoint_count}</Text>
              <Text style={styles.statLabel}>{t("journey.checkpoints")}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total_xp}</Text>
              <Text style={styles.statLabel}>{t("journey.totalXp")}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.distance_km.toFixed(1)}km</Text>
              <Text style={styles.statLabel}>{t("journey.distance")}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Timeline */}
      <Text style={styles.sectionTitle}>Timeline</Text>
      {checkpoints.map((stop, i) => {
        const cat = CATEGORIES.find((c) => c.key === stop.category);
        return (
          <Card key={stop.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ alignItems: "center" }}>
                <View style={styles.dot} />
                {i < checkpoints.length - 1 && <View style={styles.line} />}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  {cat && <Text>{cat.emoji}</Text>}
                  <Text style={styles.stopName}>{stop.name}</Text>
                </View>
                {stop.note && <Text style={{ color: colors.neutral[600], fontSize: 13 }}>{stop.note}</Text>}
                {stop.address && <Text style={{ fontSize: 12, color: colors.neutral[500] }}>📍 {stop.address}</Text>}
              </View>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  title: { fontSize: 20, fontWeight: "700", color: colors.neutral[800], flex: 1 },
  activeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
    backgroundColor: colors.green[50],
  },
  activeText: { fontSize: 12, color: colors.green[700], fontWeight: "600" },
  statsRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 8 },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.primary[500] },
  statLabel: { fontSize: 11, color: colors.neutral[500] },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.neutral[700] },
  dot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.primary[500], marginTop: 4,
  },
  line: {
    width: 2, flex: 1, backgroundColor: colors.primary[200],
    marginVertical: 4,
  },
  stopName: { fontSize: 15, fontWeight: "500", color: colors.neutral[800] },
});
