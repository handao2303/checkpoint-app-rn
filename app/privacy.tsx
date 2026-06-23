import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../src/theme/tokens";

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.body}>
        This app uses location data to mark check-in locations on the map. Location data is only collected when you actively create a check-in.

        Photos you upload are stored securely on our servers. You can delete your check-ins and associated photos at any time.

        We use Firebase for analytics and crash reporting. No personal data is shared with third parties for marketing purposes.

        For questions, contact: privacy@checkpoint-app.space
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16, color: colors.neutral[800] },
  body: { fontSize: 15, color: colors.neutral[600], lineHeight: 24 },
});
