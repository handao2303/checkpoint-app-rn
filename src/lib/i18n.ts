import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { Platform } from "react-native";
import viTranslation from "./locales/vi.json";
import enTranslation from "./locales/en.json";

const resources = {
  vi: { translation: viTranslation },
  en: { translation: enTranslation },
};

const locale =
  Platform.OS === "web"
    ? "vi"
    : Localization.getLocales()?.[0]?.languageCode ?? "vi";

void i18n.use(initReactI18next).init({
  resources,
  fallbackLng: "vi",
  lng: locale,
  interpolation: {
    escapeValue: false,
  },
});

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options) as string;
}

export default i18n;
