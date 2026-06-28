import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

/** A theme-aware pulsing placeholder block. Compose with className for sizing. */
export function Skeleton({ className = '' }: { className?: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.4, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className={`bg-surface-muted rounded-lg ${className}`.trim()}
    />
  );
}

/** Shared loading state for place/checkpoint detail sheets. */
export function DetailSheetSkeleton() {
  return (
    <Animated.View className="flex flex-col gap-3">
      <Animated.View className="flex flex-row gap-2 overflow-hidden">
        <Skeleton className="h-44 w-60 rounded-lg" />
        <Skeleton className="h-44 w-60 rounded-lg" />
      </Animated.View>
      <Animated.View className="flex flex-row items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-40" />
      </Animated.View>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Animated.View className="flex flex-row items-center gap-2">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </Animated.View>
    </Animated.View>
  );
}
