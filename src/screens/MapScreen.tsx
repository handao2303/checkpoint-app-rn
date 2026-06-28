/**
 * MapScreen — MapLibre GL + OpenStreetMap port of web/src/pages/MapPage.tsx.
 *
 * Feature parity with the web map:
 *   - Image thumbnail markers (video play badge) with category-icon fallback.
 *   - Supercluster clustering → 2-thumbnail cluster markers + count badge.
 *   - Category filter (floating button + expanding menu).
 *   - all / following / mine filter chips (mine & following require sign-in).
 *   - CHECK-IN button → Create tab (auth-gated).
 *   - Cluster bottom sheet listing the checkpoints inside a cluster.
 *   - Checkpoint detail bottom sheet.
 *
 * ⚠️  NATIVE BUILD REQUIRED — @maplibre/maplibre-react-native does NOT run in
 *     Expo Go. Use a dev client / EAS build.
 *
 * Coordinate order: MapLibre uses GeoJSON [longitude, latitude].
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  Map,
  Camera,
  Marker,
  UserLocation,
  type MapRef,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import Supercluster from 'supercluster';

import { getCheckpointsInBounds, type Bounds, type Checkpoint } from '../lib/api';
import { useUserLocation } from '../location/LocationProvider';
import { useAuth } from '../auth/AuthContext';
import { useAuthGate } from '../context/AuthGate';
import { CheckpointDetailSheet } from '../components/CheckpointDetailSheet';
import { Sheet } from '../components/ui/Sheet';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import {
  CATEGORIES,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  CLUSTER_RADIUS,
  CLUSTER_MAX_ZOOM,
  categoryIcon,
  type CategoryKey,
} from '../lib/maps';
import { light, status } from '../theme/colors';
import { trackEvent } from '../lib/observability';
import type { TabParamList } from '../navigation/types';

const MAP_BOUNDS_DEBOUNCE_MS = 300;

// OpenStreetMap raster tiles — no API key required.
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
type CategoryFilter = 'all' | CategoryKey;
type NavigationProp = BottomTabNavigationProp<TabParamList>;

export default function MapScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { coords } = useUserLocation();
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();

  const [mapFilter, setMapFilter] = useState<MapFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clusterLeaves, setClusterLeaves] = useState<Checkpoint[] | null>(null);

  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const centeredRef = useRef(false);

  const initialCenter: [number, number] = coords
    ? [coords.longitude, coords.latitude]
    : DEFAULT_CENTER;

  // Fly to the user's location once, when it first becomes available.
  useEffect(() => {
    if (coords && cameraRef.current && !centeredRef.current) {
      centeredRef.current = true;
      cameraRef.current.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: 14,
        duration: 800,
      });
    }
  }, [coords]);

  // Server-side filtering (category + mine/following) is part of the query key.
  const { data: checkpoints } = useQuery({
    queryKey: ['checkpoints', 'bounds', bounds, mapFilter, categoryFilter],
    queryFn: () =>
      bounds
        ? getCheckpointsInBounds(bounds, {
            filter: mapFilter,
            category: categoryFilter,
          })
        : Promise.resolve([]),
    enabled: !!bounds,
    gcTime: 0,
  });

  // v11 getBounds() returns [west, south, east, north]; getZoom() the level.
  const handleRegionDidChange = useCallback(() => {
    if (debounceTimer.current != null) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const b = await mapRef.current?.getBounds();
      const z = await mapRef.current?.getZoom();
      if (typeof z === 'number') setZoom(z);
      if (b) {
        setBounds({ minLng: b[0], minLat: b[1], maxLng: b[2], maxLat: b[3] });
      }
    }, MAP_BOUNDS_DEBOUNCE_MS);
  }, []);

  useEffect(
    () => () => {
      if (debounceTimer.current != null) clearTimeout(debounceTimer.current);
    },
    [],
  );

  // Build the supercluster index and compute clusters for the viewport.
  const { clusters, sc } = useMemo(() => {
    const index = new Supercluster<Checkpoint>({
      radius: CLUSTER_RADIUS,
      maxZoom: CLUSTER_MAX_ZOOM,
    });
    index.load(
      (checkpoints ?? []).map((cp) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [cp.lng, cp.lat] },
        properties: cp,
      })),
    );
    if (!bounds) return { clusters: [], sc: index };
    return {
      clusters: index.getClusters(
        [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat],
        Math.round(zoom),
      ),
      sc: index,
    };
  }, [checkpoints, bounds, zoom]);

  const handleClusterPress = useCallback(
    (clusterId: number, lng: number, lat: number) => {
      // Zoom in until the cluster expands; if we are already deep, list its
      // leaves in a bottom sheet (parity with the web ClusterSheet).
      const expansionZoom = Math.min(sc.getClusterExpansionZoom(clusterId), 18);
      if (expansionZoom > zoom + 0.5 && expansionZoom <= CLUSTER_MAX_ZOOM) {
        cameraRef.current?.flyTo({ center: [lng, lat], zoom: expansionZoom, duration: 400 });
        return;
      }
      const leaves = sc.getLeaves(clusterId, Infinity) as Array<{
        properties: Checkpoint;
      }>;
      setClusterLeaves(leaves.map((l) => l.properties));
      trackEvent('map_cluster_open', { count: leaves.length });
    },
    [sc, zoom],
  );

  const selectCategory = useCallback((next: CategoryFilter) => {
    setCategoryFilter(next);
    setCategoryMenuOpen(false);
    trackEvent('map_category_filter_change', { category: next });
  }, []);

  const onFilterChip = useCallback(
    (key: MapFilter) => {
      // mine/following are filtered by the caller's id — anonymous users would
      // get an empty map, so gate behind sign-in (parity with web).
      if ((key === 'following' || key === 'mine') && !user) {
        requireAuth(() => setMapFilter(key), {
          source: 'map_filter',
          reason: 'login_required',
        });
        return;
      }
      setMapFilter(key);
      trackEvent('map_filter_change', { filter: key });
    },
    [user, requireAuth],
  );

  const activeCategory = CATEGORIES.find((c) => c.key === categoryFilter);

  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={OSM_STYLE}
        onRegionDidChange={handleRegionDidChange}
        onPress={() => categoryMenuOpen && setCategoryMenuOpen(false)}
        logo={false}
        attribution={false}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: initialCenter, zoom: DEFAULT_ZOOM }}
        />
        <UserLocation />

        {clusters.map((feature) => {
          const [lng, lat] = feature.geometry.coordinates;
          const props = feature.properties as Supercluster.ClusterProperties &
            Checkpoint;

          if (props.cluster) {
            const clusterId = props.cluster_id;
            const count = props.point_count;
            const leaves = sc.getLeaves(clusterId, 2) as Array<{
              properties: Checkpoint;
            }>;
            const thumbs = leaves
              .map((l) => l.properties.thumbnail_url)
              .filter(Boolean) as string[];
            return (
              <Marker
                key={`cluster-${clusterId}`}
                id={`cluster-${clusterId}`}
                lngLat={[lng, lat]}
                anchor="center"
                onPress={() => handleClusterPress(clusterId, lng, lat)}
              >
                <View style={[styles.clusterWrap, { width: thumbs.length >= 2 ? 52 : 36 }]}>
                  {thumbs[1] ? (
                    <Image source={{ uri: thumbs[1] }} style={[styles.clusterThumb, styles.clusterThumbBack]} />
                  ) : null}
                  {thumbs[0] ? (
                    <Image source={{ uri: thumbs[0] }} style={[styles.clusterThumb, styles.clusterThumbFront]} />
                  ) : (
                    <View style={[styles.clusterThumb, styles.clusterThumbFront, styles.clusterCountCircle]}>
                      <Text style={styles.clusterCountText}>{count > 99 ? '99+' : count}</Text>
                    </View>
                  )}
                  <View style={styles.clusterBadge}>
                    <Text style={styles.clusterBadgeText}>{count > 99 ? '99+' : count}</Text>
                  </View>
                </View>
              </Marker>
            );
          }

          const cp = props as unknown as Checkpoint;
          return (
            <Marker
              key={cp.id}
              id={cp.id}
              lngLat={[lng, lat]}
              anchor="bottom"
              onPress={() => {
                setSelectedId(cp.id);
                trackEvent('map_marker_open', { checkpoint_id: cp.id, category: cp.category });
              }}
            >
              <View>
                {cp.thumbnail_url ? (
                  <View style={styles.photoMarker}>
                    <Image source={{ uri: cp.thumbnail_url }} style={styles.photoMarkerImg} />
                    {cp.media_type === 'video' ? (
                      <View style={styles.playOverlay}>
                        <Icon name="play" size={16} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.iconMarker}>
                    <Icon name={categoryIcon(cp.category)} size={18} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </Marker>
          );
        })}
      </Map>

      {/* Category filter — floating button + expanding menu, top-left */}
      <View style={styles.categoryControl} pointerEvents="box-none">
        <Pressable
          onPress={() => setCategoryMenuOpen((o) => !o)}
          style={[
            styles.roundBtn,
            categoryFilter !== 'all' && styles.roundBtnActive,
          ]}
        >
          <Icon
            name={activeCategory?.icon ?? 'map-pin'}
            size={20}
            color={categoryFilter !== 'all' ? '#FFFFFF' : light.foreground}
          />
        </Pressable>

        {categoryMenuOpen ? (
          <View style={styles.categoryMenu}>
            <Pressable
              onPress={() => selectCategory('all')}
              style={[styles.categoryItem, categoryFilter === 'all' && styles.categoryItemActive]}
            >
              <Icon name="x" size={18} color={categoryFilter === 'all' ? '#FFFFFF' : light.foreground} />
            </Pressable>
            {CATEGORIES.map((category) => {
              const active = categoryFilter === category.key;
              return (
                <Pressable
                  key={category.key}
                  onPress={() => selectCategory(category.key)}
                  style={[styles.categoryItem, active && styles.categoryItemActive]}
                >
                  <Icon name={category.icon} size={18} color={active ? '#FFFFFF' : light.foreground} />
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* all / following / mine filter chips */}
      <View style={styles.filterRow} pointerEvents="box-none">
        {(
          [
            ['all', t('tat_ca')],
            ['following', t('dang_follow')],
            ['mine', t('cua_toi')],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => onFilterChip(key)}
            style={[styles.chip, mapFilter === key && styles.chipActive]}
          >
            <Text style={[styles.chipText, mapFilter === key && styles.chipTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* CHECK-IN button */}
      <View style={styles.checkinWrap} pointerEvents="box-none">
        <Button
          size="lg"
          pill
          icon={<Icon name="map-pin" size={22} color="#FFFFFF" />}
          onPress={() =>
            requireAuth(() => navigation.navigate('Create'), {
              source: 'map_checkin',
              reason: 'login_prompt_create',
            })
          }
        >
          CHECK-IN
        </Button>
      </View>

      {/* Cluster list bottom sheet */}
      <Sheet
        open={!!clusterLeaves}
        onClose={() => setClusterLeaves(null)}
        snapPoints={['45%', '75%']}
      >
        <View style={styles.clusterSheetHeader}>
          <Text style={styles.clusterSheetTitle}>
            {t('so_dia_diem', { count: clusterLeaves?.length ?? 0 })}
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.clusterSheetList}>
          {clusterLeaves?.map((cp) => (
            <Pressable
              key={cp.id}
              onPress={() => {
                setClusterLeaves(null);
                setSelectedId(cp.id);
              }}
              style={styles.clusterRow}
            >
              {cp.thumbnail_url || cp.image_url ? (
                <Image source={{ uri: cp.thumbnail_url ?? cp.image_url }} style={styles.clusterRowImg} />
              ) : (
                <View style={[styles.clusterRowImg, styles.clusterRowIconFallback]}>
                  <Icon name={categoryIcon(cp.category)} size={24} color={light.mutedForeground} />
                </View>
              )}
              <View style={styles.clusterRowInfo}>
                <Text style={styles.clusterRowName} numberOfLines={1}>
                  {cp.name}
                </Text>
                <View style={styles.clusterRowMeta}>
                  {cp.rating != null ? (
                    <View style={styles.metaItem}>
                      <Icon name="star" size={12} color={status.gold} />
                      <Text style={styles.metaText}>{cp.rating}/5</Text>
                    </View>
                  ) : cp.address ? (
                    <Text style={styles.metaText} numberOfLines={1}>
                      {cp.address}
                    </Text>
                  ) : null}
                  <View style={styles.metaItem}>
                    <Icon name="eye" size={12} color={light.mutedForeground} />
                    <Text style={styles.metaText}>{cp.view_count}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>

      {/* Checkpoint detail bottom sheet */}
      <CheckpointDetailSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </View>
  );
}

const RING = '#FFFFFF';

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // --- Photo / icon markers ---
  photoMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    transform: [{ translateY: -4 }],
    borderWidth: 2,
    borderColor: RING,
    overflow: 'hidden',
    backgroundColor: light.surfaceMuted,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  photoMarkerImg: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  iconMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    transform: [{ translateY: -4 }],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: light.primary,
    borderWidth: 2,
    borderColor: RING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },

  // --- Cluster marker ---
  clusterWrap: { position: 'relative', height: 36 },
  clusterThumb: {
    position: 'absolute',
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: RING,
  },
  clusterThumbBack: { right: 0 },
  clusterThumbFront: { left: 0, zIndex: 10 },
  clusterCountCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: light.primary,
  },
  clusterCountText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  clusterBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    zIndex: 20,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: status.danger,
  },
  clusterBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 10 },

  // --- Category filter control ---
  categoryControl: {
    position: 'absolute',
    top: 56,
    left: 16,
    alignItems: 'flex-start',
    gap: 8,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 248, 0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  roundBtnActive: { backgroundColor: light.primary },
  categoryMenu: {
    borderRadius: 24,
    backgroundColor: 'rgba(255, 253, 248, 0.97)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  categoryItem: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryItemActive: { backgroundColor: light.primary },

  // --- Filter chips ---
  filterRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 92,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 253, 248, 0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  chipActive: { backgroundColor: light.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: light.foreground },
  chipTextActive: { color: '#FFFFFF' },

  // --- CHECK-IN button ---
  checkinWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },

  // --- Cluster sheet ---
  clusterSheetHeader: { paddingHorizontal: 16, paddingBottom: 8 },
  clusterSheetTitle: { fontSize: 16, fontWeight: '700', color: light.foreground },
  clusterSheetList: { paddingHorizontal: 16, paddingBottom: 24 },
  clusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: light.border,
  },
  clusterRowImg: { width: 56, height: 56, borderRadius: 12, backgroundColor: light.surfaceMuted },
  clusterRowIconFallback: { alignItems: 'center', justifyContent: 'center' },
  clusterRowInfo: { flex: 1, minWidth: 0 },
  clusterRowName: { fontWeight: '600', color: light.foreground, fontSize: 15 },
  clusterRowMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: light.mutedForeground },
});
