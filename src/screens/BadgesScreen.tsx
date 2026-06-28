/**
 * BadgesScreen — full badge collection.
 * Ported from web/src/pages/BadgeCollectionPage.tsx.
 *
 * Features:
 *  - Filter tabs: all / unlocked / locked
 *  - 2-column grid of BadgeMedal cards
 *  - Locked badges at reduced opacity with lock overlay
 *  - Tap badge → bottom Alert with details
 *  - Progress bars for badges with measurable progress (explorer_10, provinces_5)
 *  - Calls claimUnsentBadges() on mount → shows BadgeUnlockModal for new ones
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthContext';
import { getBadges, getPassport, claimUnsentBadges, type Badge, type UserBadge } from '../lib/api';
import { BadgeMedal } from '../components/BadgeMedal';
import { BadgeUnlockModal } from '../components/BadgeUnlockModal';
import { Icon } from '../components/ui/Icon';
import { Skeleton } from '../components/ui/Skeleton';
import { Card } from '../components/ui/Card';
import { colors, status } from '../theme/colors';

// ---- Progress hints ---------------------------------------------------------

type ProgressHint = {
  label: string;
  max: number;
  getValue: (checkpointCount: number, provinceCount: number) => number;
};

const PROGRESS_HINTS: Record<string, ProgressHint> = {
  explorer_10: { label: 'địa điểm', max: 10, getValue: (cp) => cp },
  provinces_5: { label: 'tỉnh thành', max: 5,  getValue: (_, prov) => prov },
};

// ---- Date format ------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// ---- Filter type ------------------------------------------------------------

type Filter = 'all' | 'unlocked' | 'locked';

const FILTER_LABELS: Record<Filter, (u: number, t: number, l: number) => string> = {
  all:      (_, t) => `Tất cả (${t})`,
  unlocked: (u)    => `Đã mở (${u})`,
  locked:   (_, __, l) => `Chưa mở (${l})`,
};

// ---- Badge card -------------------------------------------------------------

function BadgeCard({
  badge,
  onPress,
}: {
  badge: UserBadge;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.badgeCard, !badge.awarded && styles.badgeCardLocked]}
    >
      <BadgeMedal badge={badge} awarded={badge.awarded} size="md" showLevel={badge.level} />
      <Text style={styles.badgeName} numberOfLines={2}>{badge.name}</Text>
      <Text style={styles.badgeDesc} numberOfLines={2}>{badge.description}</Text>
      {badge.awarded ? (
        <View style={styles.awardedChip}>
          <Icon name="check" size={12} color="#2F8A52" />
          <Text style={styles.awardedChipText}>Đã mở khoá</Text>
        </View>
      ) : (
        <View style={styles.lockedChip}>
          <Text style={styles.lockedChipText}>Chưa mở</Text>
        </View>
      )}
      {badge.awarded && badge.awarded_at && (
        <Text style={styles.awardedDate}>{formatDate(badge.awarded_at)}</Text>
      )}
    </Pressable>
  );
}

// ---- Progress section -------------------------------------------------------

function ProgressSection({
  locked,
  checkpointCount,
  provinceCount,
}: {
  locked: UserBadge[];
  checkpointCount: number;
  provinceCount: number;
}) {
  const withHint = locked.filter((b) => PROGRESS_HINTS[b.key]);
  if (withHint.length === 0) return null;

  return (
    <View style={styles.progressSection}>
      <Text style={styles.progressTitle}>Tiến trình thành tựu</Text>
      <View style={{ gap: 12 }}>
        {withHint.map((badge) => {
          const hint = PROGRESS_HINTS[badge.key]!;
          const current = Math.min(hint.getValue(checkpointCount, provinceCount), hint.max);
          const pct = Math.round((current / hint.max) * 100);
          return (
            <Card key={badge.key} style={styles.progressCard}>
              <BadgeMedal badge={badge} awarded={false} size="sm" />
              <View style={styles.progressInfo}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressName}>{badge.name}</Text>
                  <Text style={styles.progressCount}>
                    {current}/{hint.max} {hint.label}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </View>
  );
}

// ---- Loading skeleton -------------------------------------------------------

function BadgeGridSkeleton() {
  return (
    <View style={styles.grid}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.badgeCard, { gap: 8 }]}>
          <Skeleton className="w-14 h-14 rounded-xl" />
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-24 h-3" />
          <Skeleton className="w-16 h-5 rounded-full" />
        </View>
      ))}
    </View>
  );
}

// ---- Main screen ------------------------------------------------------------

export default function BadgesScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { data: badges = [], isLoading: badgesLoading, refetch } = useQuery({
    queryKey: ['badges'],
    queryFn: getBadges,
  });

  const { data: passport } = useQuery({
    queryKey: ['passport'],
    queryFn: getPassport,
  });

  // Claim unsent badges on mount
  useEffect(() => {
    claimUnsentBadges()
      .then((claimed) => {
        if (claimed.length > 0) {
          setNewBadges(claimed);
          // Invalidate so the grid reflects newly awarded badges
          queryClient.invalidateQueries({ queryKey: ['badges'] });
        }
      })
      .catch(() => {
        // best-effort — ignore errors
      });
  }, [queryClient]);

  const unlocked = useMemo(() => badges.filter((b) => b.awarded), [badges]);
  const locked = useMemo(() => badges.filter((b) => !b.awarded), [badges]);
  const provinceCount = passport?.province_count ?? 0;
  const checkpointCount = user?.checkpoint_count ?? 0;

  const displayed = useMemo(() => {
    if (filter === 'unlocked') return unlocked;
    if (filter === 'locked') return locked;
    return badges;
  }, [filter, badges, unlocked, locked]);

  const FILTERS: Filter[] = ['all', 'unlocked', 'locked'];

  function openBadgeDetail(badge: UserBadge) {
    const status = badge.awarded
      ? `Đã mở khoá${badge.awarded_at ? ' · ' + formatDate(badge.awarded_at) : ''}`
      : 'Chưa mở khoá';
    Alert.alert(badge.name, `${badge.description}\n\n${status}`);
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Bộ sưu tập huy hiệu</Text>
          <Text style={styles.subtitle}>
            {unlocked.length}/{badges.length} huy hiệu đã mở
          </Text>
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((key) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[
                styles.filterChip,
                filter === key ? styles.filterChipActive : styles.filterChipInactive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === key ? styles.filterChipTextActive : styles.filterChipTextInactive,
                ]}
              >
                {FILTER_LABELS[key](unlocked.length, badges.length, locked.length)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Grid */}
        {badgesLoading ? (
          <BadgeGridSkeleton />
        ) : displayed.length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon name="award" size={32} color={colors.primary} />
            <Text style={styles.emptyText}>
              {filter === 'unlocked' ? 'Chưa có huy hiệu nào.' : 'Tất cả huy hiệu đã mở!'}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {displayed.map((badge) => (
              <BadgeCard
                key={badge.key}
                badge={badge}
                onPress={() => openBadgeDetail(badge)}
              />
            ))}
          </View>
        )}

        {/* Progress section */}
        {filter !== 'unlocked' && (
          <ProgressSection
            locked={locked}
            checkpointCount={checkpointCount}
            provinceCount={provinceCount}
          />
        )}
      </ScrollView>

      {/* Badge unlock celebration */}
      {newBadges.length > 0 && (
        <BadgeUnlockModal
          badges={newBadges}
          onDone={() => setNewBadges([])}
        />
      )}
    </SafeAreaView>
  );
}

