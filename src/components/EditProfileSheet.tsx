/**
 * EditProfileSheet — edit display_name, username, bio, and avatar.
 * Ported from web/src/components/EditProfileSheet.tsx.
 *
 * Avatar crop: web uses react-easy-crop; mobile uses expo-image-picker's
 * built-in allowsEditing (square crop) + expo-image-manipulator resize.
 * A full custom crop UI is a TODO for a future task.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthContext';
import {
  isUsernameAvailable,
  updateProfile,
  uploadAvatar,
} from '../lib/api';
import { resizeImage } from '../lib/image';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { UserAvatar } from './ui/UserAvatar';
import { colors, light } from '../theme/colors';

// ---- component --------------------------------------------------------------

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
}

export function EditProfileSheet({ open, onClose }: EditProfileSheetProps) {
  const { user, applyUser } = useAuth();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Local preview URI while upload is in progress
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  // Reset form fields when sheet opens
  useEffect(() => {
    if (open && user) {
      setDisplayName(user.display_name ?? '');
      setBio(user.bio ?? '');
      setUsername(user.username ?? '');
      setUsernameStatus('idle');
      setError(null);
      setPreviewUri(null);
    }
  }, [open, user]);

  // Live username availability check (debounced)
  const usernameChanged = !!user && username !== user.username;
  useEffect(() => {
    if (!usernameChanged) {
      setUsernameStatus('idle');
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    const id = setTimeout(async () => {
      try {
        setUsernameStatus((await isUsernameAvailable(username)) ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);
    return () => clearTimeout(id);
  }, [username, usernameChanged]);

  if (!user) return null;

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Cần quyền truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,   // built-in square crop
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;

    setUploading(true);
    setError(null);
    setPreviewUri(asset.uri);
    try {
      // Resize to 400 px before upload (avatar-sized)
      const resizedUri = await resizeImage(asset.uri, 400, 0.88);
      const updated = await uploadAvatar(resizedUri, 'image/jpeg');
      applyUser(updated);
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      setPreviewUri(null);
    } catch (err) {
      setPreviewUri(null);
      setError(err instanceof Error ? err.message : 'Tải ảnh thất bại');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (usernameChanged && usernameStatus !== 'available') {
      setError(usernameStatus === 'taken' ? 'Tên đăng nhập đã được dùng' : 'Tên đăng nhập không hợp lệ');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim(),
        ...(usernameChanged ? { username } : {}),
      });
      applyUser(updated);
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const isSaveDisabled =
    saving ||
    uploading ||
    (usernameChanged && (usernameStatus === 'checking' || usernameStatus === 'invalid' || usernameStatus === 'taken'));

  const avatarUri = previewUri ?? user.avatar_url ?? undefined;

  return (
    <Sheet open={open} onClose={onClose} snapPoints={['85%']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-display text-xl font-bold text-foreground">Sửa hồ sơ</Text>
            <Pressable onPress={onClose} className="p-1">
              <Icon name="x" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Avatar picker */}
          <View className="items-center gap-2">
            <Pressable onPress={pickAvatar} disabled={uploading} style={{ opacity: uploading ? 0.6 : 1 }}>
              <View className="relative">
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={{ width: 96, height: 96, borderRadius: 48 }}
                    resizeMode="cover"
                  />
                ) : (
                  <UserAvatar
                    url={null}
                    name={user.display_name}
                    username={user.username}
                    size={96}
                  />
                )}
                {/* Camera overlay */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Icon name="camera" size={16} color="#fff" />
                  )}
                </View>
              </View>
            </Pressable>
            <Text className="text-xs text-muted-foreground">
              {uploading ? 'Đang tải ảnh…' : 'Chạm để đổi ảnh đại diện'}
            </Text>
            {/* TODO: avatar frame picker is a future task (web uses react-easy-crop + frame overlay) */}
          </View>

          {/* Username */}
          <View className="gap-1.5">
            <Text className="text-sm font-semibold text-foreground">Tên đăng nhập</Text>
            <View
              className="flex-row items-center rounded-xl border border-border bg-surface px-3"
              style={{ minHeight: 48 }}
            >
              <Text className="text-sm text-muted-foreground">@</Text>
              <TextInput
                value={username}
                onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                maxLength={20}
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect={false}
                className="flex-1 text-sm py-3 text-foreground"
                style={{ color: light.foreground }}
                placeholderTextColor={light.mutedForeground}
              />
              {usernameStatus === 'checking' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
              {usernameStatus === 'available' && (
                <Icon name="check" size={16} color={colors.green} />
              )}
            </View>
            {usernameStatus === 'taken' && (
              <Text className="text-xs text-accent-600" style={{ color: '#DC2626' }}>
                Tên đăng nhập đã được dùng
              </Text>
            )}
            {usernameStatus === 'invalid' && (
              <Text className="text-xs" style={{ color: '#DC2626' }}>
                Tên đăng nhập không hợp lệ (3-20 ký tự, chỉ a-z, 0-9, _)
              </Text>
            )}
          </View>

          {/* Display name */}
          <View className="gap-1.5">
            <Text className="text-sm font-semibold text-foreground">Tên hiển thị</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={user.username}
              maxLength={50}
              className="rounded-xl border border-border bg-surface px-3 py-3 text-sm"
              style={{ color: light.foreground, minHeight: 48 }}
              placeholderTextColor={light.mutedForeground}
            />
          </View>

          {/* Bio */}
          <View className="gap-1.5">
            <Text className="text-sm font-semibold text-foreground">Giới thiệu</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Vài dòng về bạn…"
              maxLength={160}
              multiline
              numberOfLines={3}
              className="rounded-xl border border-border bg-surface px-3 py-3 text-sm"
              style={{ color: light.foreground, minHeight: 80, textAlignVertical: 'top' }}
              placeholderTextColor={light.mutedForeground}
            />
          </View>

          {error ? (
            <Text className="text-sm" style={{ color: '#DC2626' }}>
              {error}
            </Text>
          ) : null}

          <Button
            onPress={save}
            disabled={isSaveDisabled}
            loading={saving}
            className="w-full"
          >
            {saving ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Sheet>
  );
}
