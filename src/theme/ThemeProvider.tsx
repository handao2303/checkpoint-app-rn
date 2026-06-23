import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { getItem, setItem } from "../lib/storage";
import { darkTheme, lightTheme, type ThemePalette } from "./tokens";

export type ThemePreference = "system" | "light" | "dark";

const THEME_KEY = "cp.settings.theme";

interface ThemeContextValue {
  theme: ThemePalette;
  scheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreference(): ThemePreference {
  const raw = getItem(THEME_KEY);
  return raw === "light" || raw === "dark" ? raw : "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);

  // Re-sync once cache has loaded (storage reads are eventually-consistent on launch).
  useEffect(() => {
    setPreferenceState(readPreference());
  }, []);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    setItem(THEME_KEY, pref);
  };

  const scheme: "light" | "dark" =
    preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: scheme === "dark" ? darkTheme : lightTheme,
      scheme,
      preference,
      setPreference,
    }),
    [scheme, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so components can render outside the provider (e.g. tests/splash).
    return {
      theme: lightTheme,
      scheme: "light",
      preference: "system",
      setPreference: () => {},
    };
  }
  return ctx;
}
