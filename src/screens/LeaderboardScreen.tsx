/**
 * LeaderboardScreen — global XP leaderboard.
 * Ported from web/src/pages/LeaderboardPage.tsx.
 *
 * Layout:
 *  - Header stats card (top XP, player count, user rank)
 *  - Top-3 podium cards (displayed 2nd / 1st / 3rd)
 *  - FlatList of rank 4+ entries
 *  - Pinned "your rank" row when the user is outside the top list
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthContext';
import { getLeaderboard, type LeaderboardEntry } from '../lib/api';
import { UserAvatar } from '../components/ui/UserAvatar';
import { Icon } from '../components/ui/Icon';
import { Skeleton } from '../components/ui/Skeleton';
import { colors, status } from '../theme/colors';

// ---- helpers ----------------------------------------------------------------

const xpFormatter = new Intl.NumberFormat('vi-VN');

function formatXP(xp: number) {
  return xpFormatter.format(xp);
}

function displayName(entry: LeaderboardEntry) {
  return entry.display_name || entry.username;
}

// Medal colours for rank 1/2/3
const MEDAL_COLORS = ['#E0A73A', '#9CA3AF', '#CD7F32'] as const;
const MEDAL_BG = ['#FFFBEB', '#F9FAFB', '#FEF3C7'] as const;

// ---- XP chip ----------------------------------------------------------------

function XPChip({ xp }: { xp: number }) {
  return (
    <View style={styles.xpChip}>
      <Icon name="star" size={12} color={colors.primary} />
      <Text style={styles.xpChipText}>{formatXP(xp)}</Text>
    </View>
  );
}

// ---- Header stats -----------------------------------------------------------

function HeaderStats({
  entries,
  me,
}: {
  entries: LeaderboardEntry[];
  me?: LeaderboardEntry;
}) {
  const topXP = entries[0]?.total_xp ?? 0;

  return (
    <View style={styles.headerCard}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Bảng xếp hạng</Text>
          <Text style={styles.headerSub}>Tuần khám phá</Text>
        </View>
        <View style={styles.trophyBadge}>
          <Icon name="trophy" size={28} color={status.gold} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Top XP</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{formatXP(topXP)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Người chơi</Text>
          <Text style={styles.statValue}>{entries.length}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Bạn</Text>
          <Text style={[styles.statValue, { color: '#2E7D32' }]}>
            {me ? `#${me.rank}` : '--'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---- Podium card (top 3) ----------------------------------------------------

function PodiumCard({
  entry,
  isMe,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
}) {
  const rankIdx = entry.rank - 1; // 0-based
  const medalColor = MEDAL_COLORS[rankIdx] ?? '#9CA3AF';
  const medalBg = MEDAL_BG[rankIdx] ?? '#F9FAFB';
  const isFirst = entry.rank === 1;
  const name = displayName(entry);

  return (
    <View
      style={[
        styles.podiumCard,
        isFirst ? styles.podiumFirst : styles.podiumOther,
        isMe && styles.podiumMe,
        { borderColor: medalColor + '55' },
      ]}
    >
      {/* Rank badge */}
      <View style={[styles.podiumRankBadge, { backgroundColor: medalBg, borderColor: medalColor }]}>
        <Icon name={isFirst ? 'trophy' : 'medal'} size={14} color={medalColor} />
        <Text style={[styles.podiumRankText, { color: medalColor }]}>{entry.rank}</Text>
      </View>

      <UserAvatar
        url={entry.avatar_url}
        name={name}
        username={entry.username}
        size={isFirst ? 52 : 44}
      />

      <Text style={styles.podiumName} numberOfLines={1}>{name}</Text>
      <Text style={styles.podiumLevel}>Lv. {entry.level}</Text>
      <XPChip xp={entry.total_xp} />
    </View>
  );
}

// ---- Podium row (2nd | 1st | 3rd) ------------------------------------------

function Podium({
  top3,
  myId,
}: {
  top3: LeaderboardEntry[];
  myId?: string;
}) {
  // Reorder for visual podium: [silver, gold, bronze]
  const ordered = [top3[1], top3[0], top3[2]].filter(Boolean) as LeaderboardEntry[];

  return (
    <View style={styles.podiumRow}>
      {ordered.map((entry) => (
        <PodiumCard key={entry.user_id} entry={entry} isMe={entry.user_id === myId} />
      ))}
    </View>
  );
}

// ---- Row (rank 4+) ----------------------------------------------------------

