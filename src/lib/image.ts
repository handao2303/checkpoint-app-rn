// Mobile image pipeline for uploads.
// Uses expo-image-manipulator — no canvas, no HEIC conversion needed
// (expo-image-picker handles HEIC → JPEG automatically on iOS/Android).

import * as ImageManipulator from 'expo-image-manipulator';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;
const CHECKPOINT_MAX_EDGE = 2560;
const CHECKPOINT_QUALITY = 0.9;
const THUMBNAIL_MAX_EDGE = 640;
const THUMBNAIL_QUALITY = 0.8;

/**
 * Generic resize + JPEG compress. Returns the local URI of the processed image.
 * If the source is already within bounds, it is still re-encoded to JPEG so the
 * content-type is always image/jpeg on upload.
 */
export async function resizeImage(
  uri: string,
  maxEdge = MAX_EDGE,
  quality = JPEG_QUALITY,
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxEdge } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

/** 640-px thumbnail used in the checkpoint list / map callouts. */
export async function generateThumbnail(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: THUMBNAIL_MAX_EDGE } }],
    { compress: THUMBNAIL_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

/** High-quality variant uploaded as the checkpoint "original" (2560 px, 0.9 q). */
export async function resizeForUpload(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: CHECKPOINT_MAX_EDGE } }],
    { compress: CHECKPOINT_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

export interface PreparedMobileImage {
  originalUri: string;
  thumbnailUri: string;
}

/**
 * Full checkpoint image pipeline: resize to 2560 px + generate 640-px thumbnail.
 * Returns local file URIs — callers upload both to R2 presigned slots.
 */
export async function prepareCheckpointImage(uri: string): Promise<PreparedMobileImage> {
  const [originalUri, thumbnailUri] = await Promise.all([
    resizeForUpload(uri),
    generateThumbnail(uri),
  ]);
  return { originalUri, thumbnailUri };
}
