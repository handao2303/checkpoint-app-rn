import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Alert, Image, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../src/hooks/useAuth";
import { authService } from "../src/services/auth";
import { updateProfile, uploadAvatar, isUsernameAvailable } from "../src/lib/api";
import { colors } from "../src/theme/tokens";
import { Button } from "../src/components/ui/Button";
import { Card } from "../src/components/ui/Card";
import { UserAvatar } from "../src/components/ui/UserAvatar";

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const cropped = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512 } }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 },
      );
      setAvatarUri(cropped.uri);
    }
  };

  const checkUsername = async () => {
    if (!username.trim() || username === user?.username) {
      setUsernameAvailable(null);
      return;
    }
    try {
      const available = await isUsernameAvailable(username.trim());
      setUsernameAvailable(available);
    } catch {
      setUsernameAvailable(null);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Upload avatar first if changed
      if (avatarUri) {
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
        await uploadAvatar(file);
      }

      // Update profile
      if (displayName !== user?.display_name || bio !== user?.bio || username !== user?.username) {
        const updated = await updateProfile({
          display_name: displayName || undefined,
          bio: bio || undefined,
          username: username !== user?.username ? username : undefined,
        });

        // Re-commit user state
        // Note: authService doesn't have applyUser yet; this is a workaround
        if (updated) {
          // Force refetch on next profile load
        }
      }
    },
    onSuccess: () => {
      Alert.alert(t("common.ok"), "Profile updated!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert(t("common.error"), error.message);
    },
  });

  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={styles.title}>{t("profile.editProfile")}</Text>

      {/* Avatar */}
      <Card style={{ alignItems: "center", padding: 24 }}>
        <TouchableOpacity onPress={pickAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <UserAvatar url={user.avatar_url} name={user.display_name} size={96} />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={pickAvatar} style={{ marginTop: 8 }}>
          <Text style={{ color: colors.primary[500], fontWeight: "600" }}>
            {t("checkin.takePhoto")}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Display name */}
      <View>
        <Text style={styles.label}>Display name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={colors.neutral[400]}
        />
      </View>

      {/* Bio */}
      <View>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell about yourself"
          placeholderTextColor={colors.neutral[400]}
          multiline
        />
      </View>

      {/* Username */}
      <View>
        <Text style={styles.label}>Username</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={username}
            onChangeText={(v) => { setUsername(v); setUsernameAvailable(null); }}
            onBlur={checkUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="username"
            placeholderTextColor={colors.neutral[400]}
          />
        </View>
        {usernameAvailable === true && (
          <Text style={{ color: colors.green[600], fontSize: 13, marginTop: 4 }}>✓ Available</Text>
        )}
        {usernameAvailable === false && (
          <Text style={{ color: colors.accent[500], fontSize: 13, marginTop: 4 }}>✕ Taken</Text>
        )}
      </View>

      <Button
        variant="primary"
        fullWidth
        loading={saveMutation.isPending}
        onPress={() => saveMutation.mutate()}
      >
        {t("common.save")}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  title: { fontSize: 22, fontWeight: "700", color: colors.neutral[800] },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.neutral[100] },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, color: colors.neutral[700] },
  input: {
    backgroundColor: colors.neutral[100], borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    color: colors.neutral[800],
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
});
