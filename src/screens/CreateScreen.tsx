/**
 * CreateScreen — React Native port of web/src/pages/CreatePage.tsx.
 *
 * Two tabs:
 *   "Cắm cờ"  (GPS)   — auto-get GPS coordinates → fill form → submit.
 *   "Từ ảnh"  (Photo) — pick a photo → extract EXIF GPS → auto-fill lat/lng → fill form.
 *
 * ⚠️  NATIVE BUILD REQUIRED
 *     expo-image-picker requires native modules. Run:
 *       cd mobile && npx expo prebuild
 *       npx expo run:ios   OR   npx expo run:android
 *
 * ⚠️  iOS: NSPhotoLibraryUsageDescription + NSCameraUsageDescription must be set
 *     in app.json (already configured in Task 1).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { requestLocationPermission, getCurrentPosition } from '../lib/geo';
import { ensureCameraPermission, ensureMediaLibraryPermission } from '../lib/mediaPermissions';
import { CreateCheckpointForm } from '../components/CreateCheckpointForm';
import { Icon } from '../components/ui/Icon';
import { primary, light, neutral } from '../theme/colors';
import { trackEvent } from '../lib/observability';

type Tab = 'gps' | 'photo';

interface Coords {
  latitude: number;
  longitude: number;
}

interface PhotoState {
  uri: string;
  takenAt?: string;
  coords?: Coords;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CreateScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [tab, setTab] = useState<Tab>('gps');

  // GPS tab state
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  // Photo tab state
  const [photo, setPhoto] = useState<PhotoState | null>(null);

  // ---- GPS location ----

  const locate = useCallback(async () => {
    setLocating(true);
    setLocationDenied(false);
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        setLocationDenied(true);
        trackEvent('location_denied', { source: 'create_screen' });
        setLocating(false);
        return;
      }
      const pos = await getCurrentPosition();
      setCoords(pos);
      trackEvent('location_granted', { source: 'create_screen' });
    } catch {
      setLocationDenied(true);
      trackEvent('location_error', { source: 'create_screen' });
    } finally {
      setLocating(false);
    }
  }, []);

  // Auto-locate when GPS tab becomes active
  useEffect(() => {
    if (tab === 'gps' && !coords && !locating) {
      void locate();
    }
  }, [tab, locate, coords, locating]);

  // ---- Photo picker ----

  const pickPhoto = useCallback(async () => {
    if (!(await ensureMediaLibraryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 1,
      exif: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const uri = asset.uri;

    // Extract GPS from EXIF if available
    let exifCoords: Coords | undefined;
    let takenAt: string | undefined;

    const exif = asset.exif as Record<string, unknown> | undefined;
    if (exif) {
      const lat = exif['GPSLatitude'] as number | undefined;
      const lng = exif['GPSLongitude'] as number | undefined;
      const latRef = exif['GPSLatitudeRef'] as string | undefined;
      const lngRef = exif['GPSLongitudeRef'] as string | undefined;

      if (lat !== undefined && lng !== undefined) {
        exifCoords = {
          latitude: latRef === 'S' ? -lat : lat,
          longitude: lngRef === 'W' ? -lng : lng,
        };
        trackEvent('exif_gps_found', { source: 'photo_tab' });
      }

      // DateTimeOriginal: "YYYY:MM:DD HH:MM:SS"
      const dto = exif['DateTimeOriginal'] as string | undefined;
      if (dto) {
        try {
          // Convert "YYYY:MM:DD HH:MM:SS" → ISO
          const iso = dto.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
          takenAt = new Date(iso).toISOString();
        } catch {
          // ignore malformed EXIF date
        }
      }
    }

    setPhoto({ uri, takenAt, coords: exifCoords });
    trackEvent('photo_picked', { has_exif_gps: !!exifCoords, has_exif_date: !!takenAt });
  }, []);

  const takePhotoWithCamera = useCallback(async () => {
    if (!(await ensureCameraPermission())) return;
    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
      exif: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setPhoto({ uri: asset.uri });
    trackEvent('photo_camera');
  }, []);

  // ---- Success handler ----

  const handleSuccess = useCallback(
    (xp: number, level: number, _didLevelUp: boolean) => {
      trackEvent('checkin_completed', { xp_awarded: xp, level });
      // Navigate back to Map (XPToast animation triggers onDone callback)
      navigation.navigate('Tabs', { screen: 'Map' });
    },
    [navigation],
  );

  // ---- Render helpers ----

  function renderTabBar() {
    return (
      <View style={styles.tabBar}>
        {(['gps', 'photo'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => {
              trackEvent('create_tab_change', { tab: t });
              setTab(t);
            }}
            style={[styles.tabItem, tab === t && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'gps' ? 'Cắm cờ' : 'Từ ảnh'}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  // ---- GPS Tab ----

  function renderGpsTab() {
    if (locating) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={primary[500]} />
          <Text style={styles.hintText}>Đang định vị...</Text>
        </View>
      );
    }

    if (locationDenied || !coords) {
      return (
        <View style={styles.centered}>
          <Icon name="map-pin" size={48} color={neutral[400]} />
          <Text style={styles.hintTitle}>Cần quyền truy cập vị trí</Text>
          <Text style={styles.hintText}>
            Cho phép ứng dụng truy cập vị trí để cắm cờ tại đây.
          </Text>
          <Pressable onPress={locate} style={styles.retryBtn}>
            <Icon name="rotate-cw" size={16} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <CreateCheckpointForm
        lat={coords.latitude}
        lng={coords.longitude}
        onSuccess={handleSuccess}
      />
    );
  }

  // ---- Photo Tab ----

  function renderPhotoTab() {
    if (!photo) {
      return (
        <View style={styles.centered}>
          <Icon name="image" size={48} color={neutral[400]} />
          <Text style={styles.hintTitle}>Chọn ảnh để check-in</Text>
          <Text style={styles.hintText}>
            Vị trí GPS sẽ được lấy từ dữ liệu EXIF của ảnh.
          </Text>
          <View style={styles.photoButtons}>
            <Pressable onPress={takePhotoWithCamera} style={styles.photoBtn}>
              <Icon name="camera" size={20} color={primary[500]} />
              <Text style={styles.photoBtnText}>Chụp ảnh</Text>
            </Pressable>
            <Pressable onPress={pickPhoto} style={styles.photoBtn}>
              <Icon name="image" size={20} color={primary[500]} />
              <Text style={styles.photoBtnText}>Thư viện</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // Use EXIF GPS if available, otherwise fall back to last known GPS position
    const formCoords = photo.coords ?? coords;

    if (!formCoords) {
      return (
        <View style={styles.centered}>
          <Icon name="map-pin" size={48} color={neutral[400]} />
          <Text style={styles.hintTitle}>Không tìm thấy vị trí GPS</Text>
          <Text style={styles.hintText}>
            Ảnh này không có thông tin GPS. Chuyển sang tab "Cắm cờ" để dùng vị trí hiện tại.
          </Text>
          <Pressable
            onPress={() => setPhoto(null)}
            style={[styles.retryBtn, { backgroundColor: neutral[500] }]}
          >
            <Icon name="rotate-ccw" size={16} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Chọn ảnh khác</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <CreateCheckpointForm
        lat={formCoords.latitude}
        lng={formCoords.longitude}
        takenAt={photo.takenAt}
        initialMedia={[photo.uri]}
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Check-in</Text>
      </View>
      {renderTabBar()}
      <View style={styles.content}>
        {tab === 'gps' ? renderGpsTab() : renderPhotoTab()}
      </View>
    </SafeAreaView>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: light.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: light.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: light.foreground,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: light.surfaceMuted,
    borderRadius: 999,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: primary[500],
    shadowColor: primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: neutral[500],
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  hintTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: light.foreground,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 14,
    color: neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: primary[500],
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: primary[300],
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: light.surface,
  },
  photoBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: primary[500],
  },
});
