/**
 * DiscoverScreen — nearby places with infinite scroll, category filter chips,
 * pull-to-refresh, and skeleton loading state.
 *
 * Ported from web/src/pages/DiscoverPage.tsx.
 * Uses getNearbyAppPlaces (Place[]) rather than the FeedItem feed.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getNearbyAppPlaces,
  type Place,
  type LatLng,
} from '../lib/api';
import { useUserLocation } from '../location/LocationProvider';
import { Icon } from '../components/ui/Icon';
import { Skeleton } from '../components/ui/Skeleton';
import type { RootStackParamList } from '../navigation/types';

// ----- Types ---------------------------------------------------------------

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterKey = 'all' | 'hot' | 'cafe' | 'food';

interface FilterChip {
  key: FilterKey;
  label: string;
}

// ----- Constants -----------------------------------------------------------

const FALLBACK: LatLng = { lat: 10.7769, lng: 106.7009 }; // HCMC

const FILTER_CHIPS: FilterChip[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'hot', label: 'Đang hot' },
  { key: 'cafe', label: 'Cafe' },
  { key: 'food', label: 'Ăn uống' },
];

// ----- Helpers -------------------------------------------------------------

function formatDistance(m: number | null | undefined): string | null {
  if (m == null || !Number.isFinite(m) || m < 0) return null;
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) * Math.sin(dphi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) * Math.sin(dlambda / 2);
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ----- Sub-components ------------------------------------------------------

function PlaceCardSkeleton() {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3 mb-3">
      <Skeleton className="h-16 w-16 rounded-xl" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
        <View className="flex-row gap-3 mt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </View>
      </View>
    </View>
  );
}

function PlaceCard({
  place,
  distance,
  onPress,
}: {
  place: Place;
  distance: string | null;
  onPress: () => void;
}) {
  const imageUrl = place.cover_thumbnail_url ?? place.cover_image_url;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3 mb-3 shadow-sm"
      android_ripple={{ color: '#0000001A' }}
    >
      {/* Thumbnail */}
      <View className="h-16 w-16 rounded-xl overflow-hidden bg-surface-muted items-center justify-center">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: 64, height: 64 }}
            resizeMode="cover"
          />
        ) : (
          <Icon name="image" size={24} color="#A89A90" />
        )}
      </View>

      {/* Info */}
      <View className="flex-1 min-w-0">
        <Text className="font-bold text-foreground text-base" numberOfLines={1}>
          {place.name}
        </Text>
        {place.address ? (
          <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
            {place.address}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-3 mt-2 flex-wrap">
          {place.avg_rating != null && (
            <View className="flex-row items-center gap-1">
              <Icon name="star" size={13} color="#F5C842" />
              <Text className="text-xs text-foreground font-medium">
                {place.avg_rating.toFixed(1)}
              </Text>
            </View>
          )}
          <View className="flex-row items-center gap-1">
            <Icon name="flag" size={13} color="#7A6B5F" />
            <Text className="text-xs text-muted-foreground">{place.checkin_count}</Text>
          </View>
          {distance ? (
            <View className="flex-row items-center gap-1">
              <Icon name="map-pin" size={13} color="#7A6B5F" />
              <Text className="text-xs text-muted-foreground">{distance}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Checked-in badge */}
      {place.viewer_has_checked_in ? (
        <View className="rounded-full border border-green-100 bg-green-50 px-3 py-1.5">
          <Text className="text-xs font-bold text-green-700">Đã cắm</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View className="rounded-xl bg-surface-muted p-6 items-center">
      <Icon name="map-pin" size={40} color="#A89A90" />
      <Text className="mt-3 text-sm text-muted-foreground text-center">
        Chưa có địa điểm nào gần bạn
      </Text>
    </View>
  );
}

// ----- Main Screen ---------------------------------------------------------

export default function DiscoverScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { coords } = useUserLocation();
  const at: LatLng = coords
    ? { lat: coords.latitude, lng: coords.longitude }
    : FALLBACK;

  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Map filter key → server params
  const nearbyOpts = useMemo(() => {
    switch (activeFilter) {
      case 'hot':
        return { sort: 'popular' as const };
      case 'cafe':
        return { category: 'cafe' };
      case 'food':
        return { category: 'food' };
      default:
        return {};
    }
  }, [activeFilter]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['places', 'nearby', at.lat, at.lng, activeFilter],
    queryFn: ({ pageParam }) =>
      getNearbyAppPlaces(at, {
        limit: 20,
        offset: pageParam as number,
        ...nearbyOpts,
      }),
    initialPageParam: 0 as number,
    getNextPageParam: (lastPage) => lastPage.next_offset,
  });

  const places = data?.pages.flatMap((p) => p.places) ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.resetQueries({
      queryKey: ['places', 'nearby', at.lat, at.lng, activeFilter],
      exact: true,
    });
    setRefreshing(false);
  }, [queryClient, at.lat, at.lng, activeFilter]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: Place }) => (
      <PlaceCard
        place={item}
        distance={formatDistance(haversine(at.lat, at.lng, item.lat, item.lng))}
        onPress={() => navigation.navigate('PlaceDetail', { id: item.id })}
      />
    ),
    [at.lat, at.lng, navigation],
  );

  const FilterHeader = (
    <>
      {/* Page title */}
      <View className="pt-14 pb-2">
        <Text className="font-bold text-foreground text-2xl">Khám phá</Text>
        <Text className="text-sm text-muted-foreground mt-1">
          Địa điểm gần bạn
        </Text>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 12, gap: 8 }}
      >
        {FILTER_CHIPS.map((chip) => {
          const active = chip.key === activeFilter;
          return (
            <Pressable
              key={chip.key}
              onPress={() => setActiveFilter(chip.key)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: active ? '#6B5248' : '#E8DDD7',
                backgroundColor: active ? '#6B5248' : '#FFFFFF',
              }}
              android_ripple={{ color: '#0000001A' }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: active ? '#FFFFFF' : '#3D2B1F',
                }}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface px-4">
        {FilterHeader}
        {Array.from({ length: 5 }).map((_, i) => (
          <PlaceCardSkeleton key={i} />
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <FlashList
        data={places}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={FilterHeader}
        ListEmptyComponent={<EmptyState />}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" />
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}
