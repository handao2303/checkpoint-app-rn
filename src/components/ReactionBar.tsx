/**
 * ReactionBar — emoji reaction strip for a checkpoint.
 * Shows 5 reaction types with counts. Optimistic UI on tap.
 * Uses @tanstack/react-query for initial load, local state for optimistic updates.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getReactions, setReaction, clearReaction, type ReactionSummary } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme/colors';

const REACTIONS = [
  { key: 'like',  emoji: '👍', label: 'Thích' },
  { key: 'love',  emoji: '❤️', label: 'Yêu thích' },
  { key: 'fire',  emoji: '🔥', label: 'Tuyệt vời' },
  { key: 'haha',  emoji: '😄', label: 'Haha' },
  { key: 'sad',   emoji: '😢', label: 'Buồn' },
] as const;

interface ReactionBarProps {
  checkpointId: string;
  ownerUserId: string;
  checkpointName: string;
}

export function ReactionBar({ checkpointId }: ReactionBarProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ReactionSummary>({
    queryKey: ['reactions', checkpointId],
    queryFn: () => getReactions(checkpointId),
  });

  // Optimistic local state (null = use server data)
  const [optimistic, setOptimistic] = useState<ReactionSummary | null>(null);

  const summary = optimistic ?? data;

  const handleReaction = async (key: string) => {
    if (!user) {
      Alert.alert('Đăng nhập', 'Vui lòng đăng nhập để thả cảm xúc.');
      return;
    }

    const current = summary;
    const mine = current?.mine;
    const isToggle = mine === key;

    // Build optimistic summary
    const baseCounts: Record<string, number> = { ...(current?.counts ?? {}) };
    if (mine && mine in baseCounts) {
      baseCounts[mine] = Math.max(0, (baseCounts[mine] ?? 0) - 1);
    }
    if (!isToggle) {
      baseCounts[key] = (baseCounts[key] ?? 0) + 1;
    }
    const total = Object.values(baseCounts).reduce((a, b) => a + b, 0);
    setOptimistic({ counts: baseCounts, total, mine: isToggle ? null : key });

    try {
      let next: ReactionSummary;
      if (isToggle) {
        next = await clearReaction(checkpointId);
      } else {
        next = await setReaction(checkpointId, key);
      }
      setOptimistic(null);
      queryClient.setQueryData(['reactions', checkpointId], next);
    } catch {
      // Revert optimistic state and inform the user
      setOptimistic(null);
      Alert.alert('Lỗi', 'Không thể cập nhật cảm xúc. Vui lòng thử lại.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {REACTIONS.map((r) => {
        const count = summary?.counts[r.key] ?? 0;
        const isActive = summary?.mine === r.key;
        return (
          <Pressable
            key={r.key}
            style={[styles.reactionBtn, isActive && styles.reactionBtnActive]}
            onPress={() => handleReaction(r.key)}
          >
            <Text style={styles.emoji}>{r.emoji}</Text>
            {count > 0 ? (
              <Text style={[styles.count, isActive && styles.countActive]}>
                {count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: 12,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEDFD1',
    backgroundColor: '#FFF8F1',
  },
  reactionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF0E8',
  },
  emoji: {
    fontSize: 16,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A6B5F',
  },
  countActive: {
    color: colors.primary,
  },
});
