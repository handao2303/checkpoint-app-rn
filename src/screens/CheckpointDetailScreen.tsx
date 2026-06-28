/**
 * CheckpointDetailScreen — full detail view for a single checkpoint.
 * Route param: { id: string }
 *
 * - Horizontal image scroll
 * - Name, note, address, rating, author
 * - ReactionBar + CommentSection
 * - Share stub (Alert)
 * - viewCheckpoint() called on mount (fire-and-forget)
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import type { RootStackParamList } from '../navigation/types';
import { getCheckpointDetail, viewCheckpoint } from '../lib/api';
import { ReactionBar } from '../components/ReactionBar';
import { CommentSection } from '../components/CommentSection';
import { ShareButton } from '../components/ShareButton';
import { Icon } from '../components/ui/Icon';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CheckpointDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CheckpointDetail'>>();
  const { id } = route.params;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['checkpointDetail', id],
    queryFn: () => getCheckpointDetail(id),
  });

  // Fire-and-forget view count
  useEffect(() => {
    void viewCheckpoint(id);
  }, [id]);

  if (isLoading) {
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

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Không tải được checkpoint.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { checkpoint, images, author } = data;

  const formattedDate = checkpoint.taken_at
    ? new Date(checkpoint.taken_at).toLocaleDateString('vi-VN')
    : new Date(checkpoint.created_at).toLocaleDateString('vi-VN');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{checkpoint.name}</Text>
        <ShareButton type="checkpoint" id={id} name={data?.checkpoint.name ?? ''} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image gallery */}
        {images.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroll}
          >
            {images.map((img) => (
              <Image
                key={img.id}
                source={{ uri: img.url }}
                style={[styles.image, { width: SCREEN_WIDTH }]}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : checkpoint.image_url ? (
          <Image
            source={{ uri: checkpoint.image_url }}
            style={[styles.image, { width: SCREEN_WIDTH }]}
            resizeMode="cover"
          />
        ) : null}

        {/* Details */}
        <View style={styles.details}>
          <Text style={styles.name}>{checkpoint.name}</Text>

          {/* Category + rating */}
          <View style={styles.metaRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{checkpoint.category}</Text>
            </View>
            {checkpoint.rating != null ? (
              <View style={styles.ratingRow}>
                <Icon name="star" size={14} color="#E0A73A" />
                <Text style={styles.ratingText}>{checkpoint.rating}/5</Text>
              </View>
            ) : null}
          </View>

          {/* Address */}
          {checkpoint.address ? (
            <View style={styles.addressRow}>
              <Icon name="map-pin" size={14} color={colors.foregroundMuted} />
              <Text style={styles.addressText}>{checkpoint.address}</Text>
            </View>
          ) : null}

          {/* Note */}
          {checkpoint.note ? (
            <Text style={styles.note}>{checkpoint.note}</Text>
          ) : null}

          {/* Author + date */}
          <View style={styles.authorRow}>
            {author.avatar_url ? (
              <Image source={{ uri: author.avatar_url }} style={styles.authorAvatar} />
            ) : (
              <View style={[styles.authorAvatar, styles.authorAvatarFallback]}>
                <Text style={styles.authorInitial}>
                  {(author.display_name || author.username)[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>
                {author.display_name || author.username}
              </Text>
              <Text style={styles.authorDate}>{formattedDate}</Text>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>+{checkpoint.xp_awarded} XP</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <Icon name="eye" size={14} color={colors.foregroundMuted} />
            <Text style={styles.statsText}>{checkpoint.view_count} lượt xem</Text>
          </View>
        </View>

        {/* Reactions */}
        <ReactionBar
          checkpointId={id}
          ownerUserId={checkpoint.user_id}
          checkpointName={checkpoint.name}
        />

        {/* Comments */}
        <CommentSection
          checkpointId={id}
          ownerUserId={checkpoint.user_id}
          checkpointName={checkpoint.name}
          onOpenProfile={(uid) => navigation.navigate('UserProfile', { userId: uid })}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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

  imageScroll: { height: 280 },
  image: { height: 280 },

  details: { padding: 16, gap: 10 },
  name: { fontSize: 22, fontWeight: '800', color: '#2A211C' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryChip: {
    backgroundColor: '#FFF0E8',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FFC2A8',
  },
  categoryText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '600', color: '#E0A73A' },

  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addressText: { flex: 1, fontSize: 13, color: '#7A6B5F', lineHeight: 18 },

  note: { fontSize: 15, color: '#2A211C', lineHeight: 22 },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEDFD1',
  },
  authorAvatar: { width: 38, height: 38, borderRadius: 19 },
  authorAvatarFallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitial: { color: '#fff', fontWeight: '700', fontSize: 14 },
  authorName: { fontSize: 14, fontWeight: '700', color: '#2A211C' },
  authorDate: { fontSize: 12, color: '#7A6B5F' },
  xpBadge: {
    backgroundColor: '#EAF5EC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  xpText: { fontSize: 12, fontWeight: '700', color: '#2F8A52' },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statsText: { fontSize: 13, color: '#7A6B5F' },
});
