/**
 * CommentComposer — simple text input + submit button for writing a comment.
 * Props: onSubmit (async handler called with trimmed text), sending (loading state).
 */
import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { Icon } from './ui/Icon';
import { colors } from '../theme/colors';

interface CommentComposerProps {
  onSubmit: (text: string) => Promise<void>;
  sending: boolean;
}

export function CommentComposer({ onSubmit, sending }: CommentComposerProps) {
  const [text, setText] = useState('');

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    await onSubmit(trimmed);
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Viết bình luận..."
        placeholderTextColor={colors.foregroundMuted}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={500}
        editable={!sending}
      />
      <Pressable
        onPress={handleSend}
        disabled={sending || !text.trim()}
        style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Icon name="send" size={18} color="#fff" />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEDFD1',
    backgroundColor: '#FFFDF8',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#EEDFD1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#2A211C',
    backgroundColor: '#FFF8F1',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