function LeaderboardRow({
  entry,
  highlight,
}: {
  entry: LeaderboardEntry;
  highlight: boolean;
}) {
  const name = displayName(entry);

  return (
    <View
      style={[
        styles.row,
        highlight ? styles.rowHighlight : styles.rowNormal,
      ]}
    >
      <Text style={styles.rowRank}>{entry.rank}</Text>
      <UserAvatar url={entry.avatar_url} name={name} username={entry.username} size={44} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
        <View style={styles.rowLevelChip}>
          <Text style={styles.rowLevelText}>Lv. {entry.level}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <XPChip xp={entry.total_xp} />
        <View style={styles.rowRankBadge}>
          <Icon name="flag" size={12} color={colors.foregroundMuted} />
          <Text style={styles.rowRankBadgeText}>#{entry.rank}</Text>
        </View>
      </View>
    </View>
  );
}

// ---- Loading skeleton -------------------------------------------------------

function LoadingSkeleton() {
  return (
    <View style={{ gap: 12, padding: 16 }}>
      <View style={styles.podiumRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.podiumCard, styles.podiumOther, { flex: 1 }]}>
            <Skeleton className="w-12 h-12 rounded-full" />
            <Skeleton className="w-16 h-3 mt-2" />
            <Skeleton className="w-10 h-3 mt-1" />
          </View>
        ))}
      </View>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.row, styles.rowNormal]}>
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="w-11 h-11 rounded-full" />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-14 h-3 rounded-full" />
          </View>
          <Skeleton className="w-16 h-7 rounded-full" />
        </View>
      ))}
    </View>
  );
}

// ---- Main screen ------------------------------------------------------------

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: getLeaderboard,
  });

  const entries = data?.entries ?? [];
  const me = data?.me;
  const myId = user?.id;
  const meInTop = me != null && entries.some((e) => e.user_id === me.user_id);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderRow = useCallback(
    ({ item }: ListRenderItemInfo<LeaderboardEntry>) => (
      <LeaderboardRow entry={item} highlight={item.user_id === myId} />
    ),
    [myId],
  );

  const keyExtractor = useCallback((item: LeaderboardEntry) => item.user_id, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={rest}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            <HeaderStats entries={entries} me={me} />

            {entries.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="mountain" size={34} color={colors.primary} />
                <Text style={styles.emptyTitle}>Chưa có ai trên bảng</Text>
                <Text style={styles.emptyDesc}>
                  Check-in đầu tiên sẽ mở bảng xếp hạng!
                </Text>
              </View>
            ) : (
              <>
                {top3.length > 0 && <Podium top3={top3} myId={myId} />}
                {rest.length > 0 && (
                  <View style={styles.sectionHeader}>
                    <Icon name="compass" size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Top nhà khám phá</Text>
                  </View>
                )}
              </>
            )}
          </>
        }
        ListFooterComponent={
          me && !meInTop ? (
            <View style={styles.myRankSection}>
              <Text style={styles.myRankLabel}>— Hạng của bạn —</Text>
              <LeaderboardRow entry={me} highlight />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

// ---- Styles -----------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F1',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Header card
  headerCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEDFD1',
    padding: 16,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#2A211C',
  },
  headerSub: {
    fontSize: 12,
    color: '#7A6B5F',
    marginTop: 2,
  },
  trophyBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#E0A73A44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFF0E8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0D1',
    padding: 10,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7A6B5F',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2A211C',
  },

  // Podium
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 16,
  },
  podiumCard: {
    flex: 1,
    backgroundColor: '#FFFDF8',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EEDFD1',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
    position: 'relative',
  },
  podiumFirst: {
    paddingVertical: 36,
  },
  podiumOther: {
    paddingVertical: 24,
  },
  podiumMe: {
    borderColor: '#F05A28',
  },
  podiumRankBadge: {
    position: 'absolute',
    top: -14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 99,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  podiumRankText: {
    fontSize: 14,
    fontWeight: '900',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2A211C',
    textAlign: 'center',
  },
  podiumLevel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7A6B5F',
  },

  // List rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  rowNormal: {
    backgroundColor: '#FFFDF8',
    borderColor: '#EEDFD1',
  },
  rowHighlight: {
    backgroundColor: '#FFF0E8',
    borderColor: '#F05A28',
  },
  rowRank: {
    fontSize: 18,
    fontWeight: '900',
    color: '#7A6B5F',
    width: 28,
    textAlign: 'center',
  },
  rowInfo: {
    flex: 1,
    gap: 4,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A211C',
  },
  rowLevelChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF0E8',
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#FFE0D1',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rowLevelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7A6B5F',
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rowRankBadgeText: {
    fontSize: 11,
    color: '#7A6B5F',
  },

  // XP chip
  xpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#FFE0D1',
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  xpChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F05A28',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#2A211C',
  },

  // My rank footer
  myRankSection: {
    marginTop: 16,
    gap: 8,
  },
  myRankLabel: {
    textAlign: 'center',
    fontSize: 12,
    color: '#7A6B5F',
    fontWeight: '600',
  },

  // Empty state
  emptyBox: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FFE0D1',
    backgroundColor: '#FFF8F1',
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A211C',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#7A6B5F',
    textAlign: 'center',
  },
});
