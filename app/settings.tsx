import React from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import * as Localization from "expo-localization";
import { useAuth } from "../src/hooks/useAuth";
import { authService } from "../src/services/auth";
import { quickCheckinSettings } from "../src/lib/settings";
import { colors } from "../src/theme/tokens";
import { Card } from "../src/components/ui/Card";
import { Button } from "../src/components/ui/Button";

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const currentLang = i18n.language === "vi" ? "vi" : "en";

  const toggleLang = () => {
    const next = currentLang === "vi" ? "en" : "vi";
    i18n.changeLanguage(next);
  };

  const handleLogout = () => {
    Alert.alert(t("profile.logout"), "", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"), style: "destructive",
        onPress: async () => {
          await authService.signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={styles.title}>{t("profile.settings")}</Text>

      {/* Check-in settings */}
      <Card>
        <Text style={styles.sectionTitle}>Check-in</Text>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>{t("profile.openCreateOnLaunch")}</Text>
            <Text style={styles.settingDesc}>{t("profile.openCreateOnLaunchDesc")}</Text>
          </View>
          <Switch
            value={quickCheckinSettings.openCreateOnLaunch}
            onValueChange={(v) => { quickCheckinSettings.openCreateOnLaunch = v; }}
            trackColor={{ true: colors.primary[300], false: colors.neutral[200] }}
            thumbColor={quickCheckinSettings.openCreateOnLaunch ? colors.primary[500] : colors.neutral[400]}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>{t("profile.preferCameraOnCheckin")}</Text>
            <Text style={styles.settingDesc}>{t("profile.preferCameraOnCheckinDesc")}</Text>
          </View>
          <Switch
            value={quickCheckinSettings.preferCameraOnCheckin}
            onValueChange={(v) => { quickCheckinSettings.preferCameraOnCheckin = v; }}
            trackColor={{ true: colors.primary[300], false: colors.neutral[200] }}
            thumbColor={quickCheckinSettings.preferCameraOnCheckin ? colors.primary[500] : colors.neutral[400]}
          />
        </View>
      </Card>

      {/* Language */}
      <Card>
        <Text style={styles.sectionTitle}>{t("profile.language")}</Text>
        <TouchableOpacity style={styles.settingRow} onPress={toggleLang}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>{t("profile.languageDesc")}</Text>
          </View>
          <Text style={styles.langValue}>
            {currentLang === "vi" ? t("profile.vi") : t("profile.en")}
            {"  "}→
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Integrations */}
      <Card>
        <Text style={styles.sectionTitle}>Integrations</Text>
        <TouchableOpacity style={styles.settingRow} onPress={() => router.push("/drive-connect")}>
          <Text style={styles.settingLabel}>Google Drive</Text>
          <Text style={{ color: colors.neutral[400] }}>→</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.settingRow} onPress={() => router.push("/photos-connect")}>
          <Text style={styles.settingLabel}>Google Photos</Text>
          <Text style={{ color: colors.neutral[400] }}>→</Text>
        </TouchableOpacity>
      </Card>

      {/* Account */}
      <Card>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={{ fontSize: 14, color: colors.neutral[500], marginBottom: 4 }}>
          @{user?.username} · Lv.{user?.level}
        </Text>
        <Button variant="outline" onPress={() => router.push("/edit-profile")}>
          {t("profile.editProfile")}
        </Button>
        <View style={{ marginTop: 12 }}>
          <Button variant="ghost" onPress={handleLogout}>
            {t("profile.logout")}
          </Button>
        </View>
      </Card>

      <Text style={{ textAlign: "center", fontSize: 12, color: colors.neutral[400], marginTop: 16 }}>
        Checkpoint v0.1.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  title: { fontSize: 22, fontWeight: "700", color: colors.neutral[800] },
  sectionTitle: { fontSize: 15, fontWeight: "600", marginBottom: 8, color: colors.neutral[700] },
  settingRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 8,
  },
  settingLabel: { fontSize: 15, color: colors.neutral[700] },
  settingDesc: { fontSize: 12, color: colors.neutral[400], marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.neutral[100], marginVertical: 4 },
  langValue: { fontSize: 15, color: colors.primary[500], fontWeight: "600" },
});
