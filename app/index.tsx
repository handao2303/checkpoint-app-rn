import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, FlatList } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import MapView, { Marker, Callout, type Region } from "react-native-maps";
import { useAuth } from "../src/hooks/useAuth";
import { getCheckpointsInBounds, type Checkpoint, type Bounds, type LatLng } from "../src/lib/api";
import { getCurrentCoords } from "../src/lib/geo";
import { DEFAULT_VIEW, CATEGORIES } from "../src/lib/maps";
import { colors } from "../src/theme/tokens";
import { Button } from "../src/components/ui/Button";
import { Icon, type IconName } from "../src/components/ui/Icon";
import { NotificationSheet } from "../src/components/NotificationSheet";
import { LocationPermissionSheet } from "../src/components/LocationPermissionSheet";
import { MapSkeleton } from "../src/components/MapSkeleton";
import { HomeShell } from "../src/components/HomeShell";
import { useLocationLabel } from "../src/hooks/useLocationLabel";
import { categoryIcon } from "../src/lib/maps";

const DEBOUNCE_MS = 500;

export default function MapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [mapReady, setMapReady] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: DEFAULT_VIEW.latitude,
    longitude: DEFAULT_VIEW.longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [mapFilter, setMapFilter] = useState<"all" | "mine" | "following">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userCoords, setUserCoords] = useState<LatLng | null>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const flewToUser = useRef(false);

  const { locationLabel } = useLocationLabel(userCoords);

  // One-time auto-locate
  useEffect(() => {
    getCurrentCoords().then((c) => {
      setUserCoords(c);
      if (!flewToUser.current && mapRef.current) {
        flewToUser.current = true;
        mapRef.current.animateToRegion({
          latitude: c.lat,
          longitude: c.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
      }
    }).catch(() => {
      // Auto-ask once
      setLocationSheetOpen(true);
    });
  }, []);

  const bounds: Bounds = useMemo(() => ({
    minLng: region.longitude - region.longitudeDelta,
    minLat: region.latitude - region.latitudeDelta,
    maxLng: region.longitude + region.longitudeDelta,
    maxLat: region.latitude + region.latitudeDelta,
  }), [region]);

  const { data: checkpoints = [], isLoading } = useQuery({
    queryKey: ["checkpoints", "bbox", bounds, mapFilter, categoryFilter],
    queryFn: () =>
      getCheckpointsInBounds(bounds, {
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        filter: mapFilter !== "all" ? mapFilter : undefined,
      }),
    staleTime: 10_000,
  });

  const handleRegionChange = useCallback((r: Region) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setRegion(r), DEBOUNCE_MS);
  }, []);

  const content = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <Icon name="map-pin" size={20} color={colors.primary[500]} />
          <View>
            <Text style={styles.brand}>Checkpoint</Text>
            {locationLabel && <Text style={styles.locationLabel} numberOfLines={1}>{locationLabel}</Text>}
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {user && (
            <TouchableOpacity onPress={() => setNotifOpen(true)} style={styles.iconBtn}>
              <Icon name="bell" size={22} color={colors.neutral[600]} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push(user ? "/profile" : "/login")}
            style={styles.iconBtn}
          >
            <Icon name="user" size={22} color={colors.neutral[600]} />
          </TouchableOpacity>
        </View>
      </View>

      {user && (
        <NotificationSheet visible={notifOpen} onClose={() => setNotifOpen(false)} />
      )}
      <LocationPermissionSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        onGranted={(c) => {
          setLocationSheetOpen(false);
          setUserCoords(c);
        }}
      />

      {/* Filter bar */}
      <View style={styles.filterRow}>
        {user && (["all", "mine", "following"] as const).map((f) => (
          <TouchableOpacity
            key={f} style={[styles.chip, mapFilter === f && styles.chipActive]}
            onPress={() => setMapFilter(f)}
          >
            <Text style={[styles.chipText, mapFilter === f && styles.chipTextActive]}>
              {f === "all" ? t("map.all") : f === "mine" ? t("map.mine") : t("map.following")}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        {/* Category dropdown trigger */}
        <TouchableOpacity
          style={[styles.chip, styles.categoryBtn, categoryMenuOpen && styles.chipActive]}
          onPress={() => setCategoryMenuOpen(!categoryMenuOpen)}
        >
          <Icon name={(categoryIcon(categoryFilter) as IconName)} size={15} color={categoryMenuOpen ? "#fff" : colors.neutral[500]} />
          <Text style={[styles.chipText, categoryMenuOpen && styles.chipTextActive]}>
            {CATEGORIES.find(c => c.key === categoryFilter) ? t(CATEGORIES.find(c => c.key === categoryFilter)!.labelKey as any) : t("map.all")}
          </Text>
          <Icon name="chevron-down" size={12} color={categoryMenuOpen ? "#fff" : colors.neutral[400]} />
        </TouchableOpacity>
      </View>

      {/* Category dropdown menu */}
      {categoryMenuOpen && (
        <View style={styles.categoryMenu}>
          <TouchableOpacity style={[styles.categoryItem, categoryFilter === "all" && styles.categoryItemActive]} onPress={() => { setCategoryFilter("all"); setCategoryMenuOpen(false); }}>
            <Icon name="filter" size={17} color={categoryFilter === "all" ? colors.primary[500] : colors.neutral[400]} />
            <Text style={[styles.categoryItemText, categoryFilter === "all" && styles.categoryItemTextActive]}>{t("map.all")}</Text>
          </TouchableOpacity>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c.key} style={[styles.categoryItem, categoryFilter === c.key && styles.categoryItemActive]} onPress={() => { setCategoryFilter(c.key); setCategoryMenuOpen(false); }}>
              <Icon name={(categoryIcon(c.key) as IconName)} size={17} color={categoryFilter === c.key ? colors.primary[500] : colors.neutral[400]} />
              <Text style={[styles.categoryItemText, categoryFilter === c.key && styles.categoryItemTextActive]}>{t(c.labelKey as any)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Map */}
      {!mapReady && <MapSkeleton />}
      <View style={[styles.mapContainer, !mapReady && styles.mapHidden]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: DEFAULT_VIEW.latitude,
            longitude: DEFAULT_VIEW.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          onRegionChangeComplete={handleRegionChange}
          showsUserLocation
          showsMyLocationButton
          onMapReady={() => setMapReady(true)}
        >
          {checkpoints.map((cp) => (
            <Marker
              key={cp.id}
              coordinate={{ latitude: cp.lat, longitude: cp.lng }}
              title={cp.name}
              description={cp.category}
              onCalloutPress={() => router.push(`/c/${cp.id}`)}
            >
              <View style={styles.markerPin}>
                <Icon name={(categoryIcon(cp.category) as IconName)} size={20} color={colors.primary[600]} />
              </View>
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{cp.name}</Text>
                  <Text style={styles.calloutSub}>{cp.address || cp.category}</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      </View>

      {/* Loading */}
      {isLoading && mapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary[500]} />
        </View>
      )}

      {/* Check-in button */}
      <View style={styles.bottomBar}>
        {user ? (
          <Button variant="primary" onPress={() => router.push("/create")} fullWidth>
            {t("checkin.checkin")}
          </Button>
        ) : (
          <Button variant="outline" onPress={() => router.push("/login")} fullWidth>
            {t("login.login")}
          </Button>
        )}
      </View>
    </>
  );

  return <HomeShell>{content}</HomeShell>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8 },
  brand: { fontSize: 18, fontWeight: "700", color: colors.primary[500], lineHeight: 20 },
  locationLabel: { fontSize: 11, color: colors.neutral[500], marginTop: 1 },
  iconBtn: { padding: 6 },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.neutral[50] },
  chipActive: { backgroundColor: colors.primary[500] },
  chipText: { fontSize: 13, color: colors.neutral[600] },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  categoryBtn: { backgroundColor: colors.neutral[0], borderWidth: 1, borderColor: colors.neutral[200] },
  categoryMenu: { position: "absolute", top: 80, right: 10, zIndex: 999, backgroundColor: "#fff", borderRadius: 14, padding: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, minWidth: 170 },
  categoryItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  categoryItemActive: { backgroundColor: colors.primary[50] },
  categoryItemText: { fontSize: 14, color: colors.neutral[700] },
  categoryItemTextActive: { fontWeight: "600", color: colors.primary[600] },
  mapContainer: { flex: 1 },
  mapHidden: { height: 0, overflow: "hidden" },
  markerPin: { backgroundColor: "#fff", padding: 4, borderRadius: 16, borderWidth: 2, borderColor: colors.primary[300] },
  callout: { padding: 4, minWidth: 100 },
  calloutTitle: { fontWeight: "600", fontSize: 13 },
  calloutSub: { fontSize: 11, color: colors.neutral[500] },
  loadingOverlay: { position: "absolute", top: 100, right: 10, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 20, padding: 6 },
  bottomBar: { paddingHorizontal: 12, paddingVertical: 8 },
});
