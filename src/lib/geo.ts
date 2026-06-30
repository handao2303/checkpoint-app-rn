import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Open turn-by-turn directions to a coordinate in the platform's maps app.
 * Mirrors web/src/lib/geo.ts `openDirectionsInMaps`. Uses the native scheme
 * where available, falling back to the Google Maps universal URL.
 */
export async function openDirectionsInMaps(
  lat: number,
  lng: number,
  label?: string,
): Promise<void> {
  const encodedLabel = label ? encodeURIComponent(label) : '';
  const universal = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const native =
    Platform.OS === 'ios'
      ? `maps://?daddr=${lat},${lng}${encodedLabel ? `&q=${encodedLabel}` : ''}`
      : `geo:${lat},${lng}?q=${lat},${lng}${encodedLabel ? `(${encodedLabel})` : ''}`;

  try {
    const supported = await Linking.canOpenURL(native);
    await Linking.openURL(supported ? native : universal);
  } catch {
    await Linking.openURL(universal);
  }
}

export async function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
}
