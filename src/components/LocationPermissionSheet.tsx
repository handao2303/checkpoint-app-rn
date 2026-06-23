import React from "react";
import { View, Text, StyleSheet, Modal, SafeAreaView, TouchableOpacity, Platform } from "react-native";
import { colors } from "../theme/tokens";
import { Button } from "./ui/Button";

interface LocationPermissionSheetProps {
  visible: boolean;
  onClose: () => void;
  onGranted: (coords: { lat: number; lng: number }) => void;
}

export function LocationPermissionSheet({ visible, onClose, onGranted }: LocationPermissionSheetProps) {
  const handleRequest = async () => {
    try {
      const { getCurrentCoords, requestForegroundPermissions } = await import("../lib/geo");
      const granted = await requestForegroundPermissions();
      if (granted) {
        const coords = await getCurrentCoords();
        onGranted(coords);
      }
    } catch {
      // user denied
    }
  };

  const platformName = Platform.OS === "ios" ? "iOS" : "Android";
  const isPWA = false; // Always native

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.emoji}>📍</Text>
          <Text style={styles.title}>Vị trí của bạn</Text>
          <Text style={styles.desc}>
            Checkpoint cần vị trí của bạn để ghim trên bản đồ và giúp bạn check-in tại các địa điểm.
          </Text>
          <View style={styles.platformHint}>
            <Text style={styles.hintText}>
              {isPWA
                ? `${platformName} PWA: vào Cài đặt > Checkpoint > bật "Vị trí".`
                : `${platformName}: Chạm "Cho phép" khi hệ thống yêu cầu.`}
            </Text>
          </View>
          <Button variant="primary" fullWidth onPress={handleRequest}>
            Bật vị trí
          </Button>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.neutral[500], fontSize: 14 }}>Để sau</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
    paddingBottom: 40,
  },
  emoji: { fontSize: 40, textAlign: "center" },
  title: { fontSize: 18, fontWeight: "700", textAlign: "center", color: colors.neutral[800] },
  desc: { fontSize: 14, color: colors.neutral[600], textAlign: "center", lineHeight: 20 },
  platformHint: {
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    padding: 12,
  },
  hintText: { fontSize: 13, color: colors.neutral[500], lineHeight: 18 },
});
