import React, { ReactNode, createContext, useContext } from 'react';
import { View, useColorScheme } from 'react-native';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<Theme>('light');
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  // SettingsSheet stores user preference; fall back to system
  const theme: Theme = systemScheme === 'dark' ? 'dark' : 'light';

  return (
    <ThemeContext.Provider value={theme}>
      <View className={theme === 'dark' ? 'dark flex-1' : 'flex-1'}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}
