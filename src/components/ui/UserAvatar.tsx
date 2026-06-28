import React from 'react';
import { Image, View, Text } from 'react-native';
import { Icon } from './Icon';
import { colors } from '../../theme/colors';

interface UserAvatarProps {
  /** Image URL (from Supabase storage or external). */
  url?: string | null;
  /** Display name — used to derive the initial fallback. */
  name?: string | null;
  /** Username — fallback when name is absent. */
  username?: string | null;
  /** Diameter in px. Default 40. */
  size?: number;
  /** Circle (default) or square. */
  shape?: 'circle' | 'square';
}

function avatarInitial(name?: string | null, username?: string | null): string {
  const source = name?.trim() || username?.trim();
  return source?.slice(0, 1).toUpperCase() ?? '';
}

export function UserAvatar({
  url,
  name,
  username,
  size = 40,
  shape = 'circle',
}: UserAvatarProps) {
  const borderRadius = shape === 'circle' ? size / 2 : 8;
  const initial = avatarInitial(name, username);

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{
          width: size,
          height: size,
          borderRadius,
        }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: colors[50],
        borderWidth: 1,
        borderColor: colors[100],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {initial ? (
        <Text
          style={{
            fontSize: size * 0.38,
            fontWeight: '800',
            color: colors.primary,
          }}
        >
          {initial}
        </Text>
      ) : (
        <Icon name="user" size={Math.round(size * 0.45)} color={colors.primary} />
      )}
    </View>
  );
}
