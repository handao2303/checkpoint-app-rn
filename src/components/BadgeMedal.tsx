/**
 * BadgeMedal — a rounded-square badge medallion.
 * Ported from web/src/components/BadgeMedal.tsx.
 *
 * Web uses a CSS clip-path hexagon which is not available in React Native.
 * We use a rounded square (borderRadius 12) with a coloured background instead.
 * Awarded badges with artwork show the badge image; others show a colour disc
 * with a white glyph or a muted disc with a lock icon for locked badges.
 */
import React, { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { Icon, type IconName } from './ui/Icon';
import type { Badge } from '../lib/api';

// Palette tokens matching the backend badge catalog
const PALETTES: Record<string, { bg: string; border: string; icon: string }> = {
  green:   { bg: '#2F8A52', border: '#6FB97C', icon: '#FFFFFF' },
  orange:  { bg: '#F05A28', border: '#FF9A70', icon: '#FFFFFF' },
  gold:    { bg: '#E0A73A', border: '#F5C96A', icon: '#FFFFFF' },
  clay:    { bg: '#B23A1F', border: '#CF7B5F', icon: '#FFFFFF' },
  amber:   { bg: '#D97706', border: '#FCD34D', icon: '#FFFFFF' },
  emerald: { bg: '#059669', border: '#6EE7B7', icon: '#FFFFFF' },
};

const MUTED = { bg: '#F7EDE2', border: '#EEDFD1', icon: '#B8A99B' };

// Designed badge artwork URLs
const BADGE_ART: Record<string, string> = {
  first_checkin:     'https://storage.googleapis.com/checkpoint-app-prod/badges/badge_01.webp',
  explorer_10:       'https://storage.googleapis.com/checkpoint-app-prod/badges/badge_02.webp',
  provinces_5:       'https://storage.googleapis.com/checkpoint-app-prod/badges/badge_03.webp',
  night_owl:         'https://storage.googleapis.com/checkpoint-app-prod/badges/badge_04.webp',
  journey_starter:   'https://storage.googleapis.com/checkpoint-app-prod/badges/badge_05.webp',
  coffee_hunter:     'https://storage.googleapis.com/checkpoint-app-prod/badges/badge_06.webp',
  social_scout:      'https://storage.googleapis.com/checkpoint-app-prod/badges/badge_07.webp',
  city_collector:    'https://storage.googleapis.com/checkpoint-app-prod/badges/badge_08.webp',
  weekend_wanderer:  'https://storage.googleapis.com/checkpoint-app-prod/badges/badge_09.webp',
  photo_storyteller: 'https://storage.googleapis.com/checkpoint-app-prod/badges/badge_10.webp',
  hidden_gem_finder: 'https://storage.googleapis.com/checkpoint-app-prod/badges/badge_11.webp',
  passport_pro:      'https://storage.googleapis.com/checkpoint-app-prod/badges/badge_12.webp',
};

const SIZES = {
  sm: { box: 40, icon: 16, radius: 10, borderWidth: 2 },
  md: { box: 56, icon: 24, radius: 12, borderWidth: 2 },
  lg: { box: 80, icon: 34, radius: 16, borderWidth: 3 },
} as const;

interface BadgeMedalProps {
  badge: Pick<Badge, 'icon' | 'color' | 'key'>;
  awarded?: boolean;
  size?: keyof typeof SIZES;
  showLevel?: number;
  style?: object;
}

export function BadgeMedal({
  badge,
  awarded = true,
  size = 'md',
  showLevel,
  style,
}: BadgeMedalProps) {
  const { box, icon, radius, borderWidth } = SIZES[size];
  const palette = PALETTES[badge.color] ?? PALETTES.gold;
  const art = awarded ? BADGE_ART[badge.key] : undefined;
  const [artLoaded, setArtLoaded] = useState(false);

  return (
    <View style={[{ alignItems: 'center', gap: 4 }, style]}>
      {art ? (
        <View
          style={{
            width: box,
            height: box,
            borderRadius: radius,
            overflow: 'hidden',
            borderWidth,
            borderColor: palette.border,
          }}
        >
          {!artLoaded && (
            <View
              style={{
                position: 'absolute',
                inset: 0,
                width: box,
                height: box,
                backgroundColor: '#F7EDE2',
              }}
            />
          )}
          <Image
            source={{ uri: art }}
            style={{ width: box - borderWidth * 2, height: box - borderWidth * 2 }}
            resizeMode="cover"
            onLoad={() => setArtLoaded(true)}
          />
        </View>
      ) : (
        <View
          style={{
            width: box,
            height: box,
            borderRadius: radius,
            borderWidth,
            borderColor: awarded ? palette.border : MUTED.border,
            backgroundColor: awarded ? palette.bg : MUTED.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            name={((awarded ? badge.icon : 'lock') as IconName) || 'award'}
            size={icon}
            color={awarded ? palette.icon : MUTED.icon}
          />
        </View>
      )}
      {showLevel != null && (
        <View
          style={{
            backgroundColor: '#F7EDE2',
            borderRadius: 99,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#7A6B5F' }}>
            Cấp {showLevel}
          </Text>
        </View>
      )}
    </View>
  );
}
