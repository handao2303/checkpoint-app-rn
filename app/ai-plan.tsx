import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../src/theme/tokens";

export default function AIPlanScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>✨</Text>
      <Text style={{ fontSize: 18, fontWeight: "600", color: colors.neutral[700] }}>AI Plan</Text>
      <Text style={{ fontSize: 14, color: colors.neutral[500], marginTop: 8 }}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
});
