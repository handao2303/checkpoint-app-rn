/**
 * ChatInput — compose bar with text input, send button, and image picker.
 *
 * Ported from web/src/components/chat/ChatInput.tsx for React Native.
 * Uses expo-image-picker instead of a file input.
 */
import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Icon } from '../ui/Icon';
import { light } from '../../theme/colors';

interface ChatInputProps {
  onSend: (text: string) => void | Promise<void>;
  onPickImage?: (uri: string) => void | Promise<void>;
  disabled?: boolean;
  uploadingImage?: boolean;
}

export function ChatInput({
  onSend,
  onPickImage,
  disabled,
  uploadingImage,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled || uploadingImage) return;
    setText('');
    await onSend(trimmed);
    // Re-focus after send on Android (iOS keyboard stays open)
    if (Platform.OS === 'android') {
      inputRef.current?.focus();
    }
  }

  async function handlePickImage() {
    if (!onPickImage || disabled || uploadingImage) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      await onPickImage(result.assets[0].uri);
    }
  }

  const canSend = text.trim().length > 0 && !disabled && !uploadingImage;

  return (
    <View style={styles.container}>
      {/* Image picker button */}
      {onPickImage ? (
        <Pressable
          onPress={handlePickImage}
          disabled={disabled || uploadingImage}
          style={({ pressed }) => [
            styles.iconButton,
            (disabled || uploadingImage) && styles.disabled,
            pressed && styles.pressed,
          ]}
          accessibilityLabel="Gửi ảnh"
        >
          {uploadingImage ? (
            <ActivityIndicator size="small" color={light.primary} />
          ) : (
            <Icon name="image" size={22} color={light.mutedForeground} />
          )}
        </Pressable>
      ) : null}

      {/* Text input */}
      <TextInput
        ref={inputRef}
        style={[styles.input, (disabled || uploadingImage) && styles.disabled]}
        value={text}
        onChangeText={setText}
        placeholder="Nhập tin nhắn..."
        placeholderTextColor={light.mutedForeground}
        editable={!disabled && !uploadingImage}
        multiline
        blurOnSubmit={false}
        returnKeyType="send"
        onSubmitEditing={handleSend}
        autoCorrect
      />

      {/* Send button */}
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        style={({ pressed }) => [
          styles.iconButton,
          !canSend && styles.disabled,
          pressed && styles.pressed,
        ]}
        accessibilityLabel="Gửi"
      >
        <Icon
          name="send"
          size={20}
          color={canSend ? light.primary : light.mutedForeground}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: light.border,
    backgroundColor: light.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    backgroundColor: light.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: light.foreground,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
