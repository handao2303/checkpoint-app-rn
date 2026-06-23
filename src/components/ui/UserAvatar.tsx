import React from "react";
import { Image, View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";

interface UserAvatarProps {
  url?: string | null;
  name?: string;
  size?: number;
}

export function UserAvatar({ url, name, size = 40 }: UserAvatarProps) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  const initial = (name ?? "?")[0].toUpperCase();
  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.neutral[100] },
  placeholder: {
    backgroundColor: colors.primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: colors.primary[600],
    fontWeight: "700",
  },
});
