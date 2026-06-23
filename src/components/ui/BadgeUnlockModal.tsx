import React, { useEffect, useRef } from "react";
import { View, Text, Modal, Animated, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../../theme/tokens";

interface BadgeData {
  key: string;
  name: string;
  icon: string;
  description: string;
}

interface BadgeUnlockModalProps {
  visible: boolean;
  badges: BadgeData[];
  onClose: () => void;
}

export function BadgeUnlockModal({ visible, badges, onClose }: BadgeUnlockModalProps) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    } else {
      scale.setValue(0);
    }
  }, [visible, scale]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modal, { transform: [{ scale }] }]}>
          <Text style={styles.emoji}>🏅</Text>
          <Text style={styles.title}>Mở khóa huy hiệu!</Text>
          {badges.map((badge) => (
            <View key={badge.key} style={styles.badgeRow}>
              <Text style={styles.badgeIcon}>{badge.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Tuyệt vời!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  modal: {
    width: "100%",
    backgroundColor: colors.neutral[0],
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: "700", color: colors.neutral[800] },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 12,
    width: "100%",
  },
  badgeIcon: { fontSize: 28 },
  badgeName: { fontSize: 15, fontWeight: "600", color: colors.neutral[800] },
  badgeDesc: { fontSize: 12, color: colors.neutral[500] },
  closeBtn: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 8,
  },
  closeText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
