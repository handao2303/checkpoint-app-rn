// Checkpoint Design Tokens
// Mirrors web/src/index.css theme values (source of truth).

export const colors = {
  primary: {
    50: "#FFF0E8",
    100: "#FFE0D1",
    200: "#FFC2A8",
    300: "#FF9A70",
    400: "#FA7345",
    500: "#F05A28",
    600: "#D94C20",
    700: "#B83B18",
    800: "#8F2A0C",
    900: "#74240D",
  },
  clay: {
    50: "#FBEEE9",
    100: "#F4D3C7",
    200: "#E3A892",
    300: "#CF7B5F",
    400: "#BE5538",
    500: "#B23A1F",
    600: "#9A311A",
    700: "#7E2814",
    800: "#641F10",
    900: "#4E190D",
  },
  green: {
    50: "#EAF5EC",
    100: "#CDE8D2",
    200: "#A6D4AE",
    300: "#6FB97C",
    400: "#3E9A50",
    500: "#2F8A52",
    600: "#287745",
    700: "#216338",
    800: "#14501A",
    900: "#0E3D13",
  },
  accent: {
    50: "#FEEFEC",
    100: "#FCD3CB",
    200: "#F8A697",
    300: "#F47A63",
    400: "#F25C42",
    500: "#EF4329",
    600: "#D6361E",
  },
  neutral: {
    0: "#FFFDF8",
    50: "#FFF8F1",
    100: "#F7EDE2",
    200: "#EEDFD1",
    300: "#E6CBB6",
    400: "#BBAA9A",
    500: "#7A6B5F",
    600: "#5C4D42",
    700: "#403229",
    800: "#2A211C",
    900: "#1D1511",
  },
};

// Brand / social / status colors (web index.css)
export const social = {
  facebook: "#1877F2",
  apple: "#111111",
  google: "#FFFFFF",
};

export const status = {
  success: "#2E7D32",
  warning: "#F59E0B",
  danger: "#DC2626",
  info: "#2563EB",
  gold: "#E0A73A",
};

export const fontFamily = {
  display: "Montserrat_700Bold",
  body: "Montserrat_400Regular",
  medium: "Montserrat_500Medium",
  semibold: "Montserrat_600SemiBold",
  bold: "Montserrat_600SemiBold",
  mono: "BeVietnamPro_400Regular",
};

// Numeric weights for fontWeight style prop (web maps 300..700)
export const fontWeight = {
  light: "300" as const,
  normal: "300" as const,
  medium: "400" as const,
  semibold: "500" as const,
  bold: "600" as const,
  extrabold: "700" as const,
};

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 28,
  full: 999,
};

// React Native shadow presets (iOS shadow + Android elevation)
export const shadow = {
  sm: {
    shadowColor: "#4A301F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#4A301F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: "#4A301F",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 8,
  },
  card: {
    shadowColor: "#4A301F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  cta: {
    shadowColor: "#F05A28",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
} as const;

// Gradient color stops — consume with expo-linear-gradient `colors` prop.
export const gradients = {
  primary: ["#FF8A3D", "#F4511E"] as const,
  passport: ["#C2410C", "#9A3412"] as const,
  xp: ["#1B5E20", "#4CAF50"] as const,
};

export const easing = {
  standard: [0.2, 0.8, 0.2, 1] as const,
  emphasized: [0.2, 0.9, 0.1, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
};

// ─── Semantic theme palettes (light / dark) ──────────────────────────────────
// Mirrors the CSS custom properties in web/src/index.css (:root and .dark).

export interface ThemePalette {
  scheme: "light" | "dark";
  background: string;
  foreground: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  input: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  subtleForeground: string;
  ring: string;
}

export const lightTheme: ThemePalette = {
  scheme: "light",
  background: "#FFF8F1",
  foreground: "#2A211C",
  surface: "#FFFDF8",
  surfaceMuted: "#FFF1EA",
  border: "#EEDFD1",
  input: "#EEDFD1",
  primary: "#F05A28",
  primaryForeground: "#FFFFFF",
  secondary: "#216338",
  secondaryForeground: "#FFFFFF",
  muted: "#F7EDE2",
  mutedForeground: "#7A6B5F",
  subtleForeground: "#9A8C80",
  ring: "#F05A28",
};

export const darkTheme: ThemePalette = {
  scheme: "dark",
  background: "#16130F",
  foreground: "#F5F0E8",
  surface: "#211C17",
  surfaceMuted: "#2A241E",
  border: "#36302A",
  input: "#36302A",
  primary: "#FA7345",
  primaryForeground: "#FFFFFF",
  secondary: "#3E9A50",
  secondaryForeground: "#FFFFFF",
  muted: "#2A241E",
  mutedForeground: "#B8A89A",
  subtleForeground: "#8C7E70",
  ring: "#FA7345",
};
