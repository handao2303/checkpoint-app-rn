import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type DimensionValue,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, shadow, spacing, status } from "../../theme/tokens";
import { Icon } from "./Icon";

interface BadgeData {
  key: string;
  name: string;
  icon: string;
  description: string;
  /** Optional badge level — rendered as a pill (parity with web). */
  level?: number;
}

interface BadgeUnlockModalProps {
  visible: boolean;
  badges: BadgeData[];
  onClose: () => void;
}

const CONFETTI: { left: DimensionValue; color: string; delay: number }[] = [
  { left: "12%", color: "#f59e0b", delay: 0 },
  { left: "25%", color: "#10b981", delay: 90 },
  { left: "40%", color: "#ef4444", delay: 40 },
  { left: "55%", color: "#f59e0b", delay: 170 },
  { left: "68%", color: "#3b82f6", delay: 70 },
  { left: "80%", color: "#8b5cf6", delay: 130 },
  { left: "90%", color: "#10b981", delay: 210 },
];

function ConfettiPiece({
  left,
  color,
  delay,
}: {
  left: DimensionValue;
  color: string;
  delay: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1400, easing: Easing.in(Easing.quad) }), -1, false),
    );
    return () => cancelAnimation(progress);
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateY: progress.value * 80 },
      { rotate: `${progress.value * 360}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.confetti, { left, backgroundColor: color }, animatedStyle]} />
  );
}

/**
 * Celebratory full-screen modal for newly unlocked badges — RN parity with web
 * `components/BadgeUnlockModal.tsx`. Shows badge art, title, description, an
 * optional level pill and a confetti burst. Cycles through multiple badges.
 */
export function BadgeUnlockModal({ visible, badges, onClose }: BadgeUnlockModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [idx, setIdx] = useState(0);

  const translateY = useSharedValue(height);
  const backdrop = useSharedValue(0);
  const pop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setIdx(0);
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      backdrop.value = withTiming(1, { duration: 240 });
    } else {
      translateY.value = height;
      backdrop.value = 0;
    }
  }, [visible, height]);

  // Scale-pop whenever the active badge changes.
  useEffect(() => {
    if (!visible) return;
    pop.value = 0;
    pop.value = withDelay(
      80,
      withSequence(
        withTiming(1.12, { duration: 220, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 140 }),
      ),
    );
  }, [idx, visible]);

  function dismiss() {
    translateY.value = withTiming(height, { duration: 220, easing: Easing.in(Easing.cubic) });
    backdrop.value = withTiming(0, { duration: 180 });
    setTimeout(onClose, 220);
  }

  function advance() {
    if (idx < badges.length - 1) {
      setIdx((i) => i + 1);
    } else {
      dismiss();
    }
  }

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const badge = badges[idx];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>

        {badge ? (
          <Animated.View
            style={[
              styles.sheet,
              shadow.lg,
              {
                backgroundColor: theme.surface,
                paddingBottom: insets.bottom + spacing.xl,
              },
              sheetStyle,
            ]}
          >
            {/* Confetti burst */}
            <View style={styles.confettiLayer} pointerEvents="none">
              {CONFETTI.map((c, i) => (
                <ConfettiPiece key={i} left={c.left} color={c.color} delay={c.delay} />
              ))}
            </View>

            <View style={[styles.handle, { backgroundColor: theme.border }]} />

            <View style={styles.headerRow}>
              <Icon name="party" size={14} color={status.gold} />
              <Text style={[styles.headerText, { color: status.gold }]}>
                {badges.length > 1 ? `${badge.name} · ${idx + 1}/${badges.length}` : badge.name}
              </Text>
            </View>

            {/* Badge art with scale-pop + glow ring */}
            <View style={styles.badgeWrap}>
              <Animated.View style={[styles.badgeGlow, { backgroundColor: status.gold }, popStyle]}>
                <Text style={styles.badgeIcon}>{badge.icon || "🏅"}</Text>
              </Animated.View>
            </View>

            <Text style={[styles.title, { color: theme.foreground }]}>{badge.name}</Text>
            <Text style={[styles.desc, { color: theme.mutedForeground }]}>{badge.description}</Text>

            {badge.level != null ? (
              <View style={[styles.levelPill, { backgroundColor: theme.muted }]}>
                <Text style={[styles.levelText, { color: theme.mutedForeground }]}>
                  {`Cấp ${badge.level}`}
                </Text>
              </View>
            ) : null}

            {/* Dot indicators */}
            {badges.length > 1 ? (
              <View style={styles.dots}>
                {badges.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === idx
                        ? { width: 16, backgroundColor: theme.primary }
                        : { width: 6, backgroundColor: theme.border },
                    ]}
                  />
                ))}
              </View>
            ) : null}

            <Pressable
              style={[styles.cta, { backgroundColor: theme.primary }, shadow.cta]}
              onPress={advance}
            >
              <Text style={styles.ctaText}>
                {idx < badges.length - 1 ? "Tiếp theo" : "Tuyệt vời!"}
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    paddingHorizontal: spacing.xl,
    paddingTop: 36,
    alignItems: "center",
    overflow: "hidden",
  },
  confettiLayer: { position: "absolute", top: 0, left: 0, right: 0, height: 90 },
  confetti: { position: "absolute", top: 8, width: 8, height: 8, borderRadius: 2 },
  handle: { position: "absolute", top: 12, width: 44, height: 5, borderRadius: 999 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xl },
  headerText: { fontSize: 12, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  badgeWrap: { marginBottom: spacing.lg },
  badgeGlow: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: status.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 10,
  },
  badgeIcon: { fontSize: 52 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  desc: { fontSize: 14, textAlign: "center", marginTop: 4, paddingHorizontal: spacing.md },
  levelPill: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: 999,
  },
  levelText: { fontSize: 12, fontWeight: "600" },
  dots: { flexDirection: "row", gap: 6, marginTop: spacing.lg },
  dot: { height: 6, borderRadius: 999 },
  cta: {
    marginTop: spacing.xl,
    width: "100%",
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
