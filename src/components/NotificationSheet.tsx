// NotificationSheet — bottom-sheet listing the user's in-app notifications.
// Ported from web/src/components/NotificationSheet.tsx.
// Uses @gorhom/bottom-sheet via the Sheet wrapper in ui/Sheet.tsx.

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../context/NotificationProvider';
import { Sheet } from './ui/Sheet';
import { Icon } from './ui/Icon';
import { UserAvatar } from './ui/UserAvatar';
import { light } from '../theme/colors';
import type { AppNotification } from '../lib/notifications';

// ── Relative time (Vietnamese) ────────────────────────────────────────────────

function relativeTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'vừa xong';
  const mins = Math.floor(s / 60);
  if (s < 3600) return `${mins} phút`;
  const hrs = Math.floor(s / 3600);
  if (s < 86400) return `${hrs} giờ`;
  const days = Math.floor(s / 86400);
  if (s < 604800) return `${days} ngày`;
  return d.toLocaleDateString('vi-VN');
}

// ── Notification text ─────────────────────────────────────────────────────────

function notifText(notif: AppNotification, name: string): string {
  const cp = notif.checkpoint_name ?? 'check-in';
  switch (notif.type) {
    case 'mention':
      return `${name} đã nhắc đến bạn ở ${cp}`;
    case 'comment':
      return `${name} đã bình luận về ${cp}`;
    case 'reaction':
      return `${name} đã bày tỏ cảm xúc về ${cp}`;
    case 'follow':
      return `${name} đã theo dõi bạn`;
    case 'unfollow':
      return `${name} đã bỏ theo dõi bạn`;
    case 'checkpoint':
      return `${name} vừa đăng check-in mới: ${cp}`;
    case 'chat_message':
      return `${name} đã gửi tin nhắn vào ${cp}`;
    default:
      return `${name} có thông báo mới`;
  }
}

// ── NotificationRow ───────────────────────────────────────────────────────────

interface RowProps {
  notif: AppNotification;
  unseen: boolean;
}

function NotificationRow({ notif, unseen }: RowProps) {
  const name =
    notif.actor.display_name || notif.actor.username || 'Người dùng';

  return (
    <View
      style={[
        styles.row,
        unseen && styles.rowUnseen,
      ]}
    >
      <View style={styles.avatarWrap}>
        <UserAvatar
          url={notif.actor.avatar_url}
          name={name}
          username={notif.actor.username}
          size={44}
        />
        {notif.type === 'reaction' && notif.reaction && (
          <View style={styles.reactionBadge}>
            <Icon
              name={
                notif.reaction === 'like'
                  ? 'like'
                  : notif.reaction === 'love'
                  ? 'love'
                  : notif.reaction === 'fire'
                  ? 'fire'
                  : notif.reaction === 'haha'
                  ? 'haha'
                  : notif.reaction === 'sad'
                  ? 'sad'
                  : 'like'
              }
              size={12}
              color="#F25C42"
            />
          </View>
        )}
      </View>

      <View style={styles.rowContent}>
        <Text style={styles.rowText} numberOfLines={2}>
          {notifText(notif, name)}
        </Text>
        {(notif.type === 'mention' || notif.type === 'comment') &&
          notif.comment_excerpt && (
            <Text style={styles.excerpt} numberOfLines={2}>
              "{notif.comment_excerpt}"
            </Text>
          )}
        {notif.type === 'chat_message' && notif.comment_excerpt && (
          <Text style={styles.excerpt} numberOfLines={1}>
            {notif.comment_excerpt}
          </Text>
        )}
        <Text style={styles.time}>{relativeTime(notif.created_at)}</Text>
      </View>

      {unseen && <View style={styles.unreadDot} />}
    </View>
  );
}

// ── NotificationSheet ─────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NotificationSheet({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAllSeen } = useNotifications();

  // Capture the lastSeen cutoff at the moment the sheet opens so that rows
  // that were unread at open time stay highlighted even after markAllSeen runs.
  const seenCutoffRef = useRef(Date.now() - 1);

  const marked = useRef(false);
  useEffect(() => {
    if (!open) {
      marked.current = false;
      return;
    }
    if (marked.current) return;
    marked.current = true;
    // Capture cutoff before marking
    seenCutoffRef.current = Date.now() - 1 - (unreadCount > 0 ? 1 : 0);
    markAllSeen();
  }, [open, markAllSeen, unreadCount]);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.empty}>
        <Icon name="bell" size={40} color={light.mutedForeground} />
        <Text style={styles.emptyText}>Chưa có thông báo</Text>
      </View>
    ),
    [],
  );

  const snapPoints = useMemo(() => ['75%', '95%'], []);

  return (
    <Sheet open={open} onClose={onClose} snapPoints={snapPoints}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Thông báo</Text>
        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityLabel={t('dong', { defaultValue: 'Đóng' })}
          hitSlop={8}
        >
          <Icon name="x" size={20} color={light.mutedForeground} />
        </Pressable>
      </View>

      {/* List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0
          ? renderEmpty()
          : notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notif={n}
                unseen={n.created_at.getTime() > seenCutoffRef.current}
              />
            ))}
      </ScrollView>
    </Sheet>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: light.border,
  },
  title: {
    fontSize: 17,
    fontFamily: 'BeVietnamPro_700Bold',
    color: light.foreground,
  },
  closeBtn: {
    padding: 6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: light.border,
  },
  rowUnseen: {
    backgroundColor: 'rgba(240,90,40,0.05)',
  },
  avatarWrap: {
    position: 'relative',
  },
  reactionBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: light.border,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowText: {
    fontSize: 13,
    lineHeight: 18,
    color: light.foreground,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  excerpt: {
    fontSize: 12,
    color: light.mutedForeground,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  time: {
    fontSize: 11,
    color: light.subtleForeground,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F05A28',
    flexShrink: 0,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: light.mutedForeground,
    fontFamily: 'BeVietnamPro_400Regular',
  },
});
