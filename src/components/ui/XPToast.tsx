import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";

interface XPToastProps {
  xp: number;
  level?: number;
  didLevelUp?: boolean;
  onDone: () => void;
}

export function XPToast({ xp, level, didLevelUp, onDone }: XPToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 50, duration: 300, useNativeDriver: true }),
      ]).start(() => onDone());
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.xpText}>+{xp} XP</Text>
        {didLevelUp && level && (
          <Text style={styles.levelText}>🎉 Level {level}!</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  content: {
    backgroundColor: colors.green[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    alignItems: "center",
  },
  xpText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  levelText: { color: "#fff", fontSize: 14, marginTop: 2 },
});
