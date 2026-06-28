/**
 * BadgesSection — earned badge collection.
 * Ported from web/src/components/BadgesSection.tsx.
 * Shows earned badges in a horizontal scroll (preview mode) or 2-col grid (full).
 */
import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { getBadges } from '../lib/api';
import { Card } from './ui/Card';
import { Icon } from './ui/Icon';
import { Skeleton } from './ui/Skeleton';
import { colors, status } from '../theme/colors';

// ---- badge medal (simplified hex shape) -------------------------------------

const MEDAL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  orange: { bg: '#FFF0E8', border: '#F05A28', text: '#D94C20' },
  gold:   { bg: '#FFFBEB', border: '#E0A73A', text: '#B45309' },
  green:  { bg: '#EAF5EC', border: '#2F8A52', text: '#216338' },
  blue:   { bg: '#EFF6FF', border: '#2563EB', text: '#1D4ED8' },
  purple: { bg: '#F5F3FF', border: '#7C3AED', text: '#6D28D9' },
  red:    { bg: '#FEF2F2', border: '#DC2626', text: '#B91C1C' },
};

function BadgeMedal({ color, icon, awarded }: { color: string; icon: string; awarded: boolean }) {
  const palette = MEDAL_COLORS[color] ?? MEDAL_COLORS.orange;
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: awarded ? palette.border : '#D6C8BA',
        backgroundColor: awarded ? palette.bg : '#F7EDE2',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: awarded ? 1 : 0.5,
      }}
    >
      <Icon
        name={(icon as any) || 'award'}
        size={24}
        color={awarded ? palette.text : '#B8A99B'}
      />
    </View>
  );
}

// ---- main component ---------------------------------------------------------

interface BadgesSectionProps {
  /** If set, show only this many unlocked badges in a horizontal scroll. */
  maxPreview?: number;
}

export function BadgesSection({ maxPreview }: BadgesSectionProps) {
  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: getBadges,
  });

  const awarded = badges.filter((b) => b.awarded);
  const displayed = maxPreview ? awarded.slice(0, maxPreview) : badges;

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Icon name="award" size={20} color={status.gold} />
          <Text className="font-display text-lg font-bold text-foreground">Huy hiệu</Text>
        </View>
        {badges.length > 0 ? (
          <Text className="text-sm text-muted-foreground">
            {awarded.length}/{badges.length}
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-row gap-3">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="items-center gap-1.5 w-14">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <Skeleton className="w-10 h-2.5" />
            </View>
          ))}
        </View>
      ) : awarded.length === 0 ? (
        <Text className="text-sm text-muted-foreground">Chưa có huy hiệu nào.</Text>
      ) : maxPreview ? (
        /* Horizontal scroll preview */
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {displayed.map((b) => (
            <View key={b.key} className="items-center mr-4 w-14">
              <BadgeMedal color={b.color} icon={b.icon} awarded={b.awarded} />
              <Text className="text-[10px] font-semibold text-center mt-1" numberOfLines={2}>
                {b.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        /* 2-column grid (full list, not currently used on profile but available) */
        <View className="flex-row flex-wrap gap-3">
          {displayed.map((b) => (
            <View
              key={b.key}
              className="flex-1 min-w-[40%] rounded-xl border border-border bg-surface p-3 items-center gap-1.5"
              style={{ opacity: b.awarded ? 1 : 0.6 }}
            >
              <BadgeMedal color={b.color} icon={b.icon} awarded={b.awarded} />
              <Text className="text-sm font-semibold text-center">{b.name}</Text>
              <Text className="text-xs text-muted-foreground text-center">{b.description}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
