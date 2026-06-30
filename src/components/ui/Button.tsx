import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../../theme/colors';

type Variant = 'primary' | 'accent' | 'green' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

// Padding / radius per size — mirrors the web Tailwind scale
// (px-4/py-2, px-5/py-3, px-6/py-4 and rounded-lg/xl/2xl).
const SIZE_PADDING: Record<Size, { paddingHorizontal: number; paddingVertical: number }> = {
  sm: { paddingHorizontal: 16, paddingVertical: 8 },
  md: { paddingHorizontal: 20, paddingVertical: 12 },
  lg: { paddingHorizontal: 24, paddingVertical: 16 },
};
const SIZE_RADIUS: Record<Size, number> = { sm: 8, md: 12, lg: 16 };

// Layout for the gradient surface. Applied via `style` (NOT className) because
// NativeWind does not process className on the third-party LinearGradient.
function gradientLayout(size: Size, pill: boolean, loading: boolean): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...SIZE_PADDING[size],
    borderRadius: pill ? 999 : SIZE_RADIUS[size],
    opacity: loading ? 0.6 : 1,
  };
}

interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: Variant;
  size?: Size;
  /** Pill (fully rounded) — default for primary CTAs. */
  pill?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  green: 'bg-green-600',
  outline: 'border border-primary/45 bg-surface',
  ghost: 'bg-transparent',
};

const variantTextStyles: Record<Variant, string> = {
  primary: 'text-white font-display font-extrabold',
  accent: 'text-white font-display font-extrabold',
  green: 'text-white font-display font-extrabold',
  outline: 'text-primary font-display font-extrabold',
  ghost: 'text-foreground font-body',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-4 py-2 rounded-lg',
  md: 'px-5 py-3 rounded-xl',
  lg: 'px-6 py-4 rounded-2xl',
};

const sizeTextStyles: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  pill = false,
  loading = false,
  disabled = false,
  icon,
  onPress,
  className = '',
  ...rest
}: ButtonProps) {
  const rounded = pill ? 'rounded-full' : '';
  const sizeClass = sizeStyles[size];
  // Remove the rounded part from sizeClass when pill is true
  const baseSize = pill
    ? sizeClass.replace(/rounded-\w+/, '').trim()
    : sizeClass;

  const disabledClass = disabled || loading ? 'opacity-60' : '';

  if (variant === 'primary' && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        className={className}
        {...rest}
      >
        <LinearGradient
          colors={[...gradients.primaryCTA]}
          start={[0, 0]}
          end={[1, 1]}
          style={gradientLayout(size, pill, loading)}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              {icon}
              {typeof children === 'string' ? (
                <Text className={`${variantTextStyles[variant]} ${sizeTextStyles[size]}`}>
                  {children}
                </Text>
              ) : (
                children
              )}
            </>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`items-center justify-center flex-row gap-2 ${variantStyles[variant]} ${baseSize} ${rounded} ${disabledClass} ${className}`.trim()}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? undefined : 'white'} />
      ) : (
        <>
          {icon}
          {typeof children === 'string' ? (
            <Text className={`${variantTextStyles[variant]} ${sizeTextStyles[size]}`}>
              {children}
            </Text>
          ) : (
            children
          )}
        </>
      )}
    </Pressable>
  );
}
