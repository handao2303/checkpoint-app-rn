import React, { useCallback, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { fetchComments, addComment, deleteComment, getCommentCount, type Comment, type CommentAuthor } from "../services/comments";
import { addCommentNotification } from "../services/notifications";
import { useAuth } from "../hooks/useAuth";
import { colors } from "../theme/tokens";
import { UserAvatar } from "./ui/UserAvatar";
import { Skeleton } from "./ui/Skeleton";

interface CommentSectionProps {
  checkpointId: string;
  ownerUserId: string;
  checkpointName: string;
}

export function CommentSection({ checkpointId, ownerUserId, checkpointName }: CommentSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const { data: count = 0 } = useQuery({
    queryKey: ["comment-count", checkpointId],
    queryFn: () => getCommentCount(checkpointId),
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["comments", checkpointId],
    queryFn: ({ pageParam }) => fetchComments(checkpointId, pageParam),
    initialPageParam: undefined as any,
    getNextPageParam: (last) => last.cursor,
    staleTime: 30_000,
  });
  const comments = data?.pages.flatMap((p) => p.items) ?? [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["comments", checkpointId] });
    qc.invalidateQueries({ queryKey: ["comment-count", checkpointId] });
  };

  const handleSubmit = async () => {
    const value = text.trim();
    if (!value || !user || sending) return;
    setSending(true);
    try {
      const actor: CommentAuthor = {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      };
      await addComment(checkpointId, value, actor);
      void addCommentNotification(ownerUserId, actor, checkpointId, checkpointName);
      setText("");
      refresh();
    } catch { /* best-effort */ }
    finally { setSending(false); }
  };

  const handleDelete = (commentId: string) => {
    Alert.alert(t("common.delete"), t("common.confirmDelete"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive",
        onPress: async () => {
          try {
            await deleteComment(checkpointId, commentId);
            refresh();
          } catch {}
        },
      },
    ]);
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const isOwn = user && item.user_id === user.id;
    return (
      <View style={styles.commentRow}>
        <TouchableOpacity onPress={() => router.push(`/u/${item.username}`)}>
          <UserAvatar url={item.avatar_url} name={item.display_name} size={28} />
        </TouchableOpacity>
        <View style={styles.commentBubble}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.commentAuthor}>{item.display_name || item.username}</Text>
            <Text style={styles.commentTime}>
              {new Date(item.created_at).toLocaleDateString("vi-VN")}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.text}</Text>
          {isOwn && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item.id)}
            >
              <Text style={styles.deleteText}>{t("comment.delete")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={styles.container}>
        <Text style={styles.header}>{t("comment.title", { count })}</Text>

        {isLoading ? (
          <View style={{ gap: 8, padding: 8 }}>
            {[1, 2].map((i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8 }}>
                <Skeleton width={28} height={28} borderRadius={14} />
                <Skeleton height={40} style={{ flex: 1 }} />
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
            onEndReachedThreshold={0.3}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.empty}>{t("comment.noComments")}</Text>
            }
          />
        )}

        {user && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={t("comment.placeholder")}
              placeholderTextColor={colors.neutral[400]}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
              onPress={handleSubmit}
              disabled={!text.trim() || sending}
            >
              <Text style={styles.sendText}>{sending ? "..." : t("comment.send")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  header: { fontSize: 15, fontWeight: "600", marginBottom: 8, color: colors.neutral[700] },
  commentRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  commentBubble: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 10,
  },
  commentAuthor: { fontSize: 13, fontWeight: "600", color: colors.neutral[700] },
  commentTime: { fontSize: 11, color: colors.neutral[400] },
  commentText: { fontSize: 14, color: colors.neutral[700], marginTop: 2, lineHeight: 20 },
  deleteBtn: { marginTop: 4 },
  deleteText: { fontSize: 12, color: colors.accent[500] },
  empty: { color: colors.neutral[400], fontSize: 14, textAlign: "center", padding: 16 },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingTop: 8,
  },
  input: {
    flex: 1, backgroundColor: colors.neutral[100], borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 14,
    maxHeight: 80, color: colors.neutral[800],
  },
  sendBtn: {
    backgroundColor: colors.primary[500], borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
