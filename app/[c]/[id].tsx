import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
  Image,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { getCheckpointDetail, viewCheckpoint, deleteCheckpoint } from "../../src/lib/api";
import { useAuth } from "../../src/hooks/useAuth";
import { CATEGORIES } from "../../src/lib/maps";
import { colors } from "../../src/theme/tokens";
import { Button } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";
import { UserAvatar } from "../../src/components/ui/UserAvatar";
import { DetailSheetSkeleton } from "../../src/components/ui/Skeleton";
import { ReactionBar } from "../../src/components/ReactionBar";
import { CommentSection } from "../../src/components/CommentSection";
import { MediaPreview, useMediaPreview, type MediaItem } from "../../src/components/MediaPreview";
import { EditCheckpointSheet } from "../../src/components/EditCheckpointSheet";
import { shareLink } from "../../src/lib/share";

export default function CheckpointDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();
  const lightbox = useMediaPreview();
  const [editing, setEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["checkpoint", id],
    queryFn: () => getCheckpointDetail(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (id) {
      viewCheckpoint(id).then(() => {
        qc.invalidateQueries({ queryKey: ["checkpoint", id] });
      });
    }
  }, [id, qc]);

  const isMine = data && user && data.checkpoint.user_id === user.id;

  const handleDelete = () => {
    Alert.alert(t("common.confirmDeleteCheckpoint"), t("common.confirmDeleteDesc"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive",
        onPress: async () => {
          try {
            await deleteCheckpoint(id!);
            qc.invalidateQueries({ queryKey: ["checkpoints"] });
            router.back();
          } catch (error: any) {
            Alert.alert(t("common.error"), error.message);
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    const url = `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080"}/share/checkpoint/${id}`;
    await shareLink({
      title: data?.checkpoint.name ?? "Checkpoint",
      text: data?.checkpoint.note ?? data?.checkpoint.name ?? "Checkpoint",
      url,
    });
  };

  if (isLoading || !data) return <DetailSheetSkeleton />;

  const cat = CATEGORIES.find((c) => c.key === data.checkpoint.category);

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Images */}
      {data.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {data.images.map((img, idx) => (
            <View key={img.id} style={styles.imageContainer}>
              {img.pending ? (
                <View style={[styles.image, { alignItems: "center", justifyContent: "center" }]}>
                  <ActivityIndicator color={colors.primary[500]} />
                  <Text style={{ fontSize: 12, color: colors.neutral[500], marginTop: 4 }}>{t("checkin.processingImage")}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    lightbox.open(
                      data.images
                        .filter((m) => !m.pending)
                        .map<MediaItem>((m) => ({
                          url: m.url,
                          thumbnailUrl: m.thumbnail_url,
                          mediaType: m.type === "video" ? "video" : "image",
                        })),
                      idx,
                    )
                  }
                >
                  <Image source={{ uri: img.thumbnail_url || img.url }} style={styles.image} resizeMode="cover" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Info */}
      <Card>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {cat && <Text style={{ fontSize: 24 }}>{cat.emoji}</Text>}
            <Text style={styles.name}>{data.checkpoint.name}</Text>
          </View>
          {data.checkpoint.note && <Text style={styles.note}>{data.checkpoint.note}</Text>}
          {data.checkpoint.address && <Text style={styles.address}>📍 {data.checkpoint.address}</Text>}
          {data.checkpoint.rating && <Text style={styles.rating}>{"⭐".repeat(data.checkpoint.rating)}</Text>}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Text style={styles.xp}>+{data.checkpoint.xp_awarded} XP</Text>
            <Text style={styles.views}>👁️ {data.checkpoint.view_count}</Text>
          </View>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            onPress={() => router.push(`/u/${data.author.username}`)}
          >
            <UserAvatar url={data.author.avatar_url} name={data.author.display_name} size={28} />
            <Text style={{ fontWeight: "500" }}>{data.author.display_name || data.author.username}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Reactions */}
      <Card padded={false} style={{ padding: 12 }}>
        <ReactionBar
          checkpointId={data.checkpoint.id}
          ownerUserId={data.checkpoint.user_id}
          checkpointName={data.checkpoint.name}
        />
      </Card>

      {/* Comments */}
      <Card padded={false} style={{ padding: 12 }}>
        <CommentSection
          checkpointId={data.checkpoint.id}
          ownerUserId={data.checkpoint.user_id}
          checkpointName={data.checkpoint.name}
        />
      </Card>

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button variant="green" style={{ flex: 1 }} onPress={handleShare}>
          {t("common.share")}
        </Button>
        {isMine && (
          <Button variant="outline" onPress={() => setEditing(true)}>
            {t("checkin.editTitle")}
          </Button>
        )}
        {isMine && (
          <Button variant="outline" onPress={handleDelete}>
            {t("common.delete")}
          </Button>
        )}
      </View>

      <MediaPreview {...lightbox.props} />
      {isMine && (
        <EditCheckpointSheet visible={editing} onClose={() => setEditing(false)} checkpoint={data} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  imageContainer: { marginRight: 8 },
  image: { width: 280, height: 200, borderRadius: 12, backgroundColor: colors.neutral[100] },
  name: { fontSize: 20, fontWeight: "700", color: colors.neutral[800], flex: 1 },
  note: { fontSize: 15, color: colors.neutral[600], lineHeight: 22 },
  address: { fontSize: 13, color: colors.neutral[500] },
  rating: { fontSize: 16 },
  xp: { fontSize: 14, fontWeight: "600", color: colors.green[600] },
  views: { fontSize: 13, color: colors.neutral[500] },
});
