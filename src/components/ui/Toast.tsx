import React from 'react';
import { View, Text, Pressable } from 'react-native';
import ToastLib, { type ToastConfig } from 'react-native-toast-message';
import { Icon, type IconName } from './Icon';
import { XPToast } from './XPToast';
import { colors, light, status } from '../../theme/colors';

// ─── Variant config ────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

const variantConfig: Record<
  ToastVariant,
  { icon: IconName; borderColor: string; iconBg: string; iconColor: string }
> = {
  success: {
    icon: 'check',
    borderColor: status.success,
    iconBg: `${status.success}1F`, // ~12% opacity
    iconColor: status.success,
  },
  error: {
    icon: 'sad',
    borderColor: status.danger,
    iconBg: `${status.danger}1F`,
    iconColor: status.danger,
  },
  info: {
    icon: 'info',
    borderColor: colors.primary,
    iconBg: `${colors.primary}1F`,
    iconColor: colors.primary,
  },
  warning: {
    icon: 'info',
    borderColor: status.warning,
    iconBg: `${status.warning}1F`,
    iconColor: status.warning,
  },
};

// ─── Custom toast renderers ────────────────────────────────────────────────────

function CheckpointToast({ type, text1, hide }: { type: ToastVariant; text1?: string; hide: () => void }) {
  const v = variantConfig[type];
  return (
    <View
      style={{
        marginHorizontal: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: light.border,
        borderLeftWidth: 4,
        borderLeftColor: v.borderColor,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: v.iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={v.icon} size={16} color={v.iconColor} />
      </View>

      <Text
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: '500',
          color: colors.foreground,
        }}
        numberOfLines={3}
      >
        {text1}
      </Text>

      <Pressable
        onPress={hide}
        hitSlop={8}
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name="x" size={14} color={colors.foregroundMuted} />
      </Pressable>
    </View>
  );
}

// ─── Toast config for react-native-toast-message ──────────────────────────────

export const toastConfig: ToastConfig = {
  success: ({ text1, hide }) => (
    <CheckpointToast type="success" text1={text1} hide={hide} />
  ),
  error: ({ text1, hide }) => (
    <CheckpointToast type="error" text1={text1} hide={hide} />
  ),
  info: ({ text1, hide }) => (
    <CheckpointToast type="info" text1={text1} hide={hide} />
  ),
  warning: ({ text1, hide }) => (
    <CheckpointToast type="warning" text1={text1} hide={hide} />
  ),
  xp: ({ props, hide: _hide }) => <XPToast {...props} onDone={_hide} />,
};

// ─── Root Toast component (place once at root of app) ─────────────────────────

/** Place <Toast /> once at the root of your app (outside navigation). */
export const Toast = () => <ToastLib config={toastConfig} />;

// ─── Imperative helpers ───────────────────────────────────────────────────────

/** Show a standard toast notification. */
export function showToast(
  message: string,
  type: ToastVariant = 'success',
) {
  ToastLib.show({
    type,
    text1: message,
    position: 'top',
    topOffset: 60,
    visibilityTime: 2500,
  });
}

/** Show the animated XP reward toast. */
export function showXPToast(xp: number, level: number, didLevelUp = false) {
  ToastLib.show({
    type: 'xp',
    position: 'bottom',
    visibilityTime: didLevelUp ? 3000 : 2700,
    props: { xp, level, didLevelUp },
  });
}
