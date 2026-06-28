import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/Button';
import { authErrorMessage } from '../lib/authErrors';
import type { RootStackParamList } from '../navigation/types';

export default function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { loginIdentifier, signupEmail, loginGoogle, loginAnonymous } = useAuth();

  const goHome = () =>
    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!identifier || !password) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await loginIdentifier(identifier, password);
      } else {
        await signupEmail(identifier, password);
      }
      goHome();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await loginGoogle();
      goHome();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setBusy(true);
    try {
      await loginAnonymous();
      goHome();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-surface"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center justify-center px-6 py-12">
          {/* Logo + header */}
          <View className="items-center gap-3 mb-8">
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require('../../assets/icon.png')}
              className="w-20 h-20"
              resizeMode="contain"
            />
            <Text className="font-display text-4xl font-bold text-clay-600">
              Checkpoint
            </Text>
            <Text className="text-muted-foreground text-center font-body">
              {t('kham_pha_the_gioi')}
              {'\n'}
              {t('luu_dau_hanh_trinh')}
            </Text>
          </View>

          {/* Email / identifier input */}
          <TextInput
            className="w-full border border-border rounded-full bg-surface px-5 py-3 text-sm text-foreground font-body mb-3"
            placeholder={mode === 'signin' ? t('email_hoac_username') : 'Email'}
            placeholderTextColor="#9ca3af"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          {/* Password input */}
          <TextInput
            className="w-full border border-border rounded-full bg-surface px-5 py-3 text-sm text-foreground font-body mb-4"
            placeholder={t('mat_khau')}
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Error message */}
          {error ? (
            <Text className="text-accent-600 text-sm px-2 mb-3 self-start">{error}</Text>
          ) : null}

          {/* Submit button */}
          <Button
            size="lg"
            pill
            loading={busy}
            disabled={busy}
            onPress={handleSubmit}
            className="w-full mb-3"
          >
            {busy
              ? t('dang_xu_ly')
              : mode === 'signin'
              ? t('dang_nhap')
              : t('dang_ky')}
          </Button>

          {/* Divider */}
          <View className="flex-row items-center gap-3 my-2 w-full">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-xs text-muted-foreground">{t('hoac')}</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          {/* Google button */}
          <Button
            variant="outline"
            size="lg"
            pill
            disabled={busy}
            onPress={handleGoogle}
            className="w-full mb-3"
          >
            {t('tiep_tuc_voi_google')}
          </Button>

          {/* Guest button */}
          <Button
            variant="ghost"
            size="lg"
            disabled={busy}
            onPress={handleGuest}
            className="w-full mb-6"
          >
            {t('tiep_tuc_voi_khach')}
          </Button>

          {/* Mode toggle */}
          <View className="flex-row items-center justify-center">
            <Text className="text-sm text-muted-foreground font-body">
              {mode === 'signin' ? t('ban_chua_co_tai_khoan') : t('da_co_tai_khoan')}{' '}
            </Text>
            <TouchableOpacity onPress={toggleMode}>
              <Text className="text-sm font-semibold text-primary font-body">
                {mode === 'signin' ? t('dang_ky_ngay') : t('dang_nhap')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
