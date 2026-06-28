/**
 * useCheckin — mobile check-in submission hook.
 *
 * Handles the upload pipeline:
 *   1. Request presigned R2 slots.
 *   2. Resize each image + generate thumbnail (expo-image-manipulator).
 *   3. Upload original + thumbnail to R2 using expo-file-system v56 UploadTask API.
 *   4. POST /checkpoints with the object keys.
 *
 * Returns { submit, submitting, error } — the caller provides the form data.
 */

import { useCallback, useState } from 'react';
import { File as ExpoFile, UploadTask, UploadType } from 'expo-file-system';
import {
  createCheckpoint,
  getUploadSlots,
  type CheckinInput,
  type CheckinResult,
} from '../lib/api';
import { prepareCheckpointImage } from '../lib/image';
import { trackError, trackEvent } from '../lib/observability';

export interface SubmitMediaItem {
  /** Local file URI returned by expo-image-picker. */
  uri: string;
  type: 'image';
}

export interface CheckinFormData {
  name: string;
  category: string;
  note?: string;
  rating?: number;
  lat: number;
  lng: number;
  address?: string;
  province?: string;
  province_code?: string;
  taken_at?: string;
  place_id?: string;
  journey_id?: string;
  media: SubmitMediaItem[];
}

async function uploadToR2(presignedUrl: string, localUri: string): Promise<void> {
  const file = new ExpoFile(localUri);
  const task = new UploadTask(file, presignedUrl, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: { 'Content-Type': 'image/jpeg' },
  });
  const result = await task.uploadAsync();
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`R2 upload failed: HTTP ${result.status}`);
  }
}

export function useCheckin() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (data: CheckinFormData): Promise<CheckinResult | null> => {
      if (data.media.length === 0) {
        setError('Cần ít nhất 1 ảnh để check-in.');
        return null;
      }

      setSubmitting(true);
      setError(null);

      // Step 1 — presigned upload slots
      let slots: Awaited<ReturnType<typeof getUploadSlots>>;
      try {
        slots = await getUploadSlots(data.media.length);
        trackEvent('upload_slots_success', { media_count: data.media.length });
      } catch (e) {
        trackEvent('upload_slots_failed', { media_count: data.media.length });
        trackError(e, { feature: 'checkin', action: 'get_upload_slots' });
        setError('Không lấy được link upload. Vui lòng thử lại.');
        setSubmitting(false);
        return null;
      }

      // Step 2 — resize + thumbnail, then upload originals + thumbnails to R2
      try {
        const prepared = await Promise.all(
          data.media.map((m) => prepareCheckpointImage(m.uri)),
        );

        await Promise.all(
          slots.flatMap((slot, i) => {
            const p = prepared[i];
            return [
              uploadToR2(slot.upload_url, p.originalUri),
              uploadToR2(slot.thumbnail_upload_url, p.thumbnailUri),
            ];
          }),
        );
        trackEvent('r2_upload_success', { media_count: data.media.length });
      } catch (e) {
        trackEvent('r2_upload_failed', { media_count: data.media.length });
        trackError(e, { feature: 'checkin', action: 'r2_upload' });
        setError('Upload ảnh thất bại. Vui lòng thử lại.');
        setSubmitting(false);
        return null;
      }

      // Step 3 — create checkpoint
      try {
        const images: CheckinInput['images'] = slots.map((s) => ({
          object_key: s.object_key,
          thumbnail_key: s.thumbnail_key,
          type: 'image' as const,
        }));

        const result = await createCheckpoint({
          name: data.name,
          category: data.category,
          note: data.note,
          rating: data.rating,
          lat: data.lat,
          lng: data.lng,
          address: data.address,
          province: data.province,
          province_code: data.province_code,
          taken_at: data.taken_at,
          place_id: data.place_id,
          journey_id: data.journey_id,
          images,
        });

        trackEvent('checkin_success', { category: data.category });
        return result;
      } catch (e) {
        trackError(e, { feature: 'checkin', action: 'create_checkpoint' });
        setError('Lưu checkpoint thất bại. Vui lòng thử lại.');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return { submit, submitting, error };
}
