import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  ActivityIndicator,
} from "react-native";
import { colors } from "../../theme/tokens";

type Variant = "primary" | "accent" | "green" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  onPress,
  disabled,
  loading,
  icon,
  children,
  style,
  fullWidth,
}: ButtonProps) {
  const btnStyle: ViewStyle = {
    ...styles.base,
    ...styles[variant],
    ...styles[`size_${size}` as keyof typeof styles],
    ...(fullWidth ? styles.fullWidth : {}),
    ...(disabled ? styles.disabled : {}),
    ...style,
  };

  const textStyle: TextStyle = {
    ...styles.text,
    ...(styles[`text_${variant}` as keyof typeof styles] as TextStyle),
    ...(styles[`textSize_${size}` as keyof typeof styles] as TextStyle),
    ...(disabled ? styles.textDisabled : {}),
  };

  return (
    <TouchableOpacity style={btnStyle} onPress={onPress} disabled={disabled || loading} activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator color={variant === "outline" || variant === "ghost" ? colors.primary[500] : "#fff"} size="small" />
      ) : (
        <>
          {icon}
          {children ? <Text style={textStyle}>{children}</Text> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    gap: 6,
  },
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.5 },
  primary: { backgroundColor: colors.primary[500] },
  accent: { backgroundColor: colors.accent[500] },
  green: { backgroundColor: colors.green[500] },
  outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.primary[500] },
  ghost: { backgroundColor: "transparent" },
  size_sm: { paddingHorizontal: 12, paddingVertical: 6, minHeight: 32 },
  size_md: { paddingHorizontal: 16, paddingVertical: 10, minHeight: 40 },
  size_lg: { paddingHorizontal: 20, paddingVertical: 14, minHeight: 48 },
  text: { fontWeight: "600", textAlign: "center" as const },
  text_primary: { color: "#fff" },
  text_accent: { color: "#fff" },
  text_green: { color: "#fff" },
  text_outline: { color: colors.primary[500] },
  text_ghost: { color: colors.primary[500] },
  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 17 },
  textDisabled: { opacity: 0.7 },
});
