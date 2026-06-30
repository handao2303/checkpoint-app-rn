/**
 * CreateCheckpointForm — React Native port of web/src/components/CheckpointFormFields.tsx
 * + web/src/components/CreateCheckpointForm.tsx.
 *
 * Differences from web:
 * - TextInput / Pressable instead of <input> / <button>
 * - No canvas / URL.createObjectURL — images are local file URIs from expo-image-picker
 * - Category chips rendered inline (no separate nameCardExtra slot)
 * - Star rating via Pressable row
 * - Media grid shows Image thumbnails with a remove button
 * - Submit wired to useCheckin hook
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ensureCameraPermission, ensureMediaLibraryPermission } from '../lib/mediaPermissions';
import { useCheckin, type CheckinFormData } from '../hooks/useCheckin';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { XPToast } from './ui/XPToast';
import { primary, light, neutral } from '../theme/colors';
import { trackEvent } from '../lib/observability';

// ---- Categories (mirrors web/src/lib/maps.ts) ----

const CATEGORIES = [
  { key: 'cafe', label: 'Cà phê', icon: 'coffee' as const },
  { key: 'food', label: 'Ăn uống', icon: 'food' as const },
  { key: 'view', label: 'Ngắm cảnh', icon: 'mountain' as const },
  { key: 'nature', label: 'Thiên nhiên', icon: 'tree' as const },
  { key: 'other', label: 'Khác', icon: 'pin' as const },
] as const;

const MAX_IMAGES = 3;

// ---- Props ----

export interface CreateCheckpointFormProps {
  lat: number;
  lng: number;
  address?: string;
  province?: string;
  province_code?: string;
  /** ISO string from EXIF — auto-populated in photo tab. */
  takenAt?: string;
  /** Pre-selected image URIs (photo tab seeds this). */
  initialMedia?: string[];
  onSuccess: (xp: number, level: number, didLevelUp: boolean) => void;
}

// ---- Component ----

