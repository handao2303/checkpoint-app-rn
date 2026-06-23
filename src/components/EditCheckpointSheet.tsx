import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet } from "./ui/Sheet";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, status, fontFamily } from "../theme/tokens";
import { t } from "../lib/i18n";
import { updateCheckpoint, type CheckpointDetail } from "../lib/api";

interface EditCheckpointSheetProps {
  visible: boolean;
  onClose: () => void;
  checkpoint: CheckpointDetail;
}

/**
 * Bottom-sheet to edit a checkpoint's name / note / rating.
 * Mirrors the edit flow of web `components/CheckpointDetailSheet.tsx`.
 */
export function EditCheckpointSheet({ visible, onClose, checkpoint }: EditCheckpointSheetProps) {
  const { theme } = useTheme();
  const qc = useQueryClient();
  const cp = checkpoint.checkpoint;

  const [name, setName] = useState(cp.name);
  const [note, setNote] = useState(cp.note ?? "");
  const [rating, setRating] = useState<number>(cp.rating ?? 0);

  // Re-sync local state whenever a different checkpoint (or fresh data) is shown.
  useEffect(() => {
    setName(cp.name);
    setNote(cp.note ?? "");
    setRating(cp.rating ?? 0);
  }, [cp.id, cp.name, cp.note, cp.rating]);

  const mutation = useMutation({
    mutationFn: () =>
      updateCheckpoint(cp.id, {
        name: name.trim(),
        note: note.trim() ? note.trim() : null,
        rating: rating > 0 ? rating : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkpoint", cp.id] });
      qc.invalidateQueries({ queryKey: ["my-checkpoints"] });
      onClose();
    },
  });

  const canSave = name.trim().length > 0 && !mutation.isPending;

  return (
    <Sheet visible={visible} onClose={onClose} maxHeightRatio={0.85}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.lg }}>
        <View style={styles.header}>
          <Icon name="pencil" size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.foreground }]}>{t("checkin.editTitle")}</Text>
        </View>

        {/* Name */}
        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>{t("checkin.name")}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("checkin.namePlaceholder")}
            placeholderTextColor={theme.subtleForeground}
            style={[
              styles.input,
              { backgroundColor: theme.muted, color: theme.foreground, borderColor: theme.border },
            ]}
          />
        </View>

        {/* Note */}
        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>{t("checkin.note")}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t("checkin.notePlaceholder")}
            placeholderTextColor={theme.subtleForeground}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[
              styles.input,
              styles.multiline,
              { backgroundColor: theme.muted, color: theme.foreground, borderColor: theme.border },
            ]}
          />
        </View>

        {/* Rating */}
        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>{t("checkin.rating")}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => {
              const filled = value <= rating;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => setRating(value === rating ? 0 : value)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Icon
                    name="star"
                    size={32}
                    color={filled ? status.gold : theme.border}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Button
          variant="primary"
          fullWidth
          loading={mutation.isPending}
          disabled={!canSave}
          onPress={() => mutation.mutate()}
        >
          {mutation.isPending ? t("checkin.saving") : t("checkin.save")}
        </Button>

        {mutation.isError && (
          <Text style={[styles.error, { color: status.danger }]}>{t("checkin.saveFailed")}</Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 18, fontFamily: fontFamily.bold, fontWeight: "700" },
  label: { fontSize: 13, fontFamily: fontFamily.medium },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
  },
  multiline: { minHeight: 96 },
  stars: { flexDirection: "row", gap: spacing.sm },
  error: { fontSize: 13, textAlign: "center" },
});
