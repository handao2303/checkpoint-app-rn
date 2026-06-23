import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { colors } from "../theme/tokens";

export function MapSkeleton() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <View style={styles.container}>
      {/* Fake map tiles */}
      <Animated.View style={[styles.tile, { opacity: pulse }]} />
      <Animated.View style={[styles.tile, styles.tileRight, { opacity: pulse }]} />
      <Animated.View style={[styles.tile, styles.tileBottom, { opacity: pulse }]} />
      <Animated.View style={[styles.tile, styles.tileBottomRight, { opacity: pulse }]} />

      {/* Fake marker */}
      <Animated.View style={[styles.marker, { opacity: Animated.add(pulse, 0.3) }]}>
        <View style={styles.markerDot} />
      </Animated.View>

      {/* Bottom bar skeleton */}
      <View style={styles.bottomBar}>
        <View style={styles.btnSkeleton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    position: "relative",
    overflow: "hidden",
  },
  tile: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "50%",
    height: "50%",
    backgroundColor: colors.neutral[200],
  },
  tileRight: { left: "50%" },
  tileBottom: { top: "50%" },
  tileBottomRight: { left: "50%", top: "50%" },
  marker: {
    position: "absolute",
    top: "40%",
    left: "50%",
    marginLeft: -16,
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[300],
    alignItems: "center",
    justifyContent: "center",
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary[500],
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  btnSkeleton: {
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.neutral[200],
  },
});
