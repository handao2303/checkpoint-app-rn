import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { t } from "../lib/i18n";
import {
  getMyJourneys,
  getJourney,
  getMyCheckpoints,
  createJourney,
  updateJourney,
  deleteJourney,
  assignCheckpointsToJourney,
  type Journey,
  type Checkpoint,
} from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { colors, radius, spacing, shadow } from "../theme/tokens";
import { Icon } from "../components/ui/Icon";
import { Sheet } from "../components/ui/Sheet";
import { Button } from "../components/ui/Button";

interface JourneysSectionProps {
  /** When omitted, renders the signed-in user's own journeys (with edit controls). */
  userId?: string;
}

type Mode =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; journey: Journey }
  | { kind: "delete"; journey: Journey }
  | { kind: "assign"; journey: Journey };

export function JourneysSection({ userId }: JourneysSectionProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const isOwn = !userId;

  const { data: journeys = [], isLoading } = useQuery({
    queryKey: ["journeys", "me"],
    queryFn: getMyJourneys,
  });

  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const close = () => setMode({ kind: "none" });

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["journeys"] }),
      qc.invalidateQueries({ queryKey: ["journey"] }),
      qc.invalidateQueries({ queryKey: ["my-checkpoints"] }),
    ]);

  return (
    <View>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.heading, { color: theme.foreground }]}>
          {t("journey.sectionTitle")}
        </Text>
        {isOwn && (
          <TouchableOpacity
            accessibilityLabel={t("journey.newJourney")}
            onPress={() => setMode({ kind: "create" })}
            style={[styles.iconBtn, { backgroundColor: theme.muted }]}
            activeOpacity={0.7}
          >
            <Icon name="plus" size={18} color={theme.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : journeys.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Icon name="route" size={28} color={theme.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
            {t("journey.emptyTitle")}
          </Text>
          <Text style={[styles.emptyHint, { color: theme.mutedForeground }]}>
            {t("journey.emptyHint")}
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {journeys.map((j) => (
            <JourneyRow
              key={j.id}
              journey={j}
              isOwn={isOwn}
              onOpen={() => router.push(`/j/${j.id}`)}
              onEdit={() => setMode({ kind: "edit", journey: j })}
              onDelete={() => setMode({ kind: "delete", journey: j })}
              onAssign={() => setMode({ kind: "assign", journey: j })}
            />
          ))}
        </View>
      )}

      {/* Sheets */}
      {mode.kind === "create" && (
        <CreateJourneySheet onClose={close} onDone={invalidate} />
      )}
      {mode.kind === "edit" && (
        <EditJourneySheet journey={mode.journey} onClose={close} onDone={invalidate} />
      )}
      {mode.kind === "delete" && (
        <DeleteJourneySheet journey={mode.journey} onClose={close} onDone={invalidate} />
      )}
      {mode.kind === "assign" && (
        <AssignCheckpointsSheet journey={mode.journey} onClose={close} onDone={invalidate} />
      )}
    </View>
  );
}

/* ─── Journey row ────────────────────────────────────────────────────────── */

