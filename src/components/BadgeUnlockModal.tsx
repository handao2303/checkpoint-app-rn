/**
 * BadgeUnlockModal — full-screen modal celebrating newly unlocked badges.
 * Ported from web/src/components/BadgeUnlockModal.tsx.
 *
 * Uses Reanimated scale-pop animation with springs.bouncy and
 * react-native-confetti-cannon for the confetti burst.
 * If there are multiple badges, cycles through them one at a time.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Badge } from '../lib/api';
import { BadgeMedal } from './BadgeMedal';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';
import { colors, status } from '../theme/colors';
import { springs } from '../theme/animations';

interface BadgeUnlockModalProps {
  badges: Badge[];
  onDone: () => void;
}

export function BadgeUnlockModal({ badges, onDone }: BadgeUnlockModalProps) {
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const [exiting, setExiting] = useState(false);
  const confettiRef = useRef<ConfettiCannon>(null);

  // Animation values
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(80);

  // Entrance animation on mount + badge change
  useEffect(() => {
    scale.value = 0.4;
    opacity.value = 0;
    translateY.value = 80;

    // Small delay so badge swap is visible
    const t = setTimeout(() => {
      scale.value = withSpring(1, springs.bouncy);
      opacity.value = withTiming(1, { duration: 280 });
      translateY.value = withSpring(0, springs.bouncy);
    }, 60);

    return () => clearTimeout(t);
  }, [idx, scale, opacity, translateY]);

  // Fire confetti on first badge shown
  useEffect(() => {
    const t = setTimeout(() => confettiRef.current?.start(), 300);
    return () => clearTimeout(t);
  }, []);

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  function dismiss() {
    if (exiting) return;
    setExiting(true);
    setTimeout(onDone, 280);
  }

  function advance() {
    if (idx < badges.length - 1) {
      setIdx((i) => i + 1);
    } else {
      dismiss();
    }
  }

  const badge = badges[idx];
  if (!badge) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <View />
      </Pressable>

      {/* Confetti — fires from top center */}
      <View style={styles.confettiContainer} pointerEvents="none">
        <ConfettiCannon
          ref={confettiRef}
          count={80}
          origin={{ x: 200, y: -10 }}
          autoStart={false}
          fadeOut
          colors={['#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#8B5CF6', '#F05A28']}
        />
      </View>

      {/* Bottom sheet */}
      <View style={[styles.sheetOuter, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <Icon name="party" size={14} color={status.gold} />
            <Text style={styles.headerText}>
              HUY HIỆU MỚI{badges.length > 1 ? ` · ${idx + 1}/${badges.length}` : ''}
            </Text>
          </View>

          {/* Animated badge */}
          <Animated.View style={[styles.badgeWrap, badgeAnimStyle]}>
            <BadgeMedal badge={badge} awarded size="lg" showLevel={badge.level} />
          </Animated.View>

          {/* Badge info */}
          <View style={styles.infoBlock}>
            <Text style={styles.badgeName}>{badge.name}</Text>
            <Text style={styles.badgeDesc}>{badge.description}</Text>
          </View>

          {/* Dot indicators */}
          {badges.length > 1 && (
            <View style={styles.dots}>
              {badges.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === idx
                      ? { width: 16, backgroundColor: colors.primary }
                      : { width: 6, backgroundColor: '#EEDFD1' },
                  ]}
                />
              ))}
            </View>
          )}

          {/* CTA */}
          <Button onPress={advance} size="lg" pill>
            {idx < badges.length - 1 ? 'Tiếp theo' : 'Tuyệt vời!'}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
  sheetOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  sheet: {
    backgroundColor: '#FFFDF8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 8,
    alignItems: 'center',
    overflow: 'hidden',
  },
  dragHandle: {
    position: 'absolute',
    top: 10,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EEDFD1',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 24,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: status.gold,
    textTransform: 'uppercase',
  },
  badgeWrap: {
    marginBottom: 20,
    alignItems: 'center',
  },
  infoBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badgeName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2A211C',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDesc: {
    fontSize: 14,
    color: '#7A6B5F',
    textAlign: 'center',
    lineHeight: 20,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
