import React from "react";
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { getUserProfile, getUserCheckpoints, followUser, unfollowUser, getFollowing } from "../../src/lib/api";
import { useAuth } from "../../src/hooks/useAuth";
import { colors } from "../../src/theme/tokens";
import { Card } from "../../src/components/ui/Card";
import { UserAvatar } from "../../src/components/ui/UserAvatar";
import { Button } from "../../src/components/ui/Button";
import { DetailSheetSkeleton } from "../../src/components/ui/Skeleton";
import { PassportSection } from "../../src/components/PassportSection";

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user", username],
    queryFn: () => getUserProfile(username!),
    enabled: !!username,
  });

  const { data: checkpoints = [] } = useQuery({
    queryKey: ["user-checkpoints", profile?.id],
    queryFn: () => getUserCheckpoints(profile!.id, 30),
    enabled: !!profile?.id,
  });

  const { data: following = [], refetch: refetchFollow } = useQuery({
    queryKey: ["following"],
    queryFn: getFollowing,
    enabled: !!user,
  });

  const isOwnProfile = user && profile && user.id === profile.id;
  const isFollowing = following.includes(profile?.id ?? "");

  if (isLoading || !profile) return <DetailSheetSkeleton />;

  const toggleFollow = async () => {
    try {
      if (isFollowing) {
        await unfollowUser(profile.id);
      } else {
        await followUser(profile.id);
      }
      refetchFollow();
    } catch {}
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Hero */}
      <Card>
        <View style={{ alignItems: "center", gap: 8 }}>
          <UserAvatar url={profile.avatar_url} name={profile.display_name} size={80} frame={(profile as any).avatar_frame} />
          <Text style={styles.name}>{profile.display_name || profile.username}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          <View style={styles.statsRow}>
            <StatItem label="XP" value={String(profile.total_xp)} />
            <StatItem label={t("profile.checkpointCountLabel")} value={String(profile.checkpoint_count)} />
            <StatItem label={t("profile.journeyCountLabel")} value={String(profile.journey_count)} />
          </View>
          {!isOwnProfile && user && (
            <Button
              variant={isFollowing ? "outline" : "primary"}
              onPress={toggleFollow}
            >
              {isFollowing ? t("common.following") : t("profile.follow")}
            </Button>
          )}
        </View>
      </Card>

      {/* Passport */}
      <PassportSection userId={profile.id} />

      {/* Checkpoints gallery */}
      {checkpoints.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t("profile.title")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {checkpoints.map((cp) => (
              <TouchableOpacity
                key={cp.id}
                style={styles.cpThumb}
                onPress={() => router.push(`/c/${cp.id}`)}
              >
                <View style={[styles.cpThumbInner, { backgroundColor: colors.neutral[100] }]}>
                  <Text style={{ fontSize: 20 }}>📍</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
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
  name: { fontSize: 20, fontWeight: "700", color: colors.neutral[800] },
  username: { fontSize: 14, color: colors.neutral[500] },
  bio: { fontSize: 14, color: colors.neutral[600], textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 24, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8, color: colors.neutral[700] },
  stamp: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.green[50] },
  stampText: { fontSize: 12, color: colors.green[700] },
  cpThumb: { width: "32%", aspectRatio: 1 },
  cpThumbInner: { flex: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", margin: 2 },
});
