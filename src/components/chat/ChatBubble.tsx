/**
 * ChatBubble — single message bubble for the chat room.
 *
 * Own messages: right-aligned, primary color.
 * Others' messages: left-aligned, surface-muted color.
 * Shows sender avatar + name in group chats, image if present, timestamp.
 */
import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import { UserAvatar } from '../ui/UserAvatar';
import { light } from '../../theme/colors';
import type { Message } from '../../lib/chat';

interface ChatBubbleProps {
  message: Message;
  isMine: boolean;
  /** true for group chats — shows sender avatar + name on others' messages */
  showAvatar: boolean;
  senderOnline?: boolean;
  onImageClick?: (url: string) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function ChatBubble({
  message,
  isMine,
  showAvatar,
  senderOnline = false,
  onImageClick,
}: ChatBubbleProps) {
  const time = formatTime(message.created_at);

  return (
    <View style={[styles.row, isMine ? styles.rowReverse : styles.rowForward]}>
      {/* Avatar — only for others in group chats */}
      {showAvatar && !isMine ? (
        <UserAvatar
          url={message.sender_avatar}
          name={message.sender_name}
          size={28}
        />
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}

      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        {/* Sender name + online dot in groups */}
        {showAvatar && !isMine && (
          <View style={styles.senderRow}>
            <Text style={styles.senderName}>{message.sender_name}</Text>
            <View
              style={[
                styles.onlineDot,
                senderOnline ? styles.dotOnline : styles.dotOffline,
              ]}
            />
          </View>
        )}

        {/* Image */}
        {message.image_url ? (
          <Pressable
            onPress={() => onImageClick?.(message.image_url!)}
            style={[
              styles.imageWrapper,
              isMine ? styles.imageWrapperMine : styles.imageWrapperOther,
            ]}
          >
            <Image
              source={{ uri: message.image_thumb_url || message.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          </Pressable>
        ) : null}

        {/* Text */}
        {message.text ? (
          <View
            style={[
              styles.textBubble,
              isMine ? styles.textBubbleMine : styles.textBubbleOther,
            ]}
          >
            <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextOther]}>
              {message.text}
            </Text>
          </View>
        ) : null}

        {/* Timestamp */}
        <Text style={[styles.time, isMine ? styles.timeRight : styles.timeLeft]}>
          {time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 2,
  },
  rowForward: {
    flexDirection: 'row',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  avatarPlaceholder: {
    width: 4,
    height: 4,
  },
  bubble: {
    maxWidth: '75%',
    gap: 3,
  },
  bubbleMine: {
    alignItems: 'flex-end',
  },
  bubbleOther: {
    alignItems: 'flex-start',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: light.mutedForeground,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOnline: {
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: 'rgba(122, 107, 95, 0.4)',
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageWrapperMine: {
    borderBottomRightRadius: 4,
  },
  imageWrapperOther: {
    borderBottomLeftRadius: 4,
  },
  image: {
    width: 200,
    height: 160,
  },
  textBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textBubbleMine: {
    backgroundColor: light.primary,
    borderBottomRightRadius: 4,
  },
  textBubbleOther: {
    backgroundColor: light.surfaceMuted,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextMine: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: light.foreground,
  },
  time: {
    fontSize: 10,
    color: light.mutedForeground,
    paddingHorizontal: 4,
  },
  timeRight: {
    textAlign: 'right',
  },
  timeLeft: {
    textAlign: 'left',
  },
});
