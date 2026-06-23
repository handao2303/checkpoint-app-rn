import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, Image,
} from "react-native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useAuth } from "../src/hooks/useAuth";
import {
  getFeed, getFeedFollowing, searchPlaces, getPopularPlaces,
  getNearbyAppPlaces, type LatLng, type FeedItem, type Place,
} from "../src/lib/api";
import { DEFAULT_VIEW, CATEGORIES } from "../src/lib/maps";
import { getCurrentCoords, getHaversineDistance } from "../src/lib/geo";
import { colors } from "../src/theme/tokens";
import { Card } from "../src/components/ui/Card";
import { UserAvatar } from "../src/components/ui/UserAvatar";
import { Skeleton } from "../src/components/ui/Skeleton";
import { HomeShell } from "../src/components/HomeShell";
import { XPBadge } from "../src/components/ui/Chip";

const FALLBACK: LatLng = { lat: DEFAULT_VIEW.latitude, lng: DEFAULT_VIEW.longitude };

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [at, setAt] = useState<LatLng>(FALLBACK);
  const [activeTab, setActiveTab] = useState<"forYou" | "following">("forYou");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    getCurrentCoords().then(setAt).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Search
  const { data: searchResults = [] } = useQuery({
    queryKey: ["place-search", debounced, at],
    queryFn: () => searchPlaces(debounced, at),
    enabled: debounced.length > 0,
  });

  // Feed
  const feedFn = activeTab === "following" && user ? getFeedFollowing : getFeed;
  const {
    data: feedData,
    isLoading: feedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["discover-feed", activeTab, at, user?.id],
    queryFn: ({ pageParam }) => feedFn(at, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor,
    enabled: activeTab === "forYou" || !!user,
  });
  const feedItems = feedData?.pages.flatMap((p) => p.items) ?? [];

  // Popular places
  const { data: popular = [] } = useQuery({
    queryKey: ["places-popular", at],
    queryFn: () => getPopularPlaces(at),
    staleTime: 60_000,
  });

  const renderFeedItem = ({ item }: { item: FeedItem }) => {
    const isOwn = user && item.user_id === user.id;
    return (
      <TouchableOpacity onPress={() => router.push(`/c/${item.id}`)}>
        <Card style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <TouchableOpacity onPress={() => router.push(`/u/${item.author.username}`)}>
              <UserAvatar url={item.author.avatar_url} name={item.author.display_name} size={32} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600" }}>{item.author.display_name || item.author.username}</Text>
              <Text style={{ fontSize: 12, color: colors.neutral[500] }}>
                {item.distance_m < 1000
                  ? t("discover.distanceM", { distance: Math.round(item.distance_m) })
                  : t("discover.distanceKm", { distance: (item.distance_m / 1000).toFixed(1) })}
              </Text>
            </View>
            {isOwn && (
              <Text style={{ color: colors.neutral[400], fontSize: 16 }}>⋮</Text>
            )}
          </View>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 4 }}>{item.name}</Text>
          {item.note && <Text style={{ color: colors.neutral[600], marginBottom: 4 }}>{item.note}</Text>}
          {item.thumbnail_url && (
            <Image
              source={{ uri: item.thumbnail_url }}
              style={styles.feedImage}
              resizeMode="cover"
            />
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
              {CATEGORIES.find((c) => c.key === item.category) && (
                <Text>{CATEGORIES.find((c) => c.key === item.category)!.emoji}</Text>
              )}
            </View>
            <XPBadge xp={item.xp_awarded} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <HomeShell>
      <View style={styles.container}>
        {/* Search */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder={t("discover.search")}
            value={query}
            onChangeText={setQuery}
            placeholderTextColor={colors.neutral[400]}
          />
        </View>

        {/* Tabs */}
        {user && (
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "forYou" && styles.tabActive]}
              onPress={() => setActiveTab("forYou")}
            >
              <Text style={[styles.tabText, activeTab === "forYou" && styles.tabTextActive]}>
                {t("discover.forYou")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "following" && styles.tabActive]}
              onPress={() => setActiveTab("following")}
            >
              <Text style={[styles.tabText, activeTab === "following" && styles.tabTextActive]}>
                {t("discover.following")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Popular strip */}
        {popular.length > 0 && debounced.length === 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>{t("discover.popular")}</Text>
            <FlatList
              horizontal
              data={popular}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.popularCard}
                  onPress={() => router.push(`/p/${item.id}`)}
                >
                  {item.cover_image_url ? (
                    <Image source={{ uri: item.cover_thumbnail_url || item.cover_image_url }} style={styles.popularImage} />
                  ) : (
                    <View style={[styles.popularImage, { backgroundColor: colors.primary[100] }]} />
                  )}
                  <Text style={styles.popularName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.popularMeta}>
                    {item.checkin_count} {t("discover.checkins")}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            />
          </View>
        )}

        {/* Feed */}
        {feedLoading ? (
          <View style={{ padding: 16, gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ gap: 8 }}>
                <Skeleton height={180} borderRadius={12} />
                <Skeleton height={16} width="60%" />
                <Skeleton height={14} width="40%" />
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={feedItems}
            renderItem={renderFeedItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} /> : null}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 60 }}>
                <Text style={{ color: colors.neutral[500] }}>{t("discover.empty")}</Text>
              </View>
            }
          />
        )}
      </View>
    </HomeShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  feedImage: { height: 200, borderRadius: 8, backgroundColor: colors.neutral[100] },
  searchBar: { paddingHorizontal: 16, paddingVertical: 8 },
  searchInput: {
    backgroundColor: colors.neutral[100],
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.neutral[800],
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.neutral[100],
  },
  tabActive: { backgroundColor: colors.primary[500] },
  tabText: { fontSize: 14, color: colors.neutral[600] },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8, color: colors.neutral[700] },
  popularCard: { width: 120, marginRight: 8 },
  popularImage: { height: 80, borderRadius: 8, backgroundColor: colors.neutral[100], marginBottom: 4 },
  popularName: { fontSize: 13, fontWeight: "600" },
  popularMeta: { fontSize: 11, color: colors.neutral[500] },
});