function JourneyRow({
  journey,
  isOwn,
  onOpen,
  onEdit,
  onDelete,
  onAssign,
}: {
  journey: Journey;
  isOwn: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
}) {
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  // Reuses the cache populated by the journey detail screen (queryKey ["journey", id]).
  const { data: detail } = useQuery({
    queryKey: ["journey", journey.id],
    queryFn: () => getJourney(journey.id),
    staleTime: 60_000,
  });

  const stops = detail?.stats.checkpoint_count;
  const totalXp = detail?.stats.total_xp;

  return (
    <View style={[styles.row, { backgroundColor: theme.surface }, shadow.card]}>
      <TouchableOpacity
        style={styles.rowMain}
        onPress={onOpen}
        activeOpacity={0.7}
      >
        <View style={[styles.rowIcon, { backgroundColor: colors.primary[50] }]}>
          <Icon name="route" size={20} color={colors.primary[500]} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.rowTitle, { color: theme.foreground }]} numberOfLines={1}>
            {journey.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: theme.mutedForeground }]}>
              {stops != null
                ? t("journey.stopCount", { count: stops })
                : new Date(journey.created_at).toLocaleDateString("vi-VN")}
            </Text>
            {totalXp != null && totalXp > 0 && (
              <Text style={[styles.meta, { color: theme.mutedForeground }]}>
                {" · "}+{totalXp} XP
              </Text>
            )}
            {journey.is_active && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeText}>{t("journey.active")}</Text>
              </View>
            )}
          </View>
        </View>
        <Icon name="chevron-right" size={18} color={theme.mutedForeground} />
      </TouchableOpacity>

      {isOwn && (
        <TouchableOpacity
          accessibilityLabel="•••"
          onPress={() => setMenuOpen((o) => !o)}
          style={styles.menuBtn}
          activeOpacity={0.7}
        >
          <Icon name="more-vertical" size={18} color={theme.mutedForeground} />
        </TouchableOpacity>
      )}

      {isOwn && menuOpen && (
        <View style={[styles.menu, { backgroundColor: theme.surface, borderColor: theme.border }, shadow.md]}>
          <MenuItem
            icon="plus-circle"
            label={t("journey.assignCheckpoints")}
            onPress={() => {
              setMenuOpen(false);
              onAssign();
            }}
          />
          <MenuItem
            icon="pencil"
            label={t("journey.edit")}
            onPress={() => {
              setMenuOpen(false);
              onEdit();
            }}
          />
          <MenuItem
            icon="trash"
            label={t("journey.delete")}
            danger
            onPress={() => {
              setMenuOpen(false);
              onDelete();
            }}
          />
        </View>
      )}
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: "plus-circle" | "pencil" | "trash";
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { theme } = useTheme();
  const tint = danger ? colors.accent[500] : theme.foreground;
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Icon name={icon} size={16} color={tint} />
      <Text style={[styles.menuLabel, { color: tint }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ─── Create sheet ───────────────────────────────────────────────────────── */

function CreateJourneySheet({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => Promise<unknown>;
}) {
  const { theme } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const name = title.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createJourney(name, description.trim() || undefined);
      await onDone();
      onClose();
    } catch {
      setError(t("journey.createError"));
      setBusy(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} maxHeightRatio={0.7}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
        <Text style={[styles.sheetTitle, { color: theme.foreground }]}>
          {t("journey.newJourney")}
        </Text>
        <FormInput
          value={title}
          onChangeText={setTitle}
          placeholder={t("journey.journeyNamePlaceholder")}
          autoFocus
        />
        <FormInput
          value={description}
          onChangeText={setDescription}
          placeholder={t("journey.descriptionPlaceholder")}
          multiline
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button
          onPress={submit}
          loading={busy}
          disabled={title.trim() === ""}
          icon={<Icon name="route" size={18} color="#fff" />}
          fullWidth
        >
          {busy ? t("journey.creating") : t("journey.create")}
        </Button>
      </ScrollView>
    </Sheet>
  );
}

/* ─── Edit sheet ─────────────────────────────────────────────────────────── */

function EditJourneySheet({
  journey,
  onClose,
  onDone,
}: {
  journey: Journey;
  onClose: () => void;
  onDone: () => Promise<unknown>;
}) {
  const { theme } = useTheme();
  const [title, setTitle] = useState(journey.title);
  const [description, setDescription] = useState(journey.description ?? "");
  const [isActive, setIsActive] = useState(journey.is_active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const name = title.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateJourney(journey.id, {
        title: name,
        description: description.trim() || undefined,
        is_active: isActive,
      });
      await onDone();
      onClose();
    } catch {
      setError(t("journey.saveError"));
      setBusy(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} maxHeightRatio={0.75}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
        <Text style={[styles.sheetTitle, { color: theme.foreground }]}>
          {t("journey.editJourney")}
        </Text>
        <FormInput
          value={title}
          onChangeText={setTitle}
          placeholder={t("journey.journeyName")}
          autoFocus
        />
        <FormInput
          value={description}
          onChangeText={setDescription}
          placeholder={t("journey.descriptionPlaceholder")}
          multiline
        />
        <TouchableOpacity
          style={[styles.toggleRow, { borderColor: theme.border }]}
          onPress={() => setIsActive((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleLabel, { color: theme.foreground }]}>
            {t("journey.isActive")}
          </Text>
          <View
            style={[
              styles.checkbox,
              {
                borderColor: isActive ? colors.primary[500] : theme.border,
                backgroundColor: isActive ? colors.primary[500] : "transparent",
              },
            ]}
          >
            {isActive && <Icon name="check" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>
        {error && <Text style={styles.error}>{error}</Text>}
        <Button
          onPress={submit}
          loading={busy}
          disabled={title.trim() === ""}
          icon={<Icon name="pencil" size={16} color="#fff" />}
          fullWidth
        >
          {busy ? t("journey.saving") : t("journey.save")}
        </Button>
      </ScrollView>
    </Sheet>
  );
}

/* ─── Delete sheet ───────────────────────────────────────────────────────── */

function DeleteJourneySheet({
  journey,
  onClose,
  onDone,
}: {
  journey: Journey;
  onClose: () => void;
  onDone: () => Promise<unknown>;
}) {
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (deleteCheckpoints: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteJourney(journey.id, deleteCheckpoints);
      await onDone();
      onClose();
    } catch {
      setError(t("journey.deleteError"));
      setBusy(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} maxHeightRatio={0.6}>
      <View style={styles.sheetBody}>
        <Text style={[styles.sheetTitle, { color: theme.foreground }]}>
          {t("journey.deleteJourney")}
        </Text>
        <View style={[styles.warnBox, { backgroundColor: colors.accent[50] }]}>
          <Text style={[styles.warnTitle, { color: colors.accent[600] }]}>
            {t("journey.deleteConfirm", { title: journey.title })}
          </Text>
          <Text style={[styles.warnHint, { color: colors.accent[600] }]}>
            {t("journey.deleteHint")}
          </Text>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        <Button
          variant="outline"
          onPress={() => run(false)}
          disabled={busy}
          icon={<Icon name="route" size={18} color={colors.primary[500]} />}
          fullWidth
        >
          {busy ? t("journey.deleting") : t("journey.detachOnly")}
        </Button>
        <Button
          variant="accent"
          onPress={() => run(true)}
          disabled={busy}
          icon={<Icon name="trash" size={18} color="#fff" />}
          fullWidth
        >
          {t("journey.deleteAll")}
        </Button>
        <Button variant="ghost" onPress={onClose} disabled={busy} fullWidth>
          {t("journey.cancel")}
        </Button>
      </View>
    </Sheet>
  );
}

/* ─── Assign checkpoints sheet ───────────────────────────────────────────── */

function AssignCheckpointsSheet({
  journey,
  onClose,
  onDone,
}: {
  journey: Journey;
  onClose: () => void;
  onDone: () => Promise<unknown>;
}) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: checkpoints = [], isLoading } = useQuery({
    queryKey: ["my-checkpoints", "assign"],
    queryFn: () => getMyCheckpoints(100),
  });

  // Show checkpoints not already in this journey first; allow re-assigning others too.
  const items = useMemo(
    () => checkpoints.filter((cp) => cp.journey_id !== journey.id),
    [checkpoints, journey.id],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const submit = async () => {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await assignCheckpointsToJourney(journey.id, Array.from(selected));
      await onDone();
      onClose();
    } catch {
      setError(t("journey.assignError"));
      setBusy(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} maxHeightRatio={0.85}>
      <View style={[styles.sheetBody, { flex: 1 }]}>
        <Text style={[styles.sheetTitle, { color: theme.foreground }]}>
          {t("journey.assignTitle")}
        </Text>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : items.length === 0 ? (
          <Text style={[styles.emptyHint, { color: theme.mutedForeground, paddingVertical: spacing.xl }]}>
            {t("journey.noCheckpoints")}
          </Text>
        ) : (
          <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
            {items.map((cp) => (
              <CheckpointPickRow
                key={cp.id}
                checkpoint={cp}
                selected={selected.has(cp.id)}
                onToggle={() => toggle(cp.id)}
              />
            ))}
          </ScrollView>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        <Button
          onPress={submit}
          loading={busy}
          disabled={selected.size === 0}
          icon={<Icon name="check" size={18} color="#fff" />}
          fullWidth
        >
          {busy
            ? t("journey.assigning")
            : `${t("journey.assign")} (${t("journey.selectedCount", { count: selected.size })})`}
        </Button>
      </View>
    </Sheet>
  );
}

function CheckpointPickRow({
  checkpoint,
  selected,
  onToggle,
}: {
  checkpoint: Checkpoint;
  selected: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity style={styles.pickRow} onPress={onToggle} activeOpacity={0.7}>
      <View
        style={[
          styles.checkbox,
          {
            borderColor: selected ? colors.primary[500] : theme.border,
            backgroundColor: selected ? colors.primary[500] : "transparent",
          },
        ]}
      >
        {selected && <Icon name="check" size={14} color="#fff" />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.pickName, { color: theme.foreground }]} numberOfLines={1}>
          {checkpoint.name}
        </Text>
        <Text style={[styles.pickMeta, { color: theme.mutedForeground }]} numberOfLines={1}>
          {(checkpoint.address || checkpoint.category) ?? ""}
          {"  ·  +"}
          {checkpoint.xp_awarded} XP
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/* ─── Shared input ───────────────────────────────────────────────────────── */

function FormInput(props: React.ComponentProps<typeof TextInput>) {
  const { theme } = useTheme();
  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.mutedForeground}
      style={[
        styles.input,
        {
          backgroundColor: theme.muted,
          color: theme.foreground,
          borderColor: theme.border,
        },
        props.multiline && styles.inputMultiline,
      ]}
    />
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  heading: { fontSize: 18, fontWeight: "700" },
  iconBtn: {
    height: 36,
    width: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { paddingVertical: spacing.xl, alignItems: "center" },
  empty: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 15, fontWeight: "600" },
  emptyHint: { fontSize: 13, textAlign: "center" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md, minWidth: 0 },
  rowIcon: {
    height: 40,
    width: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 2, flexWrap: "wrap" },
  meta: { fontSize: 12 },
  activeBadge: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.green[50],
  },
  activeText: { fontSize: 11, color: colors.green[700], fontWeight: "600" },
  menuBtn: {
    height: 36,
    width: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
  },
  menu: {
    position: "absolute",
    right: spacing.md,
    top: 52,
    minWidth: 200,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuLabel: { fontSize: 14 },

  sheetBody: { gap: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  sheetTitle: { fontSize: 18, fontWeight: "700", marginBottom: spacing.xs },
  input: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: "top" },
  error: { color: colors.accent[600], fontSize: 13, fontWeight: "500" },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  toggleLabel: { fontSize: 15, fontWeight: "500" },
  checkbox: {
    height: 22,
    width: 22,
    borderRadius: radius.xs,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  warnBox: { borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  warnTitle: { fontSize: 14, fontWeight: "700" },
  warnHint: { fontSize: 13 },

  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pickName: { fontSize: 14, fontWeight: "600" },
  pickMeta: { fontSize: 12, marginTop: 2 },
});