// ---- Styles -----------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F1',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // Title
  titleBlock: {
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2A211C',
  },
  subtitle: {
    fontSize: 13,
    color: '#7A6B5F',
  },

  // Filter chips
  filterRow: {
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: '#F05A28',
  },
  filterChipInactive: {
    backgroundColor: '#FFF0E8',
    borderWidth: 1,
    borderColor: '#FFE0D1',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipTextInactive: {
    color: '#7A6B5F',
  },

  // Badge grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '47%',
    backgroundColor: '#FFFDF8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEDFD1',
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  badgeCardLocked: {
    opacity: 0.6,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A211C',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 11,
    color: '#7A6B5F',
    textAlign: 'center',
    lineHeight: 16,
  },
  awardedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAF5EC',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  awardedChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2F8A52',
  },
  awardedDate: {
    fontSize: 10,
    color: '#B8A99B',
  },
  lockedChip: {
    backgroundColor: '#F7EDE2',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  lockedChipText: {
    fontSize: 11,
    color: '#7A6B5F',
  },

  // Progress section
  progressSection: {
    gap: 12,
  },
  progressTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2A211C',
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  progressInfo: {
    flex: 1,
    gap: 6,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A211C',
    flex: 1,
  },
  progressCount: {
    fontSize: 11,
    color: '#7A6B5F',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F7EDE2',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F05A28',
    borderRadius: 99,
  },

  // Empty
  emptyBox: {
    alignItems: 'center',
    padding: 40,
    gap: 10,
    backgroundColor: '#FFF8F1',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FFE0D1',
  },
  emptyText: {
    fontSize: 14,
    color: '#7A6B5F',
    textAlign: 'center',
  },
});
