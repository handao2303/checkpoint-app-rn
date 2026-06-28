// SettingsSheet — bottom-sheet with app settings: language, dark mode stub,
// links, logout, and delete account.
// Ported from web/src/components/SettingsSheet.tsx with mobile adaptations:
// - @gorhom/bottom-sheet instead of Radix Sheet
// - Linking.openURL for privacy/terms links
// - supabase.auth.signOut + SecureStorage clear for logout
// - Alert for delete-account confirmation

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Switch,
  StyleSheet,
  Alert,
  Linking,
  Appearance,
  useColorScheme,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sheet } from './ui/Sheet';
import { Icon } from './ui/Icon';
import { light } from '../theme/colors';
import { supabase } from '../lib/supabase';
import { secureStorage, KEYS } from '../lib/secureStorage';
import { useAuth } from '../auth/AuthContext';

const PRIVACY_URL = 'https://checkpoint.app/privacy';
const TERMS_URL = 'https://checkpoint.app/terms';

// ── RowItem ───────────────────────────────────────────────────────────────────

function RowItem({
  label,
  description,
  right,
  onPress,
  danger,
}: {
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && !!onPress && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>
          {label}
        </Text>
        {description ? (
          <Text style={styles.rowDesc}>{description}</Text>
        ) : null}
      </View>
      {right ?? null}
      {onPress && !right ? (
        <Icon name="chevron-right" size={16} color={light.mutedForeground} />
      ) : null}
    </Pressable>
  );
}

// ── SectionLabel ──────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

// ── SettingsSheet ─────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsSheet({ open, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();

  const systemScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState(systemScheme === 'dark');

  const handleDarkModeToggle = useCallback((value: boolean) => {
    setDarkMode(value);
    Appearance.setColorScheme(value ? 'dark' : 'light');
  }, []);

  const currentLang = i18n.language.startsWith('vi') ? 'vi' : 'en';

  const toggleLanguage = useCallback(() => {
    const next = currentLang === 'vi' ? 'en' : 'vi';
    void i18n.changeLanguage(next);
  }, [currentLang, i18n]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              onClose();
            } catch {
              Alert.alert('Lỗi', 'Đăng xuất thất bại. Vui lòng thử lại.');
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [signOut, onClose]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Xoá tài khoản',
      'Hành động này không thể hoàn tác. Tất cả dữ liệu của bạn sẽ bị xoá vĩnh viễn.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá tài khoản',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear local tokens first so the user is signed out on error too
              await secureStorage.removeItem(KEYS.ACCESS_TOKEN);
              await secureStorage.removeItem(KEYS.REFRESH_TOKEN);
              await supabase.auth.signOut();
              onClose();
              // TODO: call a backend DELETE /me endpoint in a later task
            } catch {
              Alert.alert('Lỗi', 'Không thể xoá tài khoản. Vui lòng thử lại.');
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [onClose]);

  const snapPoints = useMemo(() => ['60%', '90%'], []);

  return (
    <Sheet open={open} onClose={onClose} snapPoints={snapPoints}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cài đặt</Text>
        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityLabel={t('dong', { defaultValue: 'Đóng' })}
          hitSlop={8}
        >
          <Icon name="x" size={20} color={light.mutedForeground} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* ── Language ── */}
        <SectionLabel text="Ngôn ngữ" />
        <RowItem
          label="Ngôn ngữ"
          description={currentLang === 'vi' ? 'Tiếng Việt' : 'English'}
          right={
            <View style={styles.langToggle}>
              <Pressable
                style={[
                  styles.langBtn,
                  currentLang === 'vi' && styles.langBtnActive,
                ]}
                onPress={() => { void i18n.changeLanguage('vi'); }}
              >
                <Text
                  style={[
                    styles.langBtnText,
                    currentLang === 'vi' && styles.langBtnTextActive,
                  ]}
                >
                  VI
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.langBtn,
                  currentLang === 'en' && styles.langBtnActive,
                ]}
                onPress={() => { void i18n.changeLanguage('en'); }}
              >
                <Text
                  style={[
                    styles.langBtnText,
                    currentLang === 'en' && styles.langBtnTextActive,
                  ]}
                >
                  EN
                </Text>
              </Pressable>
            </View>
          }
        />

        {/* ── Dark mode ── */}
        <SectionLabel text="Giao diện" />
        <RowItem
          label="Chế độ tối"
          right={
            <Switch
              value={darkMode}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: light.border, true: '#F05A28' }}
              thumbColor="#FFFFFF"
            />
          }
        />

        {/* ── Links ── */}
        <SectionLabel text="Thông tin" />
        <RowItem
          label="Chính sách riêng tư"
          onPress={() => { void Linking.openURL(PRIVACY_URL); }}
        />
        <RowItem
          label="Điều khoản dịch vụ"
          onPress={() => { void Linking.openURL(TERMS_URL); }}
        />

        {/* ── Account ── */}
        <SectionLabel text="Tài khoản" />
        <RowItem
          label="Đăng xuất"
          onPress={handleLogout}
        />
        <RowItem
          label="Xoá tài khoản"
          onPress={handleDeleteAccount}
          danger
        />
      </View>
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
  body: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'BeVietnamPro_700Bold',
    color: light.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: light.border,
    gap: 8,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowLeft: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_500Medium',
    color: light.foreground,
  },
  rowLabelDanger: {
    color: '#EF4329',
  },
  rowDesc: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_400Regular',
    color: light.mutedForeground,
    marginTop: 1,
  },
  langToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: light.border,
    backgroundColor: light.surface,
  },
  langBtnActive: {
    backgroundColor: '#F05A28',
    borderColor: '#F05A28',
  },
  langBtnText: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_700Bold',
    color: light.mutedForeground,
  },
  langBtnTextActive: {
    color: '#FFFFFF',
  },
});
