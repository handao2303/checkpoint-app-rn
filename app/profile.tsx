import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  RefreshControl, ScrollView, Image,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useAuth } from "../src/hooks/useAuth";
import { authService } from "../src/services/auth";
import {
  getMyCheckpoints, getPassport, getBadges, getLeaderboard,
  type Checkpoint, type Passport, type UserBadge,
} from "../src/lib/api";
import { colors } from "../src/theme/tokens";
import { Card } from "../src/components/ui/Card";
import { UserAvatar } from "../src/components/ui/UserAvatar";
import { Button } from "../src/components/ui/Button";
import { Skeleton } from "../src/components/ui/Skeleton";
import { HomeShell } from "../src/components/HomeShell";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: checkpoints = [], isLoading: cpLoading } = useQuery({
    queryKey: ["my-checkpoints"],
    queryFn: () => getMyCheckpoints(30),
    enabled: !!user,
  });

  const { data: passport } = useQuery({
    queryKey: ["passport"],
    queryFn: () => getPassport(),
    enabled: !!user,
  });

  const { data: badges = [] } = useQuery({
    queryKey: ["badges"],
    queryFn: () => getBadges(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontSize: 16, color: colors.neutral[500], marginBottom: 16 }}>
          {t("login.login")}
        </Text>
        <Button onPress={() => router.push("/login")}>{t("login.login")}</Button>
      </View>
    );
  }

  const unlockedBadges = badges.filter((b) => b.awarded).length;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    qc.invalidateQueries({ queryKey: ["my-checkpoints"] });
    qc.invalidateQueries({ queryKey: ["passport"] });
    qc.invalidateQueries({ queryKey: ["badges"] });
    setTimeout(() => setRefreshing(false), 500);
  }, [qc]);

  return (
    <HomeShell>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Hero */}
      <Card>
        <View style={{ alignItems: "center", gap: 8 }}>
          <UserAvatar url={user.avatar_url} name={user.display_name} size={80} />
          <Text style={styles.name}>{user.display_name || user.username}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

          {/* Level progress */}
          <View style={styles.levelRow}>
            <Text style={styles.levelText}>
              {t("profile.levelLabel")} {user.level}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.round(user.level_progress * 100)}%` }]} />
          </View>
          <Text style={styles.xpText}>
            {user.xp_to_next > 0
              ? t("profile.xpToNext", { count: user.xp_to_next, level: user.level + 1 })
              : t("profile.maxLevel")}
          </Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatItem label={t("profile.totalXpLabel")} value={String(user.total_xp)} />
            <StatItem label={t("profile.checkpointCountLabel")} value={String(user.checkpoint_count)} />
            <StatItem label={t("profile.journeyCountLabel")} value={String(user.journey_count)} />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Button variant="outline" style={{ flex: 1 }} onPress={() => router.push("/leaderboard")}>
            {t("profile.leaderboard")}
          </Button>
          <Button variant="outline" style={{ flex: 1 }} onPress={() => router.push("/edit-profile")}>
            {t("profile.editProfile")}
          </Button>
        </View>
        <TouchableOpacity
          style={{ marginTop: 8, alignItems: "center" }}
          onPress={() => router.push("/settings")}
        >
          <Text style={{ color: colors.neutral[500], fontSize: 14 }}>⚙️ {t("profile.settings")}</Text>
        </TouchableOpacity>
      </Card>

      {/* Passport */}
      {passport && (
        <Card>
          <Text style={styles.sectionTitle}>{t("profile.badgesLabel")} — Passport</Text>
          <Text style={{ color: colors.neutral[500], marginBottom: 8 }}>
            {passport.province_count} provinces
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {passport.stamps.slice(0, 10).map((s) => (
              <View key={s.province} style={styles.stamp}>
                <Text style={styles.stampText}>{s.province}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Badges */}
      <Card>
        <Text style={styles.sectionTitle}>{t("profile.badgesLabel")}</Text>
        <Text style={{ color: colors.neutral[500], marginBottom: 8 }}>
          {unlockedBadges}/{badges.length}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {badges.slice(0, 8).map((b) => (
            <View
              key={b.key}
              style={[styles.badgeItem, !b.awarded && styles.badgeLocked]}
            >
              <Text style={{ fontSize: 20 }}>{b.awarded ? "🏅" : "🔒"}</Text>
              <Text style={[styles.badgeName, !b.awarded && { color: colors.neutral[400] }]}>
                {b.name}
              </Text>
            </View>
          ))}
        </View>
        {badges.length > 8 && (
          <TouchableOpacity onPress={() => router.push("/badges")} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.primary[500], textAlign: "center" }}>
              {t("profile.viewAll")}
            </Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Checkpoints gallery */}
      <Text style={styles.sectionTitle}>{t("profile.title")} — Khoảnh khắc</Text>
      {checkpoints.length === 0 ? (
        <Text style={{ color: colors.neutral[500], textAlign: "center", padding: 20 }}>
          {t("profile.noCheckpoints")}
        </Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          {checkpoints.slice(0, 6).map((cp) => (
            <TouchableOpacity
              key={cp.id}
              style={styles.cpThumb}
              onPress={() => router.push(`/c/${cp.id}`)}
            >
              <View style={styles.cpThumbInner}>
                {cp.thumbnail_url ? (
                  <Image source={{ uri: cp.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <Text style={{ fontSize: 20 }}>📍</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Logout */}
      <Button
        variant="ghost"
        onPress={async () => {
          await authService.signOut();
          qc.clear();
        }}
      >
        {t("profile.logout")}
      </Button>
    </ScrollView>
    </HomeShell>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.primary[500] }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.neutral[500] }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  name: { fontSize: 22, fontWeight: "700", color: colors.neutral[800] },
  username: { fontSize: 14, color: colors.neutral[500] },
  bio: { fontSize: 14, color: colors.neutral[600], textAlign: "center" },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  levelText: { fontSize: 13, fontWeight: "600", color: colors.neutral[600] },
  progressBar: {
    width: "100%", height: 6, borderRadius: 3,
    backgroundColor: colors.neutral[100], overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary[500], borderRadius: 3 },
  xpText: { fontSize: 12, color: colors.neutral[500] },
  statsRow: { flexDirection: "row", gap: 24, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4, color: colors.neutral[700] },
  stamp: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: colors.green[50],
  },
  stampText: { fontSize: 12, color: colors.green[700] },
  badgeItem: { alignItems: "center", width: "23%", paddingVertical: 8 },
  badgeLocked: { opacity: 0.4 },
  badgeName: { fontSize: 11, marginTop: 2, textAlign: "center", color: colors.neutral[600] },
  cpThumb: { width: "32%", aspectRatio: 1 },
  cpThumbInner: {
    flex: 1, borderRadius: 8, alignItems: "center", justifyContent: "center",
    margin: 2, backgroundColor: colors.neutral[100], overflow: "hidden",
  },
});
