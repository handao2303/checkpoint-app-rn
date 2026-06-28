/**
 * ChatRoomScreen — real-time message list with text + image send.
 *
 * Ported from web/src/pages/ChatRoomPage.tsx.
 * - FlatList inverted so newest messages appear at the bottom.
 * - subscribeMessages fires in real time via Firestore.
 * - markRoomRead called on focus.
 * - Presence indicator shown in header for 1:1 and group chats.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Image,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import {
  subscribeMessages,
  sendMessage,
  markRoomRead,
  subscribePresence,
  type Message,
  type PresenceStatus,
} from '../lib/chat';
import { db } from '../lib/firebase';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { Icon } from '../components/ui/Icon';
import { light } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatRoom'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MSG_LIMIT = 50;

export default function ChatRoomScreen({ route }: Props) {
  const { roomId } = route.params;
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [roomMembers, setRoomMembers] = useState<string[]>([]);
  const [presence, setPresence] = useState<Record<string, PresenceStatus>>({});

  // ── Resolve room metadata ────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !user) return;

    db.collection('rooms')
      .doc(roomId)
      .get()
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as Record<string, any>;
          const type = data.type as 'dm' | 'group';
          setIsGroup(type === 'group');
          const members = (data.members as string[] | undefined) ?? [];
          setRoomMembers(members);
          if (type === 'group') {
            setRoomName((data.name as string | undefined) || 'Nhóm');
          } else {
            const memberNames =
              (data.member_names as Record<string, string> | undefined) ?? {};
            const otherId = members.find((id) => id !== user.id);
            setRoomName(otherId ? (memberNames[otherId] || 'Người dùng') : 'DM');
          }
        }
      })
      .catch(() => {
        setRoomMembers([]);
        setRoomName('');
      });
  }, [roomId, user]);

  // ── Presence ─────────────────────────────────────────────────────────────
  const presenceIds = useMemo(() => {
    if (!user) return [];
    return [...new Set(roomMembers.filter((id) => id !== user.id))].sort();
  }, [roomMembers, user]);

  useEffect(() => {
    return subscribePresence(presenceIds, setPresence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenceIds.join('|')]);

  // ── Mark as read when screen is focused ──────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (roomId && user) {
        void markRoomRead(roomId, user.id);
      }
    }, [roomId, user]),
  );

  // ── Subscribe messages ───────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    return subscribeMessages(roomId, MSG_LIMIT, setMessages);
  }, [roomId]);

  // ── Send text ────────────────────────────────────────────────────────────
  async function handleSend(text: string) {
    if (!roomId || !user || !text.trim()) return;
    setSending(true);
    try {
      await sendMessage(
        roomId,
        {
          id: user.id,
          display_name: user.display_name,
          username: user.username,
          avatar_url: user.avatar_url,
        },
        text,
      );
    } finally {
      setSending(false);
    }
  }

  // ── Pick + upload image ───────────────────────────────────────────────────
  async function handlePickImage(uri: string) {
    if (!roomId || !user) return;
    setUploadingImage(true);
    try {
      const { getUploadSlots, putFilesToSlots } = await import('../lib/api');

      const MEDIA_BASE = 'https://media.checkpoint-app.space';
      const toMediaUrl = (key: string) =>
        `${MEDIA_BASE}/${key.replace(/^\/+/, '')}`;

      // Infer mime type from uri extension (fallback jpeg)
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      const slots = await getUploadSlots(['image']);
      await putFilesToSlots(slots, [
        {
          uri,
          mimeType,
          thumbnailUri: uri,
          type: 'image',
        },
      ]);

      const imageUrl = slots[0]?.object_key
        ? toMediaUrl(slots[0].object_key)
        : uri;
      const thumbUrl = slots[0]?.thumbnail_key
        ? toMediaUrl(slots[0].thumbnail_key)
        : uri;

      await sendMessage(
        roomId,
        {
          id: user.id,
          display_name: user.display_name,
          username: user.username,
          avatar_url: user.avatar_url,
        },
        undefined,
        { url: imageUrl, thumbUrl },
      );
    } catch (err) {
      console.error('chat: image upload failed', err);
    } finally {
      setUploadingImage(false);
    }
  }

  // ── Derived presence ──────────────────────────────────────────────────────
  const dmOtherId = !isGroup
    ? roomMembers.find((id) => id !== user?.id)
    : undefined;
  const dmOnline = dmOtherId ? presence[dmOtherId]?.online === true : false;
  const groupOnline = roomMembers.filter(
    (id) => id !== user?.id && presence[id]?.online,
  ).length;
  const isOnline = isGroup ? groupOnline > 0 : dmOnline;
  const statusText = isGroup
    ? `${groupOnline} online`
    : dmOnline
      ? 'Đang online'
      : 'Đang offline';

  // ── Render ────────────────────────────────────────────────────────────────
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <ChatBubble
        message={item}
        isMine={item.sender_id === user?.id}
        showAvatar={isGroup}
        senderOnline={presence[item.sender_id]?.online === true}
        onImageClick={(url) => setPreviewUrl(url)}
      />
    ),
    [user?.id, isGroup, presence],
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.mutedText}>Không tìm thấy phòng</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          accessibilityLabel="Quay lại"
        >
          <Icon name="chevron-left" size={22} color={light.mutedForeground} />
        </Pressable>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {roomName || 'Đang tải…'}
          </Text>
          <View style={styles.presenceRow}>
            <View
              style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]}
            />
            <Text style={styles.presenceText}>{statusText}</Text>
          </View>
        </View>
      </View>

      {/* Messages + input */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={messages}
          inverted
          renderItem={renderMessage}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.mutedText}>Chưa có tin nhắn</Text>
            </View>
          }
        />

        <ChatInput
          onSend={handleSend}
          onPickImage={handlePickImage}
          disabled={sending}
          uploadingImage={uploadingImage}
        />
      </KeyboardAvoidingView>

      {/* Full-screen image preview */}
      {previewUrl ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewUrl(null)}
        >
          <Pressable
            style={styles.previewOverlay}
            onPress={() => setPreviewUrl(null)}
          >
            <Image
              source={{ uri: previewUrl }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </Pressable>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: light.background,
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
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: light.border,
    backgroundColor: light.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: light.foreground,
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotOnline: {
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: 'rgba(122,107,95,0.35)',
  },
  presenceText: {
    fontSize: 12,
    color: light.mutedForeground,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  mutedText: {
    fontSize: 14,
    color: light.mutedForeground,
    textAlign: 'center',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '90%',
    height: '70%',
  },
});
