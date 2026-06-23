import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../src/theme/tokens";

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Terms of Service</Text>
      <Text style={styles.body}>
        By using Checkpoint, you agree to:

        1. You are responsible for the content you post, including photos and location data.
        2. You must not post inappropriate, harmful, or illegal content.
        3. We reserve the right to remove content that violates these terms.
        4. Your account can be terminated for repeated violations.
        5. Location data is used solely for the check-in feature.
        6. We may update these terms; continued use constitutes acceptance.

        Last updated: June 2026
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16, color: colors.neutral[800] },
  body: { fontSize: 15, color: colors.neutral[600], lineHeight: 24 },
});
