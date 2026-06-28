/**
 * ChatListScreen — displays the user's chat rooms with real-time Firestore
 * subscriptions, unread badges, last message preview, and presence dots.
 *
 * Ported from web/src/pages/ChatListPage.tsx.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import { useChatRooms } from '../context/ChatRoomsContext';
import {
  subscribePresence,
  roomDisplayName,
  roomAvatarUrl,
  type Room,
  type PresenceStatus,
} from '../lib/chat';
import { UserAvatar } from '../components/ui/UserAvatar';
import { Icon } from '../components/ui/Icon';
import { light } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'Vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ`;
  if (s < 604800) return `${Math.floor(s / 86400)} ngày`;
  return d.toLocaleDateString('vi-VN');
}

function onlineCount(
  room: Room,
  myUid: string,
  presence: Record<string, PresenceStatus>,
): number {
  return room.members.filter((id) => id !== myUid && presence[id]?.online).length;
}

// ── RoomRow ───────────────────────────────────────────────────────────────────

interface RoomRowProps {
  room: Room;
  myUid: string;
  presence: Record<string, PresenceStatus>;
  onPress: () => void;
}

function RoomRow({ room, myUid, presence, onPress }: RoomRowProps) {
  const name = roomDisplayName(room, myUid);
  const avatar = roomAvatarUrl(room);
  const last = room.last_message;
  const otherId =
    room.type === 'dm' ? room.members.find((id) => id !== myUid) : undefined;
  const isOtherOnline = otherId ? presence[otherId]?.online === true : false;
  const groupOnline = onlineCount(room, myUid, presence);
  const isOnline = room.type === 'group' ? groupOnline > 0 : isOtherOnline;

  const statusLabel =
    room.type === 'group'
      ? `${groupOnline} online`
      : isOtherOnline
        ? 'Đang online'
        : 'Đang offline';

  const previewPrefix =
    !last?.sender_id || last.sender_id === myUid
      ? 'Bạn: '
      : `${last.sender_name}: `;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {/* Avatar */}
      {room.type === 'group' && avatar ? (
        <View style={styles.avatarWrap}>
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <View style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden' }}>
            <View style={{ flex: 1, backgroundColor: light.surfaceMuted }} />
          </View>
        </View>
      ) : (
        <UserAvatar
          url={undefined}
          name={name}
          username={name}
          size={48}
        />
      )}

      {/* Text content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
            {room.type === 'group' && (
              <Text style={styles.memberCount}>{` (${room.members.length})`}</Text>
            )}
          </Text>
          {last && (
            <Text style={styles.timestamp}>{relativeTime(last.sent_at)}</Text>
          )}
        </View>

        {/* Presence row */}
        <View style={styles.presenceRow}>
          <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={styles.presenceLabel}>{statusLabel}</Text>
        </View>

        {/* Last message preview */}
        {last && (
          <Text style={styles.preview} numberOfLines={1}>
            {previewPrefix}
            {last.text}
          </Text>
        )}
      </View>

      {/* Unread indicator */}
      {room.unread ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ChatListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { rooms } = useChatRooms();
  const [presence, setPresence] = useState<Record<string, PresenceStatus>>({});

  const presenceIds = useMemo(() => {
    if (!user) return [];
    return [
      ...new Set(rooms.flatMap((room) => room.members).filter((id) => id !== user.id)),
    ].sort();
  }, [rooms, user]);

  useEffect(() => {
    return subscribePresence(presenceIds, setPresence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenceIds.join('|')]);

  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyText}>Đăng nhập để nhắn tin</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
      </View>

      {/* Room list */}
      {rooms.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="send" size={40} color={light.mutedForeground} />
          <Text style={styles.emptyTitle}>Chưa có tin nhắn nào</Text>
          <Text style={styles.emptyText}>Bắt đầu cuộc trò chuyện với bạn bè</Text>
        </View>
      ) : (
        <FlashList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RoomRow
              room={item}
              myUid={user.id}
              presence={presence}
              onPress={() => navigation.navigate('ChatRoom', { roomId: item.id })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: light.surface,
  },
  center: {
    flex: 1,
    backgroundColor: light.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: light.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: light.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: light.foreground,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: light.foreground,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: light.mutedForeground,
    textAlign: 'center',
  },
  // RoomRow
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: light.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: light.surfaceMuted,
  },
  avatarWrap: {
    width: 48,
    height: 48,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: light.foreground,
  },
  memberCount: {
    fontSize: 12,
    fontWeight: '400',
    color: light.mutedForeground,
  },
  timestamp: {
    fontSize: 11,
    color: light.mutedForeground,
    flexShrink: 0,
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: 'rgba(122,107,95,0.35)',
  },
  presenceLabel: {
    fontSize: 12,
    color: light.mutedForeground,
  },
  preview: {
    fontSize: 13,
    color: light.mutedForeground,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: light.primary,
    flexShrink: 0,
  },
});
