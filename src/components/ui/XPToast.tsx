import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  withSpring,
  withRepeat,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { Icon } from './Icon';
import { colors, green, primary } from '../../theme/colors';

interface XPToastProps {
  xp: number;
  level: number;
  didLevelUp?: boolean;
  onDone: () => void;
}

/** Animated XP reward toast — pops up from the bottom with a soft burst. */
export function XPToast({ xp, level, didLevelUp = false, onDone }: XPToastProps) {
  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const coinScale = useSharedValue(1);

  // Sparkle shared values
  const spark1Opacity = useSharedValue(0);
  const spark2Opacity = useSharedValue(0);
  const spark3Opacity = useSharedValue(0);
  const spark4Opacity = useSharedValue(0);

  const dismiss = () => {
    'worklet';
    translateY.value = withTiming(120, { duration: 300 });
    opacity.value = withTiming(0, { duration: 280 }, (finished) => {
      if (finished) {
        runOnJS(onDone)();
      }
    });
  };

  useEffect(() => {
    // Entry animation
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 14, stiffness: 260 });

    // Coin pop
    if (didLevelUp) {
      coinScale.value = withSequence(
        withSpring(1.25, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 }),
      );
    }

    // Sparkle pulse
    const sparks = [spark1Opacity, spark2Opacity, spark3Opacity, spark4Opacity];
    sparks.forEach((s, i) => {
      s.value = withSequence(
        withTiming(0, { duration: i * 80 }),
        withRepeat(
          withSequence(
            withTiming(1, { duration: 200 }),
            withTiming(0, { duration: 400 }),
          ),
          3,
          false,
        ),
      );
    });

    // Auto-dismiss
    const delay = didLevelUp ? 3000 : 2700;
    const timer = setTimeout(() => {
      dismiss();
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinScale.value }],
  }));

  const s1Style = useAnimatedStyle(() => ({ opacity: spark1Opacity.value }));
  const s2Style = useAnimatedStyle(() => ({ opacity: spark2Opacity.value }));
  const s3Style = useAnimatedStyle(() => ({ opacity: spark3Opacity.value }));
  const s4Style = useAnimatedStyle(() => ({ opacity: spark4Opacity.value }));

  const sparkStyles = [s1Style, s2Style, s3Style, s4Style];

  // Theme tones
  const tone = didLevelUp
    ? {
        shellBg: '#FEF3C7',
        shellBorder: '#FDE68A',
        coinFrom: '#F59E0B',
        coinTo: '#EA580C',
        sparkleColor: '#FCD34D',
        labelColor: '#92400E',
        chipBg: '#FEF3C7',
        chipBorder: '#FDE68A',
        chipText: '#78350F',
      }
    : {
        shellBg: primary[50],
        shellBorder: primary[100],
        coinFrom: primary[500],
        coinTo: green[500],
        sparkleColor: primary[300],
        labelColor: primary[700],
        chipBg: primary[50],
        chipBorder: primary[100],
        chipText: primary[700],
      };

  // Sparkle positions (absolute offset from container edges)
  const sparklePositions = [
    { top: 12, left: 16, size: 6 },
    { top: 16, right: 24, size: 8 },
    { bottom: 16, left: 52, size: 4 },
    { bottom: 20, right: 48, size: 6 },
  ];

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: 'center',
          paddingBottom: 88,
          paddingHorizontal: 16,
          zIndex: 7000,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => dismiss()}
        style={{ width: '75%', maxWidth: 360 }}
      >
        <View
          style={{
            backgroundColor: tone.shellBg,
            borderColor: tone.shellBorder,
            borderWidth: 1,
            borderRadius: 24,
            paddingHorizontal: 16,
            paddingVertical: 12,
            overflow: 'hidden',
            shadowColor: tone.coinFrom,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          {/* Sparkle particles */}
          {sparklePositions.map((pos, i) => (
            <Animated.View
              key={i}
              style={[
                sparkStyles[i],
                {
                  position: 'absolute',
                  width: pos.size,
                  height: pos.size,
                  borderRadius: pos.size / 2,
                  backgroundColor: tone.sparkleColor,
                  top: pos.top ?? undefined,
                  bottom: (pos as { bottom?: number }).bottom ?? undefined,
                  left: (pos as { left?: number }).left ?? undefined,
                  right: (pos as { right?: number }).right ?? undefined,
                },
              ]}
            />
          ))}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Coin */}
            <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View
                style={[
                  coinStyle,
                  {
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: tone.coinFrom,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: tone.coinFrom,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 6,
                  },
                ]}
              >
                <Icon name="xp-coin" size={34} color="#FFFFFF" />
              </Animated.View>
            </View>

            {/* Text */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="sparkles" size={14} color={tone.labelColor} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '900',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: tone.labelColor,
                  }}
                >
                  {didLevelUp ? `Level ${level}` : 'XP'}
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 30,
                  fontWeight: '900',
                  lineHeight: 34,
                  color: colors.foreground,
                  marginTop: 2,
                }}
              >
                +{xp} XP
              </Text>

              <View
                style={{
                  marginTop: 4,
                  alignSelf: 'flex-start',
                  backgroundColor: tone.chipBg,
                  borderColor: tone.chipBorder,
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: tone.chipText,
                  }}
                >
                  Level {level}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
