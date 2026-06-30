/**
 * CheckpointDetailSheet — full checkpoint detail in a scrollable bottom sheet.
 * Ported to parity with web/src/components/CheckpointDetailSheet.tsx:
 *   - Horizontal image gallery (pending placeholder) + full-screen lightbox.
 *   - Category icon + name, rating, note, address.
 *   - Author (tap → profile), XP badge, view count, directions button.
 *   - Capture / created date.
 *   - Share, ReactionBar, CommentSection.
 *   - Owner-only delete (confirm via Alert).
 *
 * Records a view on open and refetches so the count reflects it.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { Sheet } from './ui/Sheet';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';
import { UserAvatar } from './ui/UserAvatar';
import { XPBadge } from './ui/Chip';
import { DetailSheetSkeleton } from './ui/Skeleton';
import { ReactionBar } from './ReactionBar';
import { CommentSection } from './CommentSection';
import {
  getCheckpointDetail,
  viewCheckpoint,
  deleteCheckpoint,
  type CheckpointImage,
} from '../lib/api';
import { shareCheckpoint } from '../lib/share';
import { categoryIcon } from '../lib/maps';
import { openDirectionsInMaps } from '../lib/geo';
import { useAuth } from '../auth/AuthContext';
import { light, status, accent } from '../theme/colors';
import { trackEvent } from '../lib/observability';
import type { RootStackParamList } from '../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_W = 240;
const GALLERY_H = 176;

interface CheckpointDetailSheetProps {
  id: string | null;
  onClose: () => void;
}

export function CheckpointDetailSheet({ id, onClose }: CheckpointDetailSheetProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['checkpoint', id],
    queryFn: () => getCheckpointDetail(id!),
    enabled: !!id,
  });

  // Count this open as a view, then refetch so the displayed count includes it.
  useEffect(() => {
    if (!id) return;
    trackEvent('checkpoint_detail_open', { checkpoint_id: id });
    let cancelled = false;
    void viewCheckpoint(id).then(() => {
      if (!cancelled) queryClient.invalidateQueries({ queryKey: ['checkpoint', id] });
    });
    return () => {
      cancelled = true;
    };
  }, [id, queryClient]);

  const checkpoint = data?.checkpoint;
  const author = data?.author;
  const isMine = !!checkpoint && !!user && checkpoint.user_id === user.id;

  // Non-pending images are the ones that can open in the lightbox.
  const viewable = (data?.images ?? []).filter((im) => !im.pending);

  const openProfile = (userId: string) => {
    trackEvent('feed_profile_open', { source: 'checkpoint_detail' });
    onClose();
    navigation.navigate('UserProfile', { userId });
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(t('xoa_checkin'), t('xac_nhan_xoa_checkin'), [
      { text: t('huy'), style: 'cancel' },
      {
        text: t('xoa'),
        style: 'destructive',
        onPress: async () => {
          trackEvent('checkpoint_delete_request', { checkpoint_id: id });
          setDeleting(true);
          try {
            await deleteCheckpoint(id);
            queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
            onClose();
          } catch {
            Alert.alert(t('loi'), t('xoa_that_bai'));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const formattedDate = checkpoint
    ? checkpoint.taken_at
      ? `${t('chup_luc')} ${new Date(checkpoint.taken_at).toLocaleString('vi-VN')}`
      : new Date(checkpoint.created_at).toLocaleString('vi-VN')
    : '';

  return (
    <>
      <Sheet open={!!id} onClose={onClose} snapPoints={['55%', '90%']} scrollable>
        {isLoading || !data || !checkpoint || !author ? (
          <View style={styles.skeletonWrap}>
            <DetailSheetSkeleton />
          </View>
        ) : (
          <View style={styles.body}>
            {/* Image gallery */}
            {data.images.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.gallery}
              >
                {data.images.map((im: CheckpointImage) =>
                  im.pending ? (
                    <View key={im.id} style={[styles.galleryItem, styles.galleryPending]}>
                      <Icon name={im.type === 'video' ? 'video' : 'image'} size={24} color={light.mutedForeground} />
                      <Text style={styles.pendingText}>{t('dang_xu_ly')}</Text>
                    </View>
                  ) : (
                    <Pressable
                      key={im.id}
                      onPress={() => setLightboxIndex(viewable.findIndex((v) => v.id === im.id))}
                      style={styles.galleryItem}
                    >
                      <Image source={{ uri: im.url }} style={styles.galleryImg} resizeMode="cover" />
                      {im.type === 'video' ? (
                        <View style={styles.playOverlay}>
                          <Icon name="play" size={22} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </Pressable>
                  ),
                )}
              </ScrollView>
            ) : null}

            {/* Category icon + name */}
            <View style={styles.titleRow}>
              <Icon name={categoryIcon(checkpoint.category)} size={24} color={light.mutedForeground} />
              <Text style={styles.name}>{checkpoint.name}</Text>
            </View>

            {/* Rating */}
            {checkpoint.rating != null ? (
              <View style={styles.inlineRow}>
                <Icon name="star" size={16} color={status.gold} fill={status.gold} />
                <Text style={styles.ratingText}>{checkpoint.rating}/5</Text>
              </View>
            ) : null}

            {/* Note */}
            {checkpoint.note ? <Text style={styles.note}>{checkpoint.note}</Text> : null}

            {/* Address */}
            {checkpoint.address ? (
              <View style={styles.addressRow}>
                <Icon name="map-pin" size={14} color={light.mutedForeground} />
                <Text style={styles.addressText}>{checkpoint.address}</Text>
              </View>
            ) : null}

            {/* Author + XP + views + directions */}
            <View style={styles.metaRow}>
              <Pressable onPress={() => openProfile(checkpoint.user_id)} style={styles.authorBtn}>
                <UserAvatar
                  url={author.avatar_url}
                  name={author.display_name}
                  username={author.username}
                  size={32}
                />
                <Text style={styles.authorName} numberOfLines={1}>
                  {author.display_name || author.username}
                </Text>
              </Pressable>
              <XPBadge xp={checkpoint.xp_awarded} />
              <View style={styles.inlineRow}>
                <Icon name="eye" size={14} color={light.mutedForeground} />
                <Text style={styles.viewCount}>{checkpoint.view_count}</Text>
              </View>
              <Pressable
                onPress={() => {
                  trackEvent('checkpoint_open_directions', { checkpoint_id: checkpoint.id });
                  void openDirectionsInMaps(checkpoint.lat, checkpoint.lng, checkpoint.name);
                }}
                style={styles.directionsBtn}
                accessibilityLabel={t('xem_tren_ban_do')}
              >
                <Icon name="compass" size={18} color={light.mutedForeground} />
              </Pressable>
            </View>

            {/* Date */}
            <Text style={styles.dateText}>{formattedDate}</Text>

            {/* Share — matches web <Button variant="green"> */}
            <Button
              variant="green"
              icon={<Icon name="share" size={20} color="#FFFFFF" />}
              onPress={() => {
                trackEvent('share_click', { source: 'checkpoint_detail' });
                void shareCheckpoint(checkpoint.id, checkpoint.name);
              }}
              className="w-full"
            >
              {t('chia_se')}
            </Button>

            {/* Reactions */}
            <ReactionBar
              checkpointId={checkpoint.id}
              ownerUserId={checkpoint.user_id}
              checkpointName={checkpoint.name}
            />

            {/* Comments */}
            <CommentSection
              checkpointId={checkpoint.id}
              ownerUserId={checkpoint.user_id}
              checkpointName={checkpoint.name}
              onOpenProfile={openProfile}
            />

            {/* Owner-only delete */}
            {isMine ? (
              <Pressable onPress={handleDelete} disabled={deleting} style={styles.deleteBtn}>
                {deleting ? (
                  <ActivityIndicator size="small" color={accent[600]} />
                ) : (
                  <>
                    <Icon name="trash" size={16} color={accent[600]} />
                    <Text style={styles.deleteText}>{t('xoa_checkin')}</Text>
                  </>
                )}
              </Pressable>
            ) : null}

            <View style={{ height: 24 }} />
          </View>
        )}
      </Sheet>

      {/* Full-screen image lightbox */}
      <Modal
        visible={lightboxIndex != null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxIndex(null)}
      >
        <View style={styles.lightbox}>
          <Pressable style={styles.lightboxClose} onPress={() => setLightboxIndex(null)}>
            <Icon name="x" size={26} color="#FFFFFF" />
          </Pressable>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: (lightboxIndex ?? 0) * SCREEN_WIDTH, y: 0 }}
          >
            {viewable.map((im) => (
              <View key={im.id} style={styles.lightboxPage}>
                <Image source={{ uri: im.url }} style={styles.lightboxImg} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { paddingHorizontal: 16, paddingTop: 8 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },

  gallery: { gap: 8, paddingRight: 8 },
  galleryItem: {
    width: GALLERY_W,
    height: GALLERY_H,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: light.surfaceMuted,
  },
  galleryImg: { width: '100%', height: '100%' },
  galleryPending: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  pendingText: { fontSize: 12, color: light.mutedForeground },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 20, fontWeight: '700', color: light.foreground },

  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '600', color: light.foreground },

  note: { fontSize: 14, color: light.foreground, lineHeight: 20 },

  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addressText: { flex: 1, fontSize: 14, color: light.mutedForeground, lineHeight: 19 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  authorName: { fontSize: 14, fontWeight: '600', color: light.foreground, flexShrink: 1 },
  viewCount: { fontSize: 12, color: light.mutedForeground },
  directionsBtn: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateText: { fontSize: 12, color: light.subtleForeground },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 999,
  },
  deleteText: { fontSize: 14, fontWeight: '600', color: accent[600] },

  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  lightboxClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxPage: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImg: { width: SCREEN_WIDTH, height: '100%' },
});
