// Design tokens ported from web/src/index.css
// Raw palette + semantic tokens for light and dark mode.

/** Full primary (orange) scale */
export const primary = {
  50:  '#FFF0E8',
  100: '#FFE0D1',
  200: '#FFC2A8',
  300: '#FF9A70',
  400: '#FA7345',
  500: '#F05A28',
  600: '#D94C20',
  700: '#B83B18',
  800: '#8F2A0C',
  900: '#74240D',
  DEFAULT: '#F05A28',
} as const;

/** Clay (warm brown-red) scale */
export const clay = {
  50:  '#FBEEE9',
  100: '#F4D3C7',
  200: '#E3A892',
  300: '#CF7B5F',
  400: '#BE5538',
  500: '#B23A1F',
  600: '#9A311A',
  700: '#7E2814',
  800: '#641F10',
  900: '#4E190D',
  DEFAULT: '#B23A1F',
} as const;

/** Green (achievement / XP) scale */
export const green = {
  50:  '#EAF5EC',
  100: '#CDE8D2',
  200: '#A6D4AE',
  300: '#6FB97C',
  400: '#3E9A50',
  500: '#2F8A52',
  600: '#287745',
  700: '#216338',
  800: '#14501A',
  900: '#0E3D13',
  DEFAULT: '#2F8A52',
} as const;

/** Accent (vivid red-orange) scale */
export const accent = {
  50:  '#FEEFEC',
  100: '#FCD3CB',
  200: '#F8A697',
  300: '#F47A63',
  400: '#F25C42',
  500: '#EF4329',
  600: '#D6361E',
  700: '#B22A17',
  DEFAULT: '#EF4329',
} as const;

/** Neutral (warm grey) scale */
export const neutral = {
  0:   '#FFFDF8',
  50:  '#FFF8F1',
  100: '#F7EDE2',
  200: '#EEDFD1',
  300: '#E6CBB6',
  400: '#BBAA9A',
  500: '#7A6B5F',
  600: '#5C4D42',
  700: '#403229',
  800: '#2A211C',
  900: '#1D1511',
  DEFAULT: '#7A6B5F',
} as const;

/** Status / social one-off tokens */
export const status = {
  gold:    '#E0A73A',
  success: '#2E7D32',
  warning: '#F59E0B',
  danger:  '#DC2626',
  info:    '#2563EB',
} as const;

export const social = {
  facebook: '#1877F2',
  apple:    '#111111',
} as const;

// ---------------------------------------------------------------------------
// Semantic tokens — light mode (matches :root in index.css)
// ---------------------------------------------------------------------------
export const light = {
  background:        '#FFF8F1',
  foreground:        '#2A211C',
  surface:           '#FFFDF8',
  surfaceMuted:      '#FFF1EA',
  border:            '#EEDFD1',
  input:             '#EEDFD1',

  primary:           '#F05A28',
  primaryForeground: '#FFFFFF',
  secondary:         green[700],
  secondaryForeground: '#FFFFFF',

  muted:             '#F7EDE2',
  mutedForeground:   '#7A6B5F',
  subtleForeground:  '#9A8C80',
  ring:              '#F05A28',
} as const;

// ---------------------------------------------------------------------------
// Semantic tokens — dark mode (matches .dark in index.css)
// ---------------------------------------------------------------------------
export const dark = {
  background:        '#16130F',
  foreground:        '#F5F0E8',
  surface:           '#211C17',
  surfaceMuted:      '#2A241E',
  border:            '#36302A',
  input:             '#36302A',

  primary:           primary[400],   // #FA7345
  primaryForeground: '#1A1206',
  secondary:         green[400],     // #3E9A50
  secondaryForeground: '#0E3D13',

  muted:             '#2A241E',
  mutedForeground:   '#B6AC9D',
  subtleForeground:  '#7C7567',
  ring:              primary[400],
} as const;

// ---------------------------------------------------------------------------
// Gradient stop arrays (for react-native-linear-gradient or Expo LinearGradient)
// ---------------------------------------------------------------------------
export const gradients = {
  /** Main CTA button — 135deg */
  primaryCTA: ['#FF8A3D', '#F4511E'] as const,
  /** Passport badge — 150deg */
  badge:      ['#C2410C', '#9A3412'] as const,
  /** XP bar — 90deg */
  xp:         ['#1B5E20', '#4CAF50'] as const,
} as const;

// ---------------------------------------------------------------------------
// Convenience flat export used in StyleSheet contexts
// ---------------------------------------------------------------------------
export const colors = {
  ...primary,
  primary: primary.DEFAULT,
  primaryDark: primary[600],
  clay: clay.DEFAULT,
  green: green.DEFAULT,
  neutral: neutral.DEFAULT,
  accent: accent.DEFAULT,
  gold: status.gold,
  surface: light.surface,
  surfaceMuted: light.surfaceMuted,
  foreground: light.foreground,
  foregroundMuted: neutral[500],
  // dark mode convenience
  darkBg: dark.background,
  darkSurface: dark.surface,
  darkForeground: dark.foreground,
} as const;
