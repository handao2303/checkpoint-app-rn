import * as ImageManipulator from "expo-image-manipulator";

const CHECKPOINT_MAX_EDGE = 2560;
const CHECKPOINT_QUALITY = 0.9;
const CHECKPOINT_MAX_BYTES = 3 * 1024 * 1024;
const THUMBNAIL_MAX_EDGE = 640;
const THUMBNAIL_QUALITY = 0.8;

export interface PreparedCheckpointImage {
  uri: string;
  thumbnailUri: string;
  originalFile: { uri: string; type: string; name: string };
  thumbnailFile: { uri: string; type: string; name: string };
}

export async function prepareCheckpointImage(
  uri: string,
  fileName: string,
): Promise<PreparedCheckpointImage> {
  // Resize original
  const originalResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: CHECKPOINT_MAX_EDGE } }],
    { compress: CHECKPOINT_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  // Create thumbnail
  const thumbnailResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: THUMBNAIL_MAX_EDGE } }],
    { compress: THUMBNAIL_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  const baseName = fileName.replace(/\.[^.]+$/, "");
  return {
    uri: originalResult.uri,
    thumbnailUri: thumbnailResult.uri,
    originalFile: {
      uri: originalResult.uri,
      type: "image/jpeg",
      name: `${baseName}.jpg`,
    },
    thumbnailFile: {
      uri: thumbnailResult.uri,
      type: "image/jpeg",
      name: `${baseName}-thumb.jpg`,
    },
  };
}
