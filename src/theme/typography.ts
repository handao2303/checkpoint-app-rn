// Typography tokens ported from web/src/index.css
// Font families match --font-display, --font-body, --font-mono.
// Font weights match the web --font-weight-* custom properties.

// ---------------------------------------------------------------------------
// Font families
// These string values must match the keys passed to useFonts() in App.tsx.
// ---------------------------------------------------------------------------
export const fontFamily = {
  /** Headings + display text (h1, h2, h3, .font-display) */
  display: 'Montserrat_700Bold',
  /** Body text */
  body:    'Montserrat_400Regular',
  bodyMedium: 'Montserrat_500Medium',
  bodySemiBold: 'Montserrat_600SemiBold',
  /** Monospaced / data / numeric readouts */
  mono:    'BeVietnamPro_400Regular',
  monoMedium: 'BeVietnamPro_500Medium',
  monoSemiBold: 'BeVietnamPro_600SemiBold',
  monoBold: 'BeVietnamPro_700Bold',
} as const;

// ---------------------------------------------------------------------------
// Font weights (numeric — RN accepts both string '700' and number 700)
// Matches web --font-weight-* tokens (note: web uses unusually light defaults)
// ---------------------------------------------------------------------------
export const fontWeight = {
  light:     '300',
  normal:    '300',
  medium:    '400',
  semibold:  '500',
  bold:      '600',
  extrabold: '700',
} as const;

// ---------------------------------------------------------------------------
// Font size scale (sp / logical pixels)
// Mirrors Tailwind's default type scale used across the web app.
// ---------------------------------------------------------------------------
export const fontSize = {
  xs:   10,
  sm:   12,
  base: 14,
  md:   16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,
  '6xl': 48,
} as const;

// ---------------------------------------------------------------------------
// Line height scale
// ---------------------------------------------------------------------------
export const lineHeight = {
  tight:   1.25,
  snug:    1.375,
  normal:  1.5,
  relaxed: 1.625,
  loose:   2,
} as const;

// ---------------------------------------------------------------------------
// Letter spacing
// ---------------------------------------------------------------------------
export const letterSpacing = {
  tighter: -0.5,
  tight:   -0.25,
  normal:  0,
  wide:    0.25,
  /** Matches web h1/h2/h3 letter-spacing: -0.01em at ~28px */
  display: -0.28,
} as const;

// ---------------------------------------------------------------------------
// Convenience preset text styles for common use-cases
// ---------------------------------------------------------------------------
export const textStyles = {
  h1: {
    fontFamily: fontFamily.display,
    fontSize:   fontSize['3xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.display,
    lineHeight: fontSize['3xl'] * lineHeight.tight,
  },
  h2: {
    fontFamily: fontFamily.display,
    fontSize:   fontSize['2xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.display,
    lineHeight: fontSize['2xl'] * lineHeight.tight,
  },
  h3: {
    fontFamily: fontFamily.display,
    fontSize:   fontSize.xl,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.display,
    lineHeight: fontSize.xl * lineHeight.snug,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.base,
    fontWeight: fontWeight.normal,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  bodySmall: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: fontSize.sm * lineHeight.normal,
  },
  caption: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: fontSize.xs * lineHeight.normal,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.sm * lineHeight.snug,
  },
  button: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.base,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  mono: {
    fontFamily: fontFamily.mono,
    fontSize:   fontSize.base,
    fontWeight: fontWeight.medium,
  },
} as const;
