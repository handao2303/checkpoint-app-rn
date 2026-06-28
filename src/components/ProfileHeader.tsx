/**
 * ProfileHeader — avatar, display name, username, bio, level badge, XP bar,
 * stats (checkpoints, journeys, followers, following), and checkin streak.
 *
 * Ported from web/src/components/ProfileHeader.tsx and
 * web/src/components/ProfileHeroCard.tsx (level card merged in).
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { User } from '../lib/api';
import { Icon } from './ui/Icon';
import { UserAvatar } from './ui/UserAvatar';
import { colors, gradients, status } from '../theme/colors';

// ---- helpers ----------------------------------------------------------------

function avatarBorderColor(level: number): string {
  if (level >= 16) return '#FACC15'; // yellow-400
  if (level >= 6) return '#FDA4AF';  // orange-300 ish
  return '#EEDFD1';                  // neutral border
}

function formatMemberSince(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${month}/${d.getFullYear()}`;
}

// ---- sub-components ---------------------------------------------------------

interface StatPillProps {
  value: string | number;
  label: string;
}
function StatPill({ value, label }: StatPillProps) {
  return (
    <View className="flex-1 items-center">
      <Text className="font-display text-lg font-extrabold text-foreground">{value}</Text>
      <Text className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </Text>
    </View>
  );
}

// ---- public props -----------------------------------------------------------

export interface ProfileHeaderProps {
  user: User;
  /** Callback for edit button (own profile only). */
  onEdit?: () => void;
  /** Callback for settings button (own profile only). */
  onSettings?: () => void;
}

// ---- component --------------------------------------------------------------

export function ProfileHeader({ user, onEdit, onSettings }: ProfileHeaderProps) {
  const xpPercent = Math.round(Math.min(1, Math.max(0, user.level_progress)) * 100);

  return (
    <View className="bg-surface rounded-2xl border border-border p-4 gap-4">
      {/* Top row: avatar + name block + action buttons */}
      <View className="flex-row items-start gap-3">
        {/* Avatar */}
        <View className="relative">
          <View
            style={{
              borderRadius: 48,
              borderWidth: 3,
              borderColor: avatarBorderColor(user.level),
              padding: 2,
            }}
          >
            <UserAvatar
              url={user.avatar_url}
              name={user.display_name}
              username={user.username}
              size={80}
            />
          </View>
          {/* Level badge */}
          <View
            className="absolute -bottom-2 self-center items-center px-2 py-0.5 rounded-full border border-primary/30 bg-primary-50"
            style={{ left: '50%', transform: [{ translateX: -24 }], minWidth: 48 }}
          >
            <Text className="text-[10px] font-extrabold text-primary">
              Cấp {user.level}
            </Text>
          </View>
        </View>

        {/* Name + username + bio */}
        <View className="flex-1 mt-1 gap-0.5">
          <Text className="font-display text-xl font-bold text-foreground leading-tight" numberOfLines={1}>
            {user.display_name || user.username}
          </Text>
          <Text className="text-sm text-muted-foreground">@{user.username}</Text>
          {user.bio ? (
            <Text className="text-xs text-muted-foreground mt-1" numberOfLines={3}>
              {user.bio}
            </Text>
          ) : null}
        </View>

        {/* Action buttons column (own profile) */}
        {(onEdit || onSettings) ? (
          <View className="gap-2">
            {onEdit ? (
              <Pressable
                onPress={onEdit}
                accessibilityLabel="Chỉnh sửa hồ sơ"
                className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-muted"
              >
                <Icon name="pencil" size={16} color={colors.foreground} />
              </Pressable>
            ) : null}
            {onSettings ? (
              <Pressable
                onPress={onSettings}
                accessibilityLabel="Cài đặt"
                className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-muted"
              >
                <Icon name="settings" size={16} color={colors.foreground} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Tags: streak + member since */}
      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        {user.checkin_streak > 0 ? (
          <View className="flex-row items-center gap-1">
            <Icon name="fire" size={13} color={colors.primary} />
            <Text className="text-xs font-semibold text-muted-foreground">
              {user.checkin_streak} ngày liên tiếp
            </Text>
          </View>
        ) : null}
        <View className="flex-row items-center gap-1">
          <Icon name="calendar" size={13} color={colors['400']} />
          <Text className="text-xs font-semibold text-muted-foreground">
            Thành viên từ {formatMemberSince(user.created_at)}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View className="flex-row border-t border-border pt-3">
        <StatPill value={user.checkpoint_count} label="Checkin" />
        <View className="w-px bg-border" />
        <StatPill value={user.journey_count} label="Hành trình" />
        <View className="w-px bg-border" />
        <StatPill value={user.level} label="Cấp độ" />
        <View className="w-px bg-border" />
        <StatPill value={user.total_xp.toLocaleString()} label="XP" />
      </View>

      {/* XP Progress bar */}
      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Icon name="star" size={14} color={status.gold} />
            <Text className="text-xs font-semibold text-foreground">Cấp độ hiện tại</Text>
          </View>
          <Text className="text-xs text-muted-foreground">{user.total_xp.toLocaleString()} XP</Text>
        </View>
        <View className="h-2.5 rounded-full bg-primary-50 overflow-hidden border border-primary/20">
          <LinearGradient
            colors={[...gradients.xp]}
            start={[0, 0]}
            end={[1, 0]}
            style={{ width: `${xpPercent}%`, height: '100%', borderRadius: 9999 }}
          />
        </View>
        <Text className="text-[10px] italic text-muted-foreground">
          {user.xp_to_next > 0
            ? `Còn ${user.xp_to_next.toLocaleString()} XP lên cấp ${user.level + 1}`
            : 'Đã đạt cấp tối đa'}
        </Text>
      </View>
    </View>
  );
}
