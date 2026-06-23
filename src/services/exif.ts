import * as MediaLibrary from "expo-media-library";
import { Platform } from "react-native";

export interface GPS {
  lat: number;
  lng: number;
}

export interface PhotoMetadata {
  gps: GPS | null;
  takenAt?: string;
}

// On iOS, when picking from gallery, we can get EXIF from the picker result or MediaLibrary.
// On Android, EXIF may not be available; we fall back gracefully.
export async function extractPhotoMetadata(assetId?: string): Promise<PhotoMetadata> {
  if (!assetId) return { gps: null };

  try {
    if (Platform.OS === "web") {
      return { gps: null };
    }

    // On native, try to get EXIF from MediaLibrary
    const info = await MediaLibrary.getAssetInfoAsync(assetId as any);
    const exifData = (info as any).EXIF;
    if (!exifData) return { gps: null };

    const lat = exifData.latitude as number | undefined;
    const lng = exifData.longitude as number | undefined;

    // Validate GPS - reject null island
    const gps =
      lat != null && lng != null && Math.abs(lat) > 0.01 && Math.abs(lng) > 0.01
        ? { lat, lng }
        : null;

    return { gps };
  } catch {
    return { gps: null };
  }
}
