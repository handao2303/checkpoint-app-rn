import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Ensure camera / photo-library permission before launching the picker.
 *
 * `request*PermissionsAsync` returns the current grant without re-prompting if
 * already decided, and prompts only when still undetermined. When permanently
 * denied we surface an Alert with a shortcut to the system Settings, so the user
 * never hits the raw "Missing camera or camera roll permission" exception.
 */
function deniedAlert(title: string, message: string) {
  Alert.alert(title, message, [
    { text: 'Để sau', style: 'cancel' },
    { text: 'Mở Cài đặt', onPress: () => void Linking.openSettings() },
  ]);
}

export async function ensureCameraPermission(): Promise<boolean> {
  const res = await ImagePicker.requestCameraPermissionsAsync();
  if (res.granted) return true;
  deniedAlert(
    'Cần quyền camera',
    'Checkpoint cần quyền camera để chụp ảnh check-in. Hãy bật trong Cài đặt.',
  );
  return false;
}

export async function ensureMediaLibraryPermission(): Promise<boolean> {
  const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (res.granted) return true;
  deniedAlert(
    'Cần quyền ảnh',
    'Checkpoint cần quyền truy cập thư viện ảnh để chọn ảnh. Hãy bật trong Cài đặt.',
  );
  return false;
}
