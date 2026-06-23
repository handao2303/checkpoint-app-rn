import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { getPlace } from "../../src/lib/api";
import { CATEGORIES } from "../../src/lib/maps";
import { colors } from "../../src/theme/tokens";
import { Button } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";
import { UserAvatar } from "../../src/components/ui/UserAvatar";
import { DetailSheetSkeleton } from "../../src/components/ui/Skeleton";

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery({
    queryKey: ["place", id],
    queryFn: () => getPlace(id!),
    enabled: !!id,
  });

  if (isLoading || !data) return <DetailSheetSkeleton />;

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Images */}
      {data.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {data.images.map((img) => (
            <Image
              key={img.id}
              source={{ uri: img.thumbnail_url || img.url }}
              style={styles.image}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      <Card>
        <Text style={styles.name}>{data.place.name}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginVertical: 8 }}>
          <Text style={styles.stat}>{data.place.checkin_count} {t("discover.checkins")}</Text>
          {data.avg_rating && <Text style={styles.stat}>⭐ {data.avg_rating.toFixed(1)}</Text>}
        </View>
        {data.place.address && <Text style={styles.address}>📍 {data.place.address}</Text>}

        <Button
          variant="primary"
          fullWidth
          style={{ marginTop: 12 }}
          onPress={() => {
            router.push(`/create?place_id=${data.place.id}&name=${encodeURIComponent(data.place.name)}&category=${data.place.category}`);
          }}
        >
          {t("checkin.checkinHere")}
        </Button>
      </Card>

      {/* Reviews */}
      {data.reviews.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {data.reviews.map((r, i) => (
            <Card key={i}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <TouchableOpacity onPress={() => router.push(`/u/${r.author.username}`)}>
                  <UserAvatar url={r.author.avatar_url} name={r.author.display_name} size={24} />
                </TouchableOpacity>
                <Text style={{ fontWeight: "500" }}>{r.author.display_name || r.author.username}</Text>
                {r.rating && <Text style={{ fontSize: 12 }}>{"⭐".repeat(r.rating)}</Text>}
              </View>
              <Text style={{ color: colors.neutral[600] }}>{r.note}</Text>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  image: { width: 280, height: 180, borderRadius: 12, marginRight: 8, backgroundColor: colors.neutral[100] },
  name: { fontSize: 20, fontWeight: "700", color: colors.neutral[800] },
  stat: { fontSize: 13, color: colors.neutral[500] },
  address: { fontSize: 13, color: colors.neutral[500] },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.neutral[700] },
});
