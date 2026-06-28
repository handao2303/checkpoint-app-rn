/**
 * UserProfileScreen — public profile of any user.
 * Route param: { userId: string }
 *
 * - Avatar, display name, username, bio
 * - Stats row: XP, checkpoints, journeys, level
 * - Follow / Unfollow button (hidden for own profile)
 * - 2-column grid of user's checkpoints
 */
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import type { RootStackParamList } from '../navigation/types';
import {
  getUserProfile,
  getUserCheckpoints,
  getFollowing,
  followUser,
  unfollowUser,
  type Checkpoint,
} from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { colors, status } from '../theme/colors';

const COLUMN_GAP = 8;
const NUM_COLUMNS = 2;

export default function UserProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'UserProfile'>>();
  const { userId } = route.params;
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const isOwnProfile = authUser?.id === userId;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => getUserProfile(userId),
  });

  const { data: checkpoints = [], isLoading: cpLoading } = useQuery({
    queryKey: ['userCheckpoints', userId],
    queryFn: () => getUserCheckpoints(userId, 30),
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following'],
    queryFn: getFollowing,
    enabled: !!authUser && !isOwnProfile,
  });

  const isFollowing = following.includes(userId);

  const followMutation = useMutation({
    mutationFn: () => (isFollowing ? unfollowUser(userId) : followUser(userId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['following'] });
    },
    onError: () => {
      Alert.alert('Lỗi', 'Không thể thực hiện. Vui lòng thử lại.');
    },
  });

  const renderCheckpoint = useCallback(
    ({ item }: { item: Checkpoint }) => (
      <Pressable
        style={styles.cpCard}
        onPress={() => navigation.navigate('CheckpointDetail', { id: item.id })}
      >
        {item.thumbnail_url || item.image_url ? (
          <Image
            source={{ uri: item.thumbnail_url ?? item.image_url ?? '' }}
            style={styles.cpImage}
          />
        ) : (
          <View style={[styles.cpImage, styles.cpImageFallback]}>
            <Icon name="image" size={24} color={colors.foregroundMuted} />
          </View>
        )}
        <View style={styles.cpInfo}>
          <Text style={styles.cpName} numberOfLines={1}>{item.name}</Text>
          {item.address ? (
            <Text style={styles.cpAddress} numberOfLines={1}>{item.address}</Text>
          ) : null}
        </View>
      </Pressable>
    ),
    [navigation],
  );

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Không tìm thấy người dùng.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ListHeader = useMemo(() => (
    <View>
      {/* Profile hero */}
      <View style={styles.hero}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {(profile.display_name || profile.username)[0].toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.displayName}>{profile.display_name || profile.username}</Text>
        <Text style={styles.username}>@{profile.username}</Text>

        {profile.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : null}

        {/* Follow button */}
        {!isOwnProfile && authUser ? (
          <View style={styles.followBtnWrap}>
            <Button
              variant={isFollowing ? 'outline' : 'primary'}
              size="sm"
              onPress={() => followMutation.mutate()}
              loading={followMutation.isPending}
            >
              {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
            </Button>
          </View>
        ) : null}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatItem label="XP" value={profile.total_xp.toLocaleString()} color={status.gold} />
        <View style={styles.statDivider} />
        <StatItem label="Checkpoint" value={String(profile.checkpoint_count)} />
        <View style={styles.statDivider} />
        <StatItem label="Hành trình" value={String(profile.journey_count)} />
        <View style={styles.statDivider} />
        <StatItem label="Cấp" value={String(profile.level)} color={colors.primary} />
      </View>

      {/* Checkpoints grid title */}
      <View style={styles.sectionHeader}>
        <Icon name="map-pin" size={16} color={colors.primary} />
        <Text style={styles.sectionTitle}>Checkpoint ({profile.checkpoint_count})</Text>
      </View>

      {cpLoading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
      ) : checkpoints.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có checkpoint nào.</Text>
      ) : null}
    </View>
  ), [
    profile,
    isOwnProfile,
    authUser,
    isFollowing,
    followMutation,
    cpLoading,
    checkpoints.length,
  ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {profile.display_name || profile.username}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={checkpoints}
        keyExtractor={(item) => item.id}
        renderItem={renderCheckpoint}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF8F1' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEDFD1',
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#2A211C', flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: '#7A6B5F' },

  hero: { alignItems: 'center', padding: 20, gap: 6 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 4 },
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 28, fontWeight: '700' },
  displayName: { fontSize: 20, fontWeight: '800', color: '#2A211C' },
  username: { fontSize: 14, color: '#7A6B5F' },
  bio: { fontSize: 14, color: '#5C4D42', textAlign: 'center', lineHeight: 20, marginTop: 4 },
  followBtnWrap: { marginTop: 8 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFDF8',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EEDFD1',
    paddingVertical: 12,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#2A211C' },
  statLabel: { fontSize: 11, color: '#7A6B5F' },
  statDivider: { width: 1, backgroundColor: '#EEDFD1' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2A211C' },
  emptyText: { fontSize: 14, color: '#7A6B5F', paddingHorizontal: 16, paddingBottom: 12 },

  listContent: { paddingBottom: 40 },
  columnWrapper: { gap: COLUMN_GAP, paddingHorizontal: 16, marginBottom: COLUMN_GAP },

  cpCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#EEDFD1',
  },
  cpImage: { width: '100%', aspectRatio: 1 },
  cpImageFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1EA' },
  cpInfo: { padding: 8, gap: 2 },
  cpName: { fontSize: 13, fontWeight: '700', color: '#2A211C' },
  cpAddress: { fontSize: 11, color: '#7A6B5F' },
});