export function CreateCheckpointForm({
  lat,
  lng,
  address,
  province,
  province_code,
  takenAt,
  initialMedia = [],
  onSuccess,
}: CreateCheckpointFormProps) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<string>('cafe');
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [mediaUris, setMediaUris] = useState<string[]>(initialMedia);

  const [xpToast, setXpToast] = useState<{
    xp: number;
    level: number;
    didLevelUp: boolean;
  } | null>(null);

  const { submit, submitting, error } = useCheckin();

  // ---- Media helpers ----

  const pickFromGallery = useCallback(async () => {
    if (mediaUris.length >= MAX_IMAGES) return;
    if (!(await ensureMediaLibraryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
      exif: false,
    });
    if (!result.canceled) {
      const remaining = MAX_IMAGES - mediaUris.length;
      const next = result.assets.slice(0, remaining).map((a) => a.uri);
      setMediaUris((prev) => [...prev, ...next]);
      trackEvent('media_pick_gallery', { count: next.length });
    }
  }, [mediaUris.length]);

  const takePhoto = useCallback(async () => {
    if (mediaUris.length >= MAX_IMAGES) return;
    if (!(await ensureCameraPermission())) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 1, exif: false });
    if (!result.canceled) {
      setMediaUris((prev) => [...prev, result.assets[0].uri]);
      trackEvent('media_pick_camera');
    }
  }, [mediaUris.length]);

  const removeMedia = useCallback((index: number) => {
    setMediaUris((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ---- Star rating ----

  const handleStarPress = useCallback(
    (n: number) => {
      setRating((prev) => (prev === n ? undefined : n));
    },
    [],
  );

  // ---- Submit ----

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;
    if (mediaUris.length === 0) return;

    const data: CheckinFormData = {
      name: name.trim(),
      category,
      note: note.trim() || undefined,
      rating,
      lat,
      lng,
      address,
      province,
      province_code,
      taken_at: takenAt,
      media: mediaUris.map((uri) => ({ uri, type: 'image' as const })),
    };

    const result = await submit(data);
    if (result) {
      const didLevelUp = result.level > (result.total_xp - result.xp_awarded > 0 ? 1 : 0);
      setXpToast({ xp: result.xp_awarded, level: result.level, didLevelUp });
    }
  }, [name, category, note, rating, lat, lng, address, province, province_code, takenAt, mediaUris, submit]);

  const canSubmit = name.trim().length > 0 && mediaUris.length > 0 && !submitting;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Name + Category card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="pin" size={20} color={primary[500]} />
            <Text style={styles.cardTitle}>Địa điểm</Text>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Tên địa điểm"
            placeholderTextColor={neutral[500]}
            style={styles.textInput}
            returnKeyType="next"
            autoCapitalize="words"
          />
          {/* Category chips */}
          <View style={styles.chips}>
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Icon
                    name={c.icon}
                    size={14}
                    color={active ? '#FFFFFF' : neutral[500]}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Note card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeader}>
              <Icon name="pencil" size={20} color={primary[500]} />
              <Text style={styles.cardTitle}>Cảm nhận của bạn</Text>
            </View>
            <Text style={styles.charCount}>{note.length}/500</Text>
          </View>
          <TextInput
            value={note}
            onChangeText={(t) => setNote(t.slice(0, 500))}
            placeholder="Chia sẻ trải nghiệm của bạn..."
            placeholderTextColor={neutral[500]}
            style={[styles.textInput, styles.noteInput]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── Rating card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="star" size={20} color="#F59E0B" />
            <Text style={styles.cardTitle}>Đánh giá địa điểm</Text>
          </View>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => handleStarPress(n)}
                hitSlop={6}
              >
                <Icon
                  name="star"
                  size={36}
                  color="#F59E0B"
                  strokeWidth={rating !== undefined && n <= rating ? 0 : 2}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Media card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeader}>
              <Icon name="camera" size={20} color={primary[500]} />
              <Text style={styles.cardTitle}>Thêm ảnh</Text>
            </View>
            <Text style={styles.mediaCount}>
              {mediaUris.length}/{MAX_IMAGES}
            </Text>
          </View>

          <View style={styles.mediaGrid}>
            {/* Existing images */}
            {mediaUris.map((uri, idx) => (
              <View key={uri + idx} style={styles.mediaThumbContainer}>
                <Image source={{ uri }} style={styles.mediaThumb} />
                <Pressable
                  onPress={() => removeMedia(idx)}
                  style={styles.removeBtn}
                  hitSlop={4}
                >
                  <Icon name="x" size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}

            {/* Add buttons — camera + gallery */}
            {mediaUris.length < MAX_IMAGES && (
              <>
                <Pressable onPress={takePhoto} style={styles.addBtn}>
                  <Icon name="camera" size={22} color={neutral[500]} />
                </Pressable>
                <Pressable onPress={pickFromGallery} style={styles.addBtn}>
                  <Icon name="image" size={22} color={neutral[500]} />
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* ── Error ── */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* ── EXIF timestamp badge ── */}
        {takenAt && (
          <View style={styles.exifBadge}>
            <Icon name="calendar" size={14} color={primary[500]} />
            <Text style={styles.exifText}>
              Chụp lúc{' '}
              <Text style={styles.exifDate}>
                {new Date(takenAt).toLocaleString('vi-VN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </Text>
            </Text>
          </View>
        )}

        {/* ── Submit ── */}
        <Button
          variant="accent"
          size="lg"
          pill
          disabled={!canSubmit}
          loading={submitting}
          onPress={handleSubmit}
          icon={<Icon name="flag-planted" size={20} color="#FFFFFF" />}
        >
          CẮM CỜ
        </Button>

        {/* Bottom padding for keyboard */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── XP Toast ── */}
      {xpToast && (
        <XPToast
          xp={xpToast.xp}
          level={xpToast.level}
          didLevelUp={xpToast.didLevelUp}
          onDone={() => {
            setXpToast(null);
            onSuccess(xpToast.xp, xpToast.level, xpToast.didLevelUp);
          }}
        />
      )}
    </View>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: light.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: light.border,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: light.foreground,
  },
  textInput: {
    borderWidth: 1,
    borderColor: light.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: light.foreground,
    backgroundColor: light.surface,
  },
  noteInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: neutral[500],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: light.border,
    backgroundColor: light.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: primary[500],
    borderColor: primary[500],
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: neutral[500],
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaThumbContainer: {
    width: 80,
    height: 80,
    position: 'relative',
  },
  mediaThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: light.border,
    backgroundColor: light.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaCount: {
    fontSize: 12,
    fontWeight: '700',
    color: primary[500],
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  exifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: light.border,
    backgroundColor: light.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  exifText: {
    fontSize: 13,
    color: neutral[500],
  },
  exifDate: {
    fontWeight: '600',
    color: light.foreground,
  },
});
