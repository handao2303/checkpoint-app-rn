/**
 * FeedScreen — two-tab social feed: "For You" (getFeed) and "Following"
 * (getFeedFollowing). Infinite scroll via FlashList, pull-to-refresh.
 *
 * Ported from web/src/pages/FeedPage.tsx.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getFeed,
  getFeedFollowing,
  type FeedItem,
  type LatLng,
} from '../lib/api';
import { useUserLocation } from '../location/LocationProvider';
import { CheckpointCard } from '../components/CheckpointCard';
import { Skeleton } from '../components/ui/Skeleton';
import { Icon } from '../components/ui/Icon';
import type { RootStackParamList } from '../navigation/types';

// ----- Types ---------------------------------------------------------------

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'for-you' | 'following';

// ----- Constants -----------------------------------------------------------

const FALLBACK: LatLng = { lat: 10.7769, lng: 106.7009 }; // HCMC

// ----- Sub-components ------------------------------------------------------

function FeedCardSkeleton() {
  return (
    <View className="rounded-2xl border border-border bg-surface mb-3 overflow-hidden">
      <View className="flex-row items-center gap-3 p-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <View className="flex-1 gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </View>
      </View>
      <Skeleton className="h-48 w-full rounded-none" />
      <View className="flex-row items-center gap-3 p-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </View>
    </View>
  );
}

function EmptyFollowingState() {
  return (
    <View className="rounded-xl bg-surface-muted p-8 items-center mx-4">
      <Icon name="user-plus" size={40} color="#A89A90" />
      <Text className="mt-3 font-bold text-foreground text-base text-center">
        Theo dõi mọi người
      </Text>
      <Text className="mt-2 text-sm text-muted-foreground text-center">
        Hãy theo dõi bạn bè để xem checkpoint của họ ở đây
      </Text>
    </View>
  );
}

function EmptyForYouState() {
  return (
    <View className="rounded-xl bg-surface-muted p-8 items-center mx-4">
      <Icon name="map-pin" size={40} color="#A89A90" />
      <Text className="mt-3 text-sm text-muted-foreground text-center">
        Chưa có checkpoint nào quanh bạn
      </Text>
    </View>
  );
}

// ----- Main Screen ---------------------------------------------------------

export default function FeedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { coords } = useUserLocation();
  const at: LatLng = coords
    ? { lat: coords.latitude, lng: coords.longitude }
    : FALLBACK;

  const [tab, setTab] = useState<Tab>('for-you');
  const [refreshing, setRefreshing] = useState(false);

  // "For You" feed
  const forYou = useInfiniteQuery({
    queryKey: ['feed', at.lat, at.lng],
    queryFn: ({ pageParam }) => getFeed(at, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor,
  });

  // "Following" feed — enabled only when tab is selected
  const following = useInfiniteQuery({
    queryKey: ['feed-following', at.lat, at.lng],
    queryFn: ({ pageParam }) =>
      getFeedFollowing(at, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor,
    enabled: tab === 'following',
  });

  const active = tab === 'following' ? following : forYou;
  const { fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = active;
  const items = active.data?.pages.flatMap((p) => p.items) ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const queryKey =
      tab === 'following'
        ? ['feed-following', at.lat, at.lng]
        : ['feed', at.lat, at.lng];
    await queryClient.resetQueries({ queryKey, exact: true });
    setRefreshing(false);
  }, [queryClient, tab, at.lat, at.lng]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <CheckpointCard
        item={item}
        onPress={() => navigation.navigate('CheckpointDetail', { id: item.id })}
      />
    ),
    [navigation],
  );

  const TabHeader = (
    <View className="border-b border-border flex-row pt-14 mb-3">
      {(['for-you', 'following'] as Tab[]).map((key) => {
        const label = key === 'for-you' ? 'Dành cho bạn' : 'Đang theo dõi';
        const active = key === tab;
        return (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            className="flex-1 items-center pb-3 relative"
          >
            <Text
              className={`font-bold text-base ${
                active ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {label}
            </Text>
            {active ? (
              <View className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-foreground" />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface px-4">
        {TabHeader}
        {Array.from({ length: 3 }).map((_, i) => (
          <FeedCardSkeleton key={i} />
        ))}
      </View>
    );
  }

  const EmptyComponent =
    tab === 'following' ? <EmptyFollowingState /> : <EmptyForYouState />;

  return (
    <View className="flex-1 bg-surface">
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={TabHeader}
        ListEmptyComponent={EmptyComponent}
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
