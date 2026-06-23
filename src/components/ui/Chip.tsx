import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";

type Tone = "green" | "primary" | "neutral";

interface ChipProps {
  children: React.ReactNode;
  tone?: Tone;
  icon?: string;
}

export function Chip({ children, tone = "neutral", icon }: ChipProps) {
  return (
    <View style={[styles.chip, styles[`tone_${tone}`]]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[styles.text, styles[`text_${tone}`]]}>{children}</Text>
    </View>
  );
}

export function XPBadge({ xp }: { xp: number }) {
  return (
    <View style={styles.xpBadge}>
      <Text style={styles.xpText}>+{xp} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tone_green: { backgroundColor: colors.green[50] },
  tone_primary: { backgroundColor: colors.primary[50] },
  tone_neutral: { backgroundColor: colors.neutral[100] },
  icon: { fontSize: 12 },
  text: { fontSize: 12, fontWeight: "500" },
  text_green: { color: colors.green[700] },
  text_primary: { color: colors.primary[600] },
  text_neutral: { color: colors.neutral[600] },
  xpBadge: {
    backgroundColor: colors.green[500],
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  xpText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
