import React, { useEffect } from "react";
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, shadow } from "../../theme/tokens";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Cap height to a fraction of the screen (0–1). Default 0.9. */
  maxHeightRatio?: number;
  /** Show the grab handle. Default true. */
  showHandle?: boolean;
}

/**
 * Bottom-sheet primitive — parity with web `components/ui/Sheet.tsx`.
 * Slide-up entrance, dimmed backdrop, drag-down-to-dismiss handle.
 */
export function Sheet({
  visible,
  onClose,
  children,
  maxHeightRatio = 0.9,
  showHandle = true,
}: SheetProps) {
  const { theme } = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(height);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
      backdrop.value = withTiming(1, { duration: 220 });
    } else {
      translateY.value = withTiming(height, { duration: 220 });
      backdrop.value = withTiming(0, { duration: 180 });
    }
  }, [visible, height]);

  const dismiss = () => {
    translateY.value = withTiming(height, { duration: 200 }, (done) => {
      if (done) runOnJS(onClose)();
    });
    backdrop.value = withTiming(0, { duration: 180 });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) {
        translateY.value = withTiming(height, { duration: 200 }, (done) => {
          if (done) runOnJS(onClose)();
        });
        backdrop.value = withTiming(0, { duration: 180 });
      } else {
        translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            shadow.lg,
            {
              backgroundColor: theme.surface,
              maxHeight: height * maxHeightRatio,
              paddingBottom: insets.bottom + 12,
            },
            sheetStyle,
          ]}
        >
          {showHandle ? (
            <GestureDetector gesture={pan}>
              <View style={styles.handleZone}>
                <View style={[styles.handle, { backgroundColor: theme.border }]} />
              </View>
            </GestureDetector>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    paddingHorizontal: 16,
  },
  handleZone: { alignItems: "center", paddingVertical: 10 },
  handle: { width: 44, height: 5, borderRadius: 999 },
});
