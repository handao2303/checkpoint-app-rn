import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  followUser,
  getFollowing,
  getUserFollowers,
  getUserFollowingList,
  unfollowUser,
  type PublicUserSummary,
} from "../lib/api";
import { t } from "../lib/i18n";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/tokens";
import { Sheet } from "./ui/Sheet";
import { UserAvatar } from "./ui/UserAvatar";

type FollowTab = "followers" | "following";

interface FollowListSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Whose followers/following to show. */
  userId: string;
  initialTab?: FollowTab;
}

/**
 * Bottom-sheet list of a user's followers / following with tabs — RN parity
 * with web `components/ProfileFollowSection.tsx`. Each row links to the user's
 * profile and offers a follow / unfollow action.
 */
export function FollowListSheet({
  visible,
  onClose,
  userId,
  initialTab = "followers",
}: FollowListSheetProps) {
  const { theme } = useTheme();
  const [tab, setTab] = useState<FollowTab>(initialTab);

  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);

  const followers = useQuery({
    queryKey: ["user-followers", userId],
    queryFn: () => getUserFollowers(userId),
    enabled: visible,
  });
  const following = useQuery({
    queryKey: ["user-following-list", userId],
    queryFn: () => getUserFollowingList(userId),
    enabled: visible,
  });

  const active = tab === "followers" ? followers : following;
  const people = active.data ?? [];
  const emptyText = tab === "followers" ? t("profile.noFollowers") : t("profile.noFollowing");

  return (
    <Sheet visible={visible} onClose={onClose} maxHeightRatio={0.85}>
      <Text style={[styles.title, { color: theme.foreground }]}>
        {tab === "followers" ? t("profile.followers") : t("profile.following")}
      </Text>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.muted }]}>
        {(["followers", "following"] as const).map((key) => {
          const isActive = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[styles.tab, isActive && { backgroundColor: theme.primary }]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? "#FFFFFF" : theme.mutedForeground },
                ]}
              >
                {key === "followers" ? t("profile.followers") : t("profile.following")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {active.isLoading ? (
        <View style={styles.list}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.row}>
              <View style={[styles.skeletonAvatar, { backgroundColor: theme.muted }]} />
              <View style={{ gap: 6 }}>
                <View style={[styles.skeletonLine, { width: 128, backgroundColor: theme.muted }]} />
                <View style={[styles.skeletonLine, { width: 80, backgroundColor: theme.muted }]} />
              </View>
            </View>
          ))}
        </View>
      ) : people.length === 0 ? (
        <Text style={[styles.empty, { color: theme.mutedForeground, backgroundColor: theme.surfaceMuted }]}>
          {emptyText}
        </Text>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {people.map((person) => (
            <FollowPersonRow key={person.id} person={person} onNavigate={onClose} listUserId={userId} />
          ))}
        </ScrollView>
      )}
    </Sheet>
  );
}

function FollowPersonRow({
  person,
  onNavigate,
  listUserId,
}: {
  person: PublicUserSummary;
  onNavigate: () => void;
  listUserId: string;
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isSelf = user?.id === person.id;

  // Viewer's own following set drives the follow/unfollow button state.
  const followingIds = useQuery({
    queryKey: ["my-following-ids"],
    queryFn: getFollowing,
    enabled: !!user && !isSelf,
  });
  const isFollowing = (followingIds.data ?? []).includes(person.id);

  const mutation = useMutation({
    mutationFn: () => (isFollowing ? unfollowUser(person.id) : followUser(person.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-following-ids"] });
      queryClient.invalidateQueries({ queryKey: ["user-followers", listUserId] });
      queryClient.invalidateQueries({ queryKey: ["user-following-list", listUserId] });
    },
  });

  const name = person.display_name || person.username;

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.rowMain}
        onPress={() => {
          onNavigate();
          router.push(`/u/${person.username}`);
        }}
      >
        <UserAvatar url={person.avatar_url} name={name} size={40} />
        <View style={styles.rowText}>
          <Text style={[styles.name, { color: theme.foreground }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.username, { color: theme.mutedForeground }]} numberOfLines={1}>
            @{person.username}
          </Text>
        </View>
      </Pressable>

      {user && !isSelf ? (
        <Pressable
          disabled={mutation.isPending}
          onPress={() => mutation.mutate()}
          style={[
            styles.followBtn,
            isFollowing
              ? { backgroundColor: theme.muted, borderColor: theme.border }
              : { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
        >
          <Text
            style={[
              styles.followBtnText,
              { color: isFollowing ? theme.foreground : "#FFFFFF" },
            ]}
          >
            {isFollowing ? t("profile.unfollow") : t("profile.follow")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: "700", marginBottom: spacing.md },
  tabs: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: 999,
    marginBottom: spacing.md,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 999 },
  tabText: { fontSize: 14, fontWeight: "700" },
  list: { maxHeight: 420 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: "600" },
  username: { fontSize: 12, marginTop: 1 },
  followBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  followBtnText: { fontSize: 13, fontWeight: "700" },
  empty: {
    fontSize: 13,
    textAlign: "center",
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  skeletonAvatar: { width: 40, height: 40, borderRadius: 20 },
  skeletonLine: { height: 12, borderRadius: 6 },
});
