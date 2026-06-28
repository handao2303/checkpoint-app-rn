import React from 'react';
import { View, Text } from 'react-native';

type Tone = 'green' | 'primary' | 'neutral';

const toneBg: Record<Tone, string> = {
  green: 'bg-green-50 border border-green-100',
  primary: 'bg-primary-50 border border-primary-100',
  neutral: 'bg-surface-muted border border-border',
};

const toneText: Record<Tone, string> = {
  green: 'text-green-700',
  primary: 'text-primary-700',
  neutral: 'text-muted-foreground',
};

interface ChipProps {
  /** Label text. */
  label?: string;
  /** Children (text node) — alternative to label prop. */
  children?: React.ReactNode;
  tone?: Tone;
  /** Optional icon rendered before the label. */
  icon?: React.ReactNode;
  className?: string;
}

export function Chip({
  label,
  children,
  tone = 'green',
  icon,
  className = '',
}: ChipProps) {
  const content = label ?? children;
  return (
    <View
      className={`flex-row items-center gap-1 rounded-full px-3 py-1 ${toneBg[tone]} ${className}`.trim()}
    >
      {icon}
      <Text className={`text-sm font-semibold ${toneText[tone]}`}>{content}</Text>
    </View>
  );
}

/** Small XP reward badge — e.g. "+50 XP". */
export function XPBadge({ xp }: { xp: number }) {
  return (
    <View className="flex-row items-center rounded-full border border-green-600 bg-green-400 px-2 py-0.5">
      <Text className="text-xs font-bold text-white">+{xp} XP</Text>
    </View>
  );
}
