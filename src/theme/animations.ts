// Animation tokens ported from web/src/index.css
// Maps CSS cubic-bezier easing curves + durations to Reanimated equivalents.
//
// Web animations reference:
//   --ease-standard:  cubic-bezier(0.2, 0.8, 0.2, 1)   → spring standard
//   --ease-emphasized: cubic-bezier(0.2, 0.9, 0.1, 1)  → spring bouncy
//   slide-down:     0.38s cubic-bezier(0.34, 1.56, 0.64, 1) — overshoot bounce
//   slide-up-in:    0.42s cubic-bezier(0.34, 1.56, 0.64, 1)
//   scale-pop:      0.5s  cubic-bezier(0.34, 1.56, 0.64, 1)
//   xp-count-pop:   0.62s cubic-bezier(0.34, 1.56, 0.64, 1)
//   slide-up-fade:  0.25s ease-in
//   slide-down-out: 0.32s ease-in
//   fade-in/out:    0.3s  ease

import { withSpring, withTiming, Easing } from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Spring configs
// ---------------------------------------------------------------------------

/**
 * Bouncy spring — matches cubic-bezier(0.34, 1.56, 0.64, 1) with overshoot.
 * Used for: slide-down, slide-up-in, scale-pop, xp-count-pop, sheet enter.
 */
export const bouncySpring = {
  damping: 12,
  stiffness: 180,
  mass: 0.8,
} as const;

/**
 * Standard spring — matches --ease-standard cubic-bezier(0.2, 0.8, 0.2, 1).
 * Used for general UI transitions without overshoot.
 */
export const standardSpring = {
  damping: 20,
  stiffness: 200,
} as const;

/**
 * Emphasized spring — matches --ease-emphasized cubic-bezier(0.2, 0.9, 0.1, 1).
 * Slightly more energetic than standard, less than bouncy.
 */
export const emphasizedSpring = {
  damping: 16,
  stiffness: 220,
  mass: 0.9,
} as const;

export const springs = {
  bouncy:     bouncySpring,
  standard:   standardSpring,
  emphasized: emphasizedSpring,
} as const;

// ---------------------------------------------------------------------------
// Timing configs
// ---------------------------------------------------------------------------

/** 250ms — slide-up-fade, slide-down-out exits */
export const fastTiming = {
  duration: 250,
  easing: Easing.out(Easing.ease),
} as const;

/** 380ms — slide-down enter (0.38s from web) */
export const mediumTiming = {
  duration: 380,
  easing: Easing.out(Easing.ease),
} as const;

/** 500ms — scale-pop, general slow transitions */
export const slowTiming = {
  duration: 500,
  easing: Easing.out(Easing.ease),
} as const;

/** 300ms — fade-in / fade-out */
export const fadeTiming = {
  duration: 300,
  easing: Easing.ease,
} as const;

export const timings = {
  fast:   fastTiming,
  medium: mediumTiming,
  slow:   slowTiming,
  fade:   fadeTiming,
} as const;

// ---------------------------------------------------------------------------
// Animation durations (ms) — matches web keyframe durations
// ---------------------------------------------------------------------------
export const duration = {
  fadeIn:       300,
  fadeOut:      300,
  slideDown:    380,   // web: 0.38s
  slideUpFade:  250,   // web: 0.25s
  slideUpIn:    420,   // web: 0.42s
  slideDownOut: 320,   // web: 0.32s
  scalePop:     500,   // web: 0.5s
  glowBadge:    2000,  // web: 2s infinite
  confettiFall: 1100,  // web: 1.1s
  xpBurst:      1150,  // web: 1.15s
  xpSparkle:    1050,  // web: 1.05s
  xpCountPop:   620,   // web: 0.62s + 0.1s delay
  mapFetchLoop: 1150,  // web: 1.15s infinite
} as const;

// ---------------------------------------------------------------------------
// Reanimated animation factory helpers
// ---------------------------------------------------------------------------

/** Sheet / bottom drawer enter: slide up from off-screen (y=600 → 0) */
export const sheetEnter = () => withSpring(0, bouncySpring);

/** Sheet / bottom drawer exit: slide down off-screen (0 → 600) */
export const sheetExit = () => withTiming(600, fastTiming);

/** Fade in an element (opacity 0 → 1) */
export const fadeIn = () => withTiming(1, fadeTiming);

/** Fade out an element (opacity 1 → 0) */
export const fadeOut = () => withTiming(0, fadeTiming);

/** Scale pop: bring element from 0.4 → 1 with bounce */
export const scalePop = () => withSpring(1, bouncySpring);

/** Standard slide down enter from above (translateY -100 → 0) */
export const slideDownEnter = () => withSpring(0, bouncySpring);

/** Standard slide up exit to above (translateY 0 → -100) */
export const slideUpExit = () => withTiming(-100, fastTiming);
