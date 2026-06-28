import React from 'react';
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children?: React.ReactNode;
  className?: string;
}

/** A themed card container with rounded corners, border, and shadow. */
export function Card({ children, className = '', style, ...props }: CardProps) {
  return (
    <View
      className={`rounded-xl border border-border bg-surface p-4 shadow-card ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}

/** A soft image placeholder used in place of real photos in this scaffold. */
export function ImagePlaceholder({
  label,
  className = '',
}: {
  className?: string;
  label?: React.ReactNode;
}) {
  return (
    <View
      className={`items-center justify-center rounded-lg border border-border bg-surface-muted ${className}`.trim()}
    >
      {label}
    </View>
  );
}
