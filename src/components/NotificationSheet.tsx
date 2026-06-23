import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  SafeAreaView, ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { useAuth } from "../hooks/useAuth";
import { colors } from "../theme/tokens";
import { UserAvatar } from "./ui/UserAvatar";
import { Skeleton } from "./ui/Skeleton";
import { getItem, setItem } from "../lib/storage";

interface NotificationItem {
  id: string;
  type: string;
  actor_id: string;
  actor_username: string;
  actor_display_name?: string;
  actor_avatar_url?: string;
  checkpoint_id?: string;
  checkpoint_name?: string;
  reaction?: string;
  created_at: Date;
}

const NOTIF_EMOJIS: Record<string, string> = {
  comment: "💬",
  follow: "👤",
  reaction: "👍",
  checkpoint: "📍",
};

function lastSeenKey(uid: string): string {
  return `cp.notif.lastSeen.${uid}`;
}

function mapNotif(d: any): NotificationItem {
  const v = d.data();
  return {
    id: d.id, type: v.type as string,
    actor_id: v.actor_id, actor_username: v.actor_username,
    actor_display_name: v.actor_display_name, actor_avatar_url: v.actor_avatar_url,
    checkpoint_id: v.checkpoint_id, checkpoint_name: v.checkpoint_name,
    reaction: v.reaction,
    created_at: v.created_at?.toDate() ?? new Date(),
  };
}

interface NotificationSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationSheet({ visible, onClose }: NotificationSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !user) return;
    if (Platform.OS !== "web") { setLoading(false); return; }

    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const { collection, query, orderBy, limit, onSnapshot } = await import("firebase/firestore");
        const { initializeApp } = await import("firebase/app");
        const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
        const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
        if (!apiKey || !projectId) { setLoading(false); return; }
        const app = initializeApp({ apiKey, projectId }, "checkpoint-notif-ui");
        const { getFirestore } = await import("firebase/firestore");
        const db = getFirestore(app);
        const notifCol = collection(db, "users", user.id, "notifications");
        const q = query(notifCol, orderBy("created_at", "desc"), limit(30));
        unsub = onSnapshot(q, (snap) => {
          setNotifications(snap.docs.map(mapNotif));
          setLoading(false);
        });
      } catch { setLoading(false); }
    })();

    // Mark all as seen
    setItem(lastSeenKey(user.id), Date.now().toString());

    return () => { if (unsub) unsub(); };
  }, [visible, user]);

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const typeLabel = (() => {
      switch (item.type) {
        case "comment": return t("notification.comment");
        case "follow": return t("notification.follow");
        case "reaction": return `${item.reaction || ""} ${t("notification.reaction")}`;
        case "checkpoint": return t("notification.checkpoint");
        default: return item.type;
      }
    })();

    return (
      <TouchableOpacity
        style={styles.notifRow}
        onPress={() => {
          onClose();
          if (item.checkpoint_id) {
            router.push(`/c/${item.checkpoint_id}`);
          } else {
            router.push(`/u/${item.actor_username}`);
          }
        }}
      >
        <UserAvatar
          url={item.actor_avatar_url}
          name={item.actor_display_name}
          size={36}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.notifText}>
            <Text style={styles.notifActor}>{item.actor_display_name || item.actor_username}</Text>
            {" "}{typeLabel}
          </Text>
          <Text style={styles.notifTime}>
            {new Date(item.created_at).toLocaleDateString("vi-VN")}
          </Text>
        </View>
        <Text style={{ fontSize: 20 }}>{NOTIF_EMOJIS[item.type] ?? "🔔"}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("notification.title")}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>{t("common.close")}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ padding: 16, gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                <Skeleton width={36} height={36} borderRadius={18} />
                <Skeleton height={36} style={{ flex: 1 }} />
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 60 }}>
                <Text style={{ fontSize: 16, color: colors.neutral[400] }}>{t("notification.empty")}</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.neutral[800] },
  closeBtn: { fontSize: 16, color: colors.primary[500], fontWeight: "600" },
  notifRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderBottomWidth: 0.5, borderBottomColor: colors.neutral[100],
  },
  notifText: { fontSize: 14, lineHeight: 20 },
  notifActor: { fontWeight: "600", color: colors.neutral[800] },
  notifTime: { fontSize: 11, color: colors.neutral[400], marginTop: 2 },
});
