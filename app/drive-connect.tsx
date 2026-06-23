import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { initDriveConnect, getDriveStatus, disconnectDrive } from "../src/lib/api";
import { colors } from "../src/theme/tokens";
import { Card } from "../src/components/ui/Card";
import { Button } from "../src/components/ui/Button";

export default function DriveConnectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDriveStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false }))
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    try {
      const { auth_url } = await initDriveConnect();
      const result = await WebBrowser.openAuthSessionAsync(auth_url);
      if (result.type === "success") {
        // Re-check status
        const s = await getDriveStatus();
        setStatus(s);
        Alert.alert("Connected", "Google Drive connected successfully");
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert("Disconnect", "Disconnect Google Drive?", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: "Disconnect", style: "destructive",
        onPress: async () => {
          try {
            await disconnectDrive();
            setStatus({ connected: false });
          } catch {}
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={{ padding: 16, gap: 16 }}>
        <Text style={styles.title}>Google Drive</Text>
        <Card>
          <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>☁️</Text>
          <Text style={styles.name}>Google Drive</Text>
          {status?.connected ? (
            <>
              <Text style={styles.status}>Connected{status.email ? ` as ${status.email}` : ""}</Text>
              <Button variant="outline" onPress={handleDisconnect}>
                Disconnect
              </Button>
            </>
          ) : (
            <>
              <Text style={styles.status}>Not connected</Text>
              <Text style={styles.desc}>
                Connect Google Drive to auto-save your check-in photos.
              </Text>
              <Button variant="primary" onPress={handleConnect}>
                Connect Google Drive
              </Button>
            </>
          )}
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  title: { fontSize: 22, fontWeight: "700", color: colors.neutral[800] },
  name: { fontSize: 18, fontWeight: "600", textAlign: "center", marginBottom: 4 },
  status: { fontSize: 14, color: colors.neutral[500], textAlign: "center", marginBottom: 12 },
  desc: { fontSize: 14, color: colors.neutral[500], textAlign: "center", marginBottom: 16, lineHeight: 20 },
});
