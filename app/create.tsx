import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Image, Alert, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getCurrentCoords } from "../src/lib/geo";
import { getUploadSlots, putFilesToSlots, createCheckpoint, getMyJourneys, getNearbyPlaces } from "../src/lib/api";
import { CATEGORIES } from "../src/lib/maps";
import { colors } from "../src/theme/tokens";
import { Button } from "../src/components/ui/Button";
import { Card } from "../src/components/ui/Card";
import { CameraSheet } from "../src/components/CameraSheet";
import { prepareCheckpointImage } from "../src/services/image";
import { extractPhotoMetadata } from "../src/services/exif";
import { quickCheckinSettings } from "../src/lib/settings";

export default function CreateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"gps" | "photo">("gps");

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [note, setNote] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [images, setImages] = useState<{ uri: string; type: string; name: string }[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | undefined>();
  const [locating, setLocating] = useState(true);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoCheckinGps, setPhotoCheckinGps] = useState<{ lat: number; lng: number } | null>(null);

  // Get location
  useEffect(() => {
    getCurrentCoords()
      .then(setCoords)
      .catch(() => setLocating(false))
      .finally(() => setLocating(false));
  }, []);

  // Open camera automatically on create if setting enabled
  useEffect(() => {
    if (!locating && quickCheckinSettings.preferCameraOnCheckin && activeTab === "gps") {
      setCameraOpen(true);
    }
  }, [locating, activeTab]);

  // Journeys
  const { data: journeys = [] } = useQuery({
    queryKey: ["journeys", "active"],
    queryFn: () => getMyJourneys(),
  });
  const activeJourneys = journeys.filter((j) => j.is_active);

  // Photo check-in: pick image and extract EXIF GPS
  const handlePhotoCheckin = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Try to extract GPS from EXIF
      const meta = await extractPhotoMetadata(asset.assetId ?? undefined);
      if (meta.gps) {
        setPhotoCheckinGps(meta.gps);
        setImages([{ uri: asset.uri, type: asset.mimeType || "image/jpeg", name: asset.fileName || "photo.jpg" }]);
        setActiveTab("gps");
        Alert.alert("📍", "GPS found in photo!");
      } else {
        Alert.alert(t("checkin.photoCheckinNoGps"));
      }
    }
  }, [t]);

  // Camera capture handler
  const handleCameraCapture = useCallback((uri: string) => {
    setImages((prev) => [...prev, { uri, type: "image/jpeg", name: `camera-${Date.now()}.jpg` }].slice(0, 3));
  }, []);

  // Nearby places
  const { data: nearbyPlaces = [] } = useQuery({
    queryKey: ["nearby-places", coords],
    queryFn: () => (coords ? getNearbyPlaces(coords.lat, coords.lng) : []),
    enabled: !!coords,
  });

  // Pick image
  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      const newImages = result.assets.map((a) => ({
        uri: a.uri,
        type: a.mimeType || "image/jpeg",
        name: a.fileName || `photo-${Date.now()}.jpg`,
      }));
      setImages((prev) => [...prev, ...newImages].slice(0, 3));
    }
  }, []);

  // Take photo
  const takePhoto = useCallback(async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled) {
      const a = result.assets[0];
      setImages([{
        uri: a.uri,
        type: a.mimeType || "image/jpeg",
        name: a.fileName || `camera-${Date.now()}.jpg`,
      }]);
    }
  }, []);

  // Use photo check-in coords if available
  const effectiveCoords = photoCheckinGps || coords;

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveCoords) throw new Error(t("checkin.locationRequired"));

      // Get upload slots
      const slots = await getUploadSlots(images.length);

      // Upload images
      const files = await Promise.all(
        images.map(async (img) => {
          const response = await fetch(img.uri);
          const blob = await response.blob();
          return { original: blob, type: "image" as const };
        }),
      );
      await putFilesToSlots(slots, files);

      // Create checkpoint
      const result = await createCheckpoint({
        name,
        category,
        note: note || undefined,
        rating: rating || undefined,
        lat: effectiveCoords.lat,
        lng: effectiveCoords.lng,
        journey_id: selectedJourneyId,
        images: slots.map((s) => ({
          object_key: s.object_key,
          thumbnail_key: s.thumbnail_key,
        })),
      });

      return result;
    },
    onSuccess: (result) => {
      Alert.alert(
        t("checkin.checkinSuccess").replace("{{xp}}", String(result.xp_awarded)),
        "",
        [{ text: "OK", onPress: () => router.back() }],
      );
    },
    onError: (error: Error) => {
      Alert.alert(t("common.error"), error.message);
    },
  });

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "gps" && styles.tabActive]}
          onPress={() => setActiveTab("gps")}
        >
          <Text style={[styles.tabText, activeTab === "gps" && styles.tabTextActive]}>
            📍 {t("checkin.fromGps")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "photo" && styles.tabActive]}
          onPress={() => setActiveTab("photo")}
        >
          <Text style={[styles.tabText, activeTab === "photo" && styles.tabTextActive]}>
            🖼️ {t("checkin.fromPhoto")}
          </Text>
        </TouchableOpacity>
      </View>

      {locating ? (
        <View style={{ alignItems: "center", padding: 40 }}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={{ marginTop: 8, color: colors.neutral[500] }}>Getting location...</Text>
        </View>
      ) : (
        <>
          {/* Nearby places */}
          {nearbyPlaces.length > 0 && (
            <View>
              <Text style={styles.label}>{t("checkin.nearbyPlaces")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {nearbyPlaces.map((p) => (
                  <TouchableOpacity
                    key={p.place_id}
                    style={styles.placeChip}
                    onPress={() => {
                      setName(p.name);
                      setCategory(p.category);
                    }}
                  >
                    <Text style={styles.placeChipText}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Name */}
          <View>
            <Text style={styles.label}>{t("checkin.name")}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t("checkin.namePlaceholder")}
              placeholderTextColor={colors.neutral[400]}
            />
          </View>

          {/* Category */}
          <View>
            <Text style={styles.label}>{t("checkin.category")}</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.categoryChip, category === c.key && styles.categoryChipActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text>{c.emoji}</Text>
                  <Text style={[styles.categoryText, category === c.key && styles.categoryTextActive]}>
                    {t(c.labelKey as any)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Note */}
          <View>
            <Text style={styles.label}>{t("checkin.note")}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder={t("checkin.notePlaceholder")}
              placeholderTextColor={colors.neutral[400]}
              multiline
            />
          </View>

          {/* Journey picker */}
          {activeJourneys.length > 0 && (
            <View>
              <Text style={styles.label}>{t("checkin.journey")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.journeyChip, !selectedJourneyId && styles.journeyChipActive]}
                  onPress={() => setSelectedJourneyId(undefined)}
                >
                  <Text style={[styles.journeyText, !selectedJourneyId && styles.journeyTextActive]}>
                    {t("checkin.noJourney")}
                  </Text>
                </TouchableOpacity>
                {activeJourneys.map((j) => (
                  <TouchableOpacity
                    key={j.id}
                    style={[styles.journeyChip, selectedJourneyId === j.id && styles.journeyChipActive]}
                    onPress={() => setSelectedJourneyId(j.id)}
                  >
                    <Text style={[styles.journeyText, selectedJourneyId === j.id && styles.journeyTextActive]}>
                      🧳 {j.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Images */}
          <View>
            <Text style={styles.label}>{t("checkin.addPhotos")}</Text>
            <View style={styles.imageRow}>
              {images.map((img, i) => (
                <View key={i} style={styles.imageThumb}>
                  <Image source={{ uri: img.uri }} style={styles.thumbImg} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Text style={{ color: "#fff", fontSize: 12 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 3 && (
                <>
                  <TouchableOpacity style={styles.addBtn} onPress={() => setCameraOpen(true)}>
                    <Text style={styles.addBtnText}>📷</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addBtn} onPress={pickImage}>
                    <Text style={styles.addBtnText}>🖼️</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Camera sheet */}
          <CameraSheet
            visible={cameraOpen}
            onClose={() => setCameraOpen(false)}
            onCapture={handleCameraCapture}
            maxCount={3 - images.length}
          />

          {/* Photo check-in tab action */}
          {activeTab === "photo" && (
            <Button variant="outline" onPress={handlePhotoCheckin} fullWidth>
              🖼️ {t("checkin.fromPhoto")}
            </Button>
          )}

          {/* Submit */}
          <Button
            variant="primary"
            fullWidth
            loading={submitMutation.isPending}
            disabled={!name.trim() || images.length === 0}
            onPress={() => submitMutation.mutate()}
          >
            {t("checkin.checkin")}
          </Button>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  tabRow: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1, alignItems: "center", paddingVertical: 10,
    borderRadius: 8, backgroundColor: colors.neutral[100],
  },
  tabActive: { backgroundColor: colors.primary[500] },
  tabText: { fontSize: 14, color: colors.neutral[600] },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, color: colors.neutral[700] },
  input: {
    backgroundColor: colors.neutral[100], borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    color: colors.neutral[800],
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  categoryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  categoryChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.neutral[100],
  },
  categoryChipActive: { backgroundColor: colors.primary[500] },
  categoryText: { fontSize: 13, color: colors.neutral[600] },
  categoryTextActive: { color: "#fff" },
  journeyChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.neutral[100], marginRight: 6,
  },
  journeyChipActive: { backgroundColor: colors.green[500] },
  journeyText: { fontSize: 13, color: colors.neutral[600] },
  journeyTextActive: { color: "#fff" },
  placeChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.primary[50], marginRight: 6,
  },
  placeChipText: { fontSize: 13, color: colors.primary[700] },
  imageRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  imageThumb: { position: "relative" },
  thumbImg: { width: 80, height: 80, borderRadius: 8 },
  removeBtn: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: colors.accent[500], borderRadius: 10,
    width: 20, height: 20, alignItems: "center", justifyContent: "center",
  },
  addBtn: {
    width: 80, height: 80, borderRadius: 8,
    backgroundColor: colors.neutral[100], alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { fontSize: 24 },
});
