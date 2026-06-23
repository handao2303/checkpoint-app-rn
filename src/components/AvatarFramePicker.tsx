import React from "react";
import { ScrollView, Pressable, View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "./ui/Icon";
import { UserAvatar } from "./ui/UserAvatar";
import { t } from "../lib/i18n";
import type { AvatarFrame } from "../lib/avatarFrames";

export interface FrameOption {
  frame: AvatarFrame;
  unlocked: boolean;
}

// The frame SVG's avatar hole (viewBox 220): center (110,104), radius ~65.
// Positions a sample disc behind the frame art in each thumbnail.
const THUMB = 64;
const HOLE_SIZE = THUMB * 0.59;
const HOLE_CENTER_Y = 0.473; // 104 / 220

function FrameThumb({
  frame,
  avatarUrl,
}: {
  frame: AvatarFrame | null;
  avatarUrl?: string;
}) {
  return (
    <View style={{ width: THUMB, height: THUMB }}>
      <View
        style={[
          styles.disc,
          {
            left: (THUMB - HOLE_SIZE) / 2,
            top: THUMB * HOLE_CENTER_Y - HOLE_SIZE / 2,
            width: HOLE_SIZE,
            height: HOLE_SIZE,
            borderRadius: HOLE_SIZE / 2,
          },
        ]}
      >
        <UserAvatar url={avatarUrl} size={HOLE_SIZE} />
      </View>
      {frame ? (
        <Image
          source={{ uri: frame.file }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          pointerEvents="none"
        />
      ) : null}
    </View>
  );
}

/**
 * Horizontal strip of avatar frames — parity with web AvatarFramePicker.
 * The first chip is "no frame"; locked frames show a lock overlay and can't be
 * selected. Calls `onSelect(frameId | null)`.
 */
export function AvatarFramePicker({
  options,
  selectedId,
  onSelect,
  avatarUrl,
}: {
  options: FrameOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  avatarUrl?: string;
}) {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {/* None */}
      <Pressable
        onPress={() => onSelect(null)}
        style={styles.cell}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedId === null }}
      >
        <View
          style={[
            styles.noneRing,
            { borderColor: selectedId === null ? theme.primary : theme.border },
          ]}
        >
          <View style={[styles.noneDisc, { backgroundColor: theme.muted }]}>
            <UserAvatar url={avatarUrl} size={THUMB * 0.59} />
          </View>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.label, { color: theme.mutedForeground }]}
        >
          {t("profile.frames.none")}
        </Text>
      </Pressable>

      {options.map(({ frame, unlocked }) => {
        const selected = selectedId === frame.id;
        return (
          <Pressable
            key={frame.id}
            disabled={!unlocked}
            onPress={() => onSelect(frame.id)}
            style={styles.cell}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: !unlocked }}
          >
            <View
              style={[
                styles.thumbRing,
                { borderColor: selected ? theme.primary : "transparent" },
              ]}
            >
              <View style={!unlocked ? styles.locked : undefined}>
                <FrameThumb frame={frame} avatarUrl={avatarUrl} />
              </View>
              {!unlocked ? (
                <View style={styles.lockOverlay} pointerEvents="none">
                  <Icon name="lock" size={16} color={theme.mutedForeground} />
                </View>
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                selected
                  ? { color: theme.primary, fontWeight: "600" }
                  : { color: theme.mutedForeground },
              ]}
            >
              {t(frame.labelKey, frame.labelParams)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, paddingBottom: 8, paddingHorizontal: 2 },
  cell: { alignItems: "center", gap: 4, width: THUMB },
  disc: { position: "absolute", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  noneRing: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  noneDisc: {
    width: THUMB * 0.59,
    height: THUMB * 0.59,
    borderRadius: (THUMB * 0.59) / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbRing: {
    borderRadius: THUMB / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  locked: { opacity: 0.4 },
  lockOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  label: { width: THUMB, textAlign: "center", fontSize: 10 },
});
