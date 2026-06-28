/**
 * ProfileScreen — the signed-in user's own profile.
 * Ported from web/src/pages/ProfilePage.tsx.
 *
 * Sections:
 *  - ProfileHeader (avatar, name, bio, level, XP bar, stats, streak)
 *  - BadgesSection (earned badges — horizontal scroll preview)
 *  - PassportSection (province stamps)
 *  - JourneysSection (stub — journeys screen is Task 19)
 *  - EditProfileSheet (bottom sheet for editing name/username/bio/avatar)
 *  - Settings button → placeholder (Task 15)
 *  - Sign-out button
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthContext';
import { getMe, getMyJourneys } from '../lib/api';
import { colors, status } from '../theme/colors';
import { ProfileHeader } from '../components/ProfileHeader';
import { BadgesSection } from '../components/BadgesSection';
import { PassportSection } from '../components/PassportSection';
import { EditProfileSheet } from '../components/EditProfileSheet';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';

// ---- JourneysSection (inline stub — full screen is Task 19) ----------------

function JourneysSection({ userId }: { userId?: string }) {
  const { data: journeys = [], isLoading } = useQuery({
    queryKey: ['journeys', userId ?? 'me'],
    queryFn: getMyJourneys,
  });

  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-2">
        <Icon name="route" size={20} color={status.gold} />
        <Text className="font-display text-lg font-bold text-foreground">Hành trình</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : journeys.length === 0 ? (
        <Text className="text-sm text-muted-foreground">Chưa có hành trình nào.</Text>
      ) : (
        <View className="gap-2">
          {journeys.slice(0, 3).map((j) => (
            <View
              key={j.id}
              className="flex-row items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 border border-border"
            >
              <Icon
                name={j.is_active ? 'flag' : 'flag-planted'}
                size={16}
                color={j.is_active ? colors.primary : colors['400']}
              />
              <Text className="flex-1 text-sm font-medium text-foreground" numberOfLines={1}>
                {j.title}
              </Text>
              {j.is_active ? (
                <View className="bg-primary/10 rounded-full px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-primary">ĐANG DI</Text>
                </View>
              ) : null}
            </View>
          ))}
          {journeys.length > 3 ? (
            <Text className="text-xs text-muted-foreground text-center">
              +{journeys.length - 3} hành trình khác
            </Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}

// ---- ProfileScreen ----------------------------------------------------------

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Keep profile data fresh; applyUser in auth context already updates cache
  // but an explicit fetch gives us the latest server state.
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    staleTime: 60_000,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    await queryClient.invalidateQueries({ queryKey: ['passport'] });
    await queryClient.invalidateQueries({ queryKey: ['badges'] });
    await queryClient.invalidateQueries({ queryKey: ['journeys'] });
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  // While the session is loading for the very first time
  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // Use profile from query (fresher) or fall back to auth context user
  const displayUser = profile ?? user;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header: avatar, name, bio, XP bar, stats */}
        <ProfileHeader
          user={displayUser}
          onEdit={() => setEditOpen(true)}
          onSettings={() => {
            // TODO Task 15: open SettingsSheet
          }}
        />

        {/* Badges preview */}
        <BadgesSection maxPreview={6} />

        {/* Province passport stamps */}
        <PassportSection userId={user.id} />

        {/* Journeys */}
        <JourneysSection userId={user.id} />

        {/* Sign out */}
        <Button
          variant="outline"
          size="lg"
          onPress={handleSignOut}
          loading={signingOut}
          icon={<Icon name="log-out" size={20} color={colors.primary} />}
        >
          Đăng xuất
        </Button>

        {/* Build version */}
        <Text className="text-center text-xs text-muted-foreground opacity-40 mt-2">
          checkpoint mobile
        </Text>
      </ScrollView>

      {/* Edit profile bottom sheet */}
      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} />
    </SafeAreaView>
  );
}
