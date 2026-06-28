/**
 * CommentSection — real-time Firestore comments for a checkpoint.
 * Uses @react-native-firebase namespaced API exclusively.
 *
 * Props:
 *   checkpointId   — which checkpoint's comments to load
 *   ownerUserId    — owner of the checkpoint (reserved for future moderation)
 *   checkpointName — display name for accessibility
 *   onOpenProfile  — optional callback when a commenter's avatar is tapped
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';

import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { CommentComposer } from './CommentComposer';
import { colors } from '../theme/colors';

interface Comment {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  text: string;
  created_at: Date | null;
}

interface CommentSectionProps {
  checkpointId: string;
  ownerUserId: string;
  checkpointName: string;
  onOpenProfile?: (userId: string) => void;
}

function timeAgo(date: Date | null): string {
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function CommentSection({
  checkpointId,
  onOpenProfile,
}: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsubscribe = db
      .collection('checkpoints')
      .doc(checkpointId)
      .collection('comments')
      .orderBy('created_at', 'asc')
      .limit(50)
      .onSnapshot(
        (snap) => {
          const loaded: Comment[] = snap.docs.map((doc) => {
            const data = doc.data();
            const ts = data.created_at;
            return {
              id: doc.id,
              user_id: data.user_id ?? '',
              username: data.username ?? '',
              display_name: data.display_name ?? '',
              avatar_url: data.avatar_url ?? '',
              text: data.text ?? '',
              created_at: ts && typeof ts.toDate === 'function' ? ts.toDate() : null,
            };
          });
          setComments(loaded);
        },
        (err) => {
          console.warn('CommentSection snapshot error:', err);
        },
      );

    return () => unsubscribe();
  }, [checkpointId]);

  const handleSubmit = async (text: string) => {
    if (!user) {
      Alert.alert('Đăng nhập', 'Vui lòng đăng nhập để bình luận.');
      return;
    }
    setSending(true);
    try {
      await db
        .collection('checkpoints')
        .doc(checkpointId)
        .collection('comments')
        .add({
          user_id: user.id,
          username: user.username,
          display_name: user.display_name ?? '',
          avatar_url: user.avatar_url ?? '',
          text,
          created_at: firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể gửi bình luận. Vui lòng thử lại.');
      console.warn('CommentSection submit error:', err);
    } finally {
      setSending(false);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentRow}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>
            {(item.display_name || item.username || '?')[0].toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.bubble}>
        <View style={styles.metaRow}>
          <Text
            style={styles.username}
            onPress={() => onOpenProfile?.(item.user_id)}
          >
            {item.display_name || item.username}
          </Text>
          <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Bình luận ({comments.length})</Text>
      {comments.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 12 }}
        />
      )}
      {user ? (
        <CommentComposer onSubmit={handleSubmit} sending={sending} />
      ) : (
        <Text style={styles.loginPrompt}>Đăng nhập để bình luận</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A211C',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#7A6B5F',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  bubble: {
    flex: 1,
    backgroundColor: '#FFF1EA',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A211C',
  },
  time: {
    fontSize: 11,
    color: '#7A6B5F',
  },
  commentText: {
    fontSize: 14,
    color: '#2A211C',
    lineHeight: 20,
  },
  loginPrompt: {
    fontSize: 13,
    color: '#7A6B5F',
    textAlign: 'center',
    padding: 16,
  },
});
