/**
 * CheckpointCard — shared card for feed items (FeedItem).
 * Used by FeedScreen and any other screen that shows user check-ins.
 */
import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { UserAvatar } from './ui/UserAvatar';
import { Icon } from './ui/Icon';
import { Chip } from './ui/Chip';
import type { FeedItem } from '../lib/api';

function formatDistance(m: number | null | undefined): string | null {
  if (m == null || !Number.isFinite(m) || m < 0) return null;
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

interface CheckpointCardProps {
  item: FeedItem;
  onPress: () => void;
}

export function CheckpointCard({ item, onPress }: CheckpointCardProps) {
  const author = item.author.display_name || item.author.username;
  const distance = formatDistance(item.distance_m);
  const imageUrl = item.thumbnail_url ?? item.image_url;

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface rounded-2xl overflow-hidden mb-3 shadow-sm border border-border"
      android_ripple={{ color: '#0000001A' }}
    >
      {/* Cover image */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', aspectRatio: 16 / 9 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{ width: '100%', aspectRatio: 16 / 9 }}
          className="bg-surface-muted items-center justify-center"
        >
          <Icon name="image" size={32} color="#A89A90" />
        </View>
      )}

      {/* Content */}
      <View className="p-3 gap-2">
        {/* Author row */}
        <View className="flex-row items-center gap-2">
          <UserAvatar
            url={item.author.avatar_url}
            name={author}
            username={item.author.username}
            size={32}
          />
          <Text
            className="font-semibold text-foreground text-sm flex-1"
            numberOfLines={1}
          >
            {author}
          </Text>
          {distance && (
            <Text className="text-xs text-muted-foreground">{distance}</Text>
          )}
        </View>

        {/* Checkpoint name */}
        <Text
          className="font-bold text-foreground text-base"
          numberOfLines={2}
        >
          {item.name}
        </Text>

        {/* Address */}
        {item.address ? (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {item.address}
          </Text>
        ) : null}

        {/* Category + date row */}
        <View className="flex-row items-center gap-2">
          <Chip label={item.category} tone="neutral" />
          <Text className="text-xs text-muted-foreground ml-auto">
            {new Date(item.created_at).toLocaleDateString('vi-VN')}
          </Text>
        </View>

        {/* Note preview */}
        {item.note ? (
          <Text className="text-sm text-foreground-muted italic" numberOfLines={2}>
            {item.note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
