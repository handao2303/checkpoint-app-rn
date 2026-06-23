import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { getReactions, setReaction, clearReaction, type ReactionSummary } from "../lib/api";
import { addReactionNotification } from "../services/notifications";
import { useAuth } from "../hooks/useAuth";
import { colors } from "../theme/tokens";

const REACTIONS = [
  { key: "like", emoji: "👍", label: "Like", activeClass: "text-primary" },
  { key: "love", emoji: "😍", label: "Love", activeClass: "text-rose-500" },
  { key: "fire", emoji: "🔥", label: "Fire", activeClass: "text-orange-500" },
  { key: "haha", emoji: "😄", label: "Haha" },
  { key: "sad", emoji: "😢", label: "Sad" },
];

const EMPTY: ReactionSummary = { counts: {}, total: 0, mine: null };

function applyOptimistic(prev: ReactionSummary, next: string | null): ReactionSummary {
  const counts = { ...prev.counts };
  let total = prev.total;
  if (prev.mine) {
    counts[prev.mine] = Math.max(0, (counts[prev.mine] ?? 0) - 1);
    total -= 1;
  }
  if (next) {
    counts[next] = (counts[next] ?? 0) + 1;
    total += 1;
  }
  return { counts, total, mine: next };
}

interface ReactionBarProps {
  checkpointId: string;
  ownerUserId: string;
  checkpointName: string;
}

export function ReactionBar({ checkpointId, ownerUserId, checkpointName }: ReactionBarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const key = ["reactions", checkpointId];

  const { data = EMPTY } = useQuery({
    queryKey: key,
    queryFn: () => getReactions(checkpointId),
  });
  const mine = data.mine ?? null;

  const mutation = useMutation({
    mutationFn: (reaction: string | null) =>
      reaction ? setReaction(checkpointId, reaction) : clearReaction(checkpointId),
    onMutate: async (reaction) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ReactionSummary>(key) ?? EMPTY;
      qc.setQueryData(key, applyOptimistic(prev, reaction));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const handleReaction = (reactionKey: string) => {
    if (!user) {
      router.push("/login");
      return;
    }
    const next = mine === reactionKey ? null : reactionKey;
    mutation.mutate(next);

    // Notify owner
    if (next && ownerUserId !== user.id) {
      void addReactionNotification(ownerUserId, {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      }, checkpointId, checkpointName, next);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.reactionRow}>
        {REACTIONS.map((r) => {
          const isActive = mine === r.key;
          const count = data.counts[r.key] ?? 0;
          return (
            <TouchableOpacity
              key={r.key}
              style={[styles.reactionBtn, isActive && styles.reactionActive]}
              onPress={() => handleReaction(r.key)}
            >
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              {count > 0 && <Text style={styles.reactionCount}>{count}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      {data.total > 0 && (
        <Text style={styles.totalText}>
          {data.total} {data.total === 1 ? "reaction" : "reactions"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  reactionRow: { flexDirection: "row", gap: 4 },
  reactionBtn: {
    flexDirection: "row", alignItems: "center", gap: 2,
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 999, backgroundColor: colors.neutral[50],
  },
  reactionActive: { backgroundColor: colors.primary[50] },
  reactionEmoji: { fontSize: 16 },
  reactionCount: { fontSize: 12, color: colors.neutral[600], fontWeight: "600" },
  totalText: { fontSize: 12, color: colors.neutral[500], marginTop: 4, textAlign: "center" },
});
