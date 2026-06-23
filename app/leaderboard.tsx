import React from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { getLeaderboard, type LeaderboardEntry } from "../src/lib/api";
import { colors } from "../src/theme/tokens";
import { Card } from "../src/components/ui/Card";
import { UserAvatar } from "../src/components/ui/UserAvatar";
import { Skeleton } from "../src/components/ui/Skeleton";
import { HomeShell } from "../src/components/HomeShell";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
  });

  const entries = data?.entries ?? [];
  const me = data?.me;

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <TouchableOpacity onPress={() => router.push(`/u/${item.username}`)}>
      <Card style={{ marginBottom: 8 }} padded={false}>
        <View style={styles.row}>
          <Text style={styles.rank}>
            {index < 3 ? MEDALS[index] : `#${item.rank}`}
          </Text>
          <UserAvatar url={item.avatar_url} name={item.display_name} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.display_name || item.username}</Text>
            <Text style={styles.sub}>@{item.username}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.level}>Lv.{item.level}</Text>
            <Text style={styles.xp}>{item.total_xp} XP</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <HomeShell>
      <View style={styles.container}>
        <Text style={styles.title}>{t("leaderboard.title")}</Text>

        {/* Podium */}
        {entries.length >= 3 && (
          <View style={styles.podium}>
            {[1, 0, 2].map((pos) => {
              const e = entries[pos];
              if (!e) return null;
              const height = pos === 0 ? 80 : pos === 1 ? 100 : 60;
              return (
                <TouchableOpacity
                  key={e.user_id}
                  style={[styles.podiumItem, { paddingTop: 100 - height }]}
                  onPress={() => router.push(`/u/${e.username}`)}
                >
                  <Text style={styles.podiumMedal}>{MEDALS[pos]}</Text>
                  <UserAvatar url={e.avatar_url} name={e.display_name} size={36} />
                  <Text style={styles.podiumName} numberOfLines={1}>{e.display_name || e.username}</Text>
                  <Text style={styles.podiumXp}>{e.total_xp} XP</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {isLoading ? (
          <View style={{ padding: 16, gap: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={60} borderRadius={12} />
            ))}
          </View>
        ) : (
          <FlatList
            data={entries.slice(3)}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.user_id)}
            contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            ListHeaderComponent={
              me && !entries.find((e) => e.user_id === me.user_id) ? (
                <Card style={{ marginBottom: 12, backgroundColor: colors.primary[50] }} padded={false}>
                  <TouchableOpacity style={styles.row} onPress={() => router.push(`/u/${me.username}`)}>
                    <Text style={styles.rank}>#{me.rank}</Text>
                    <UserAvatar url={me.avatar_url} name={me.display_name} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{me.display_name || me.username} ({t("leaderboard.you")})</Text>
                      <Text style={styles.sub}>@{me.username}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.level}>Lv.{me.level}</Text>
                      <Text style={styles.xp}>{me.total_xp} XP</Text>
                    </View>
                  </TouchableOpacity>
                </Card>
              ) : null
            }
          />
        )}
      </View>
    </HomeShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  title: { fontSize: 22, fontWeight: "700", padding: 16, color: colors.neutral[800] },
  podium: {
    flexDirection: "row", justifyContent: "center", alignItems: "flex-end",
    paddingHorizontal: 16, marginBottom: 16, gap: 8,
  },
  podiumItem: {
    flex: 1, alignItems: "center", gap: 4,
    backgroundColor: colors.neutral[50],
    borderRadius: 12, paddingVertical: 12,
  },
  podiumMedal: { fontSize: 28 },
  podiumName: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  podiumXp: { fontSize: 10, color: colors.neutral[500] },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  rank: { fontSize: 18, fontWeight: "700", width: 36, textAlign: "center" },
  name: { fontSize: 15, fontWeight: "600", color: colors.neutral[800] },
  sub: { fontSize: 12, color: colors.neutral[500] },
  level: { fontSize: 13, color: colors.primary[500], fontWeight: "600" },
  xp: { fontSize: 12, color: colors.neutral[500] },
});
