import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { authService } from "../src/services/auth";
import { authErrorMessage } from "../src/lib/authErrors";
import { hasRealAccount } from "../src/lib/guestSession";
import { colors } from "../src/theme/tokens";
import { Button } from "../src/components/ui/Button";

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      if (isSignup) {
        await authService.signupEmail(email, password);
      } else {
        await authService.loginEmail(email, password);
      }
      router.back();
    } catch (error: any) {
      Alert.alert(t("common.error"), authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await authService.loginGoogle();
      router.back();
    } catch (error: any) {
      Alert.alert(t("common.error"), authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymous = async () => {
    setLoading(true);
    try {
      await authService.loginAnonymous();
      router.back();
    } catch (error: any) {
      Alert.alert(t("common.error"), authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>📍</Text>
        <Text style={styles.title}>Checkpoint</Text>
        <Text style={styles.subtitle}>{t("login.subtitle")}</Text>

        <View style={{ gap: 12, marginTop: 32 }}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t("login.email")}
            placeholderTextColor={colors.neutral[400]}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t("login.password")}
            placeholderTextColor={colors.neutral[400]}
            secureTextEntry
          />
          <Button
            variant="primary"
            fullWidth
            loading={loading}
            onPress={handleEmailAuth}
          >
            {isSignup ? t("login.signup") : t("login.login")}
          </Button>

          <TouchableOpacity onPress={() => setIsSignup(!isSignup)}>
            <Text style={styles.switchMode}>
              {isSignup ? t("login.login") : t("login.signup")}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t("login.or")}</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={{ gap: 12 }}>
          <Button variant="outline" fullWidth onPress={handleGoogle} loading={loading}>
            {t("login.continueWithGoogle")}
          </Button>

          {!hasRealAccount() && (
            <Button variant="ghost" fullWidth onPress={handleAnonymous} loading={loading}>
              {t("login.continueAsGuest")}
            </Button>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  content: { padding: 24, alignItems: "center", justifyContent: "center", minHeight: "100%" },
  logo: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", color: colors.primary[500] },
  subtitle: { fontSize: 16, color: colors.neutral[500], marginTop: 4 },
  input: {
    backgroundColor: colors.neutral[100], borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
    color: colors.neutral[800], width: "100%",
  },
  switchMode: { textAlign: "center", color: colors.primary[500], fontSize: 14, marginTop: 4 },
  divider: {
    flexDirection: "row", alignItems: "center", marginVertical: 24, width: "100%",
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.neutral[200] },
  dividerText: { marginHorizontal: 16, color: colors.neutral[500], fontSize: 14 },
});
