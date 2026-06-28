/**
 * MapScreen — MapLibre GL + OpenStreetMap port of web/src/pages/MapPage.tsx
 *
 * ⚠️  NATIVE BUILD REQUIRED
 *     @maplibre/maplibre-react-native does NOT work in Expo Go. You must run:
 *       cd mobile && npx expo prebuild
 *       npx expo run:ios   OR   npx expo run:android
 *
 * No API key required — uses OpenStreetMap raster tiles.
 *
 * Coordinate order: MapLibre uses GeoJSON standard [longitude, latitude],
 * which is the OPPOSITE of react-native-maps {latitude, longitude}.
 *
 * Uses @maplibre/maplibre-react-native v11 named exports (no default export).
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import {
  Map,
  Camera,
  Marker,
  UserLocation,
  type MapRef,
} from '@maplibre/maplibre-react-native';
import { useQuery } from '@tanstack/react-query';
import { getCheckpointsInBounds, type Bounds } from '../lib/api';
import { useUserLocation } from '../location/LocationProvider';
import { CheckpointDetailSheet } from '../components/CheckpointDetailSheet';

// Default centre: Ho Chi Minh City — [longitude, latitude]
const DEFAULT_CENTER: [number, number] = [106.6297, 10.8231];
const DEFAULT_ZOOM = 12;

const MAP_BOUNDS_DEBOUNCE_MS = 300;

// OpenStreetMap raster tiles — no API key required
const OSM_STYLE = JSON.stringify({
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
});

type MapFilter = 'all' | 'following' | 'mine';

const FILTER_LABELS: Record<MapFilter, string> = {
  all: 'Tất cả',
  following: 'Đang follow',
  mine: 'Của tôi',
};

const MARKER_SIZE = 18;

export default function MapScreen() {
  const { coords } = useUserLocation();
  const [filter, setFilter] = useState<MapFilter>('all');
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapRef>(null);

  const { data: checkpoints } = useQuery({
    queryKey: ['checkpoints', 'bounds', bounds, filter],
    queryFn: () =>
      bounds
        ? getCheckpointsInBounds(bounds, { filter })
        : Promise.resolve([]),
    enabled: !!bounds,
    gcTime: 0,
  });

  const initialCenter: [number, number] = coords
    ? [coords.longitude, coords.latitude]
    : DEFAULT_CENTER;

  // v11 getBounds() returns [west, south, east, north]
  const handleRegionDidChange = useCallback(() => {
    if (debounceTimer.current != null) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const b = await mapRef.current?.getBounds();
      if (b) {
        setBounds({
          minLng: b[0],
          minLat: b[1],
          maxLng: b[2],
          maxLat: b[3],
        });
      }
    }, MAP_BOUNDS_DEBOUNCE_MS);
  }, []);

  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={OSM_STYLE}
        onRegionDidChange={handleRegionDidChange}
        logo={false}
        attribution={false}
      >
        <Camera
          initialViewState={{
            center: initialCenter,
            zoom: DEFAULT_ZOOM,
          }}
        />

        {/* User location dot */}
        <UserLocation />

        {/* Checkpoint markers */}
        {checkpoints?.map((cp) => (
          <Marker
            key={cp.id}
            id={cp.id}
            lngLat={[cp.lng, cp.lat]}
            onPress={() => setSelectedId(cp.id)}
          >
            <View style={styles.marker} />
          </Marker>
        ))}
      </Map>

      {/* Filter chips — absolute overlay at top */}
      <View style={styles.filterRow} pointerEvents="box-none">
        {(['all', 'following', 'mine'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {FILTER_LABELS[f]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Checkpoint detail bottom sheet */}
      <CheckpointDetailSheet
        id={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: '#B45309',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  filterRow: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 248, 241, 0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  chipActive: {
    backgroundColor: '#B45309',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C0D05',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
