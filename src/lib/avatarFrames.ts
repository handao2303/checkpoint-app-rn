// Avatar frame catalog — mirrors web/src/lib/avatarFrames.ts and the
// checkpoint_avatar_frames_svg/manifest.json. Frames are decorative rings baked
// into the avatar image at upload time. Level frames unlock by the user's level;
// badge frames unlock when the matching achievement badge is awarded.
//
// Frame ids are kept identical to the web app so backend-stored values match.

import { cdnUrl } from "./checkpointImages";

export type FrameTier = "Bronze" | "Silver" | "Gold" | "Emerald" | "Master";

export interface AvatarFrame {
  /** Stable id, e.g. "level-50" or "night-owl". */
  id: string;
  /** Public URL of the SVG/PNG art. */
  file: string;
  /** i18n key for the label shown in the picker. Resolve with `t()` at render
   *  time so the label re-renders on language change. */
  labelKey: string;
  /** Interpolation params for `labelKey` (e.g. the level number). */
  labelParams?: Record<string, unknown>;
  kind: "level" | "badge";
  /** Level frames only: the level that unlocks this frame. */
  level?: number;
  tier?: FrameTier;
  /** Badge frames only: the backend badge key that unlocks this frame. */
  badgeKey?: string;
}

const FRAMES_BASE = "frames";

const tierForLevel = (level: number): FrameTier => {
  if (level >= 41) return "Master";
  if (level >= 31) return "Emerald";
  if (level >= 21) return "Gold";
  if (level >= 11) return "Silver";
  return "Bronze";
};

/** Public URL of the level-range medallion icon for a level (number drawn in UI). */
export function levelTierIconUrl(level: number): string {
  return cdnUrl(`levels/level-range-${tierForLevel(level).toLowerCase()}.svg`);
}

/** Level frames 1..50, file names are zero-padded (avatar-frame-level-07.svg). */
export const LEVEL_FRAMES: AvatarFrame[] = Array.from({ length: 50 }, (_, i) => {
  const level = i + 1;
  const padded = String(level).padStart(2, "0");
  return {
    id: `level-${level}`,
    file: cdnUrl(`${FRAMES_BASE}/avatar-frame-level-${padded}.svg`),
    labelKey: "profile.frames.level",
    labelParams: { level },
    kind: "level" as const,
    level,
    tier: tierForLevel(level),
  };
});

/** Badge-themed frames, unlocked alongside their achievement badge. */
export const BADGE_FRAMES: AvatarFrame[] = [
  { id: "first-step", file: cdnUrl(`${FRAMES_BASE}/avatar-frame-first-step.svg`), labelKey: "profile.frames.firstStep", kind: "badge", badgeKey: "first_checkin" },
  { id: "explorer", file: cdnUrl(`${FRAMES_BASE}/avatar-frame-explorer.svg`), labelKey: "profile.frames.explorer", kind: "badge", badgeKey: "explorer_10" },
  { id: "country", file: cdnUrl(`${FRAMES_BASE}/avatar-frame-country.svg`), labelKey: "profile.frames.country", kind: "badge", badgeKey: "provinces_5" },
  { id: "night-owl", file: cdnUrl(`${FRAMES_BASE}/avatar-frame-night-owl.svg`), labelKey: "profile.frames.nightOwl", kind: "badge", badgeKey: "night_owl" },
  { id: "traveler", file: cdnUrl(`${FRAMES_BASE}/avatar-frame-traveler.svg`), labelKey: "profile.frames.traveler", kind: "badge", badgeKey: "journey_starter" },
];

export const LEADERBOARD_FRAMES: AvatarFrame[] = [
  { id: "leaderboard", file: cdnUrl(`${FRAMES_BASE}/avatar_frame_rank_1.png`), labelKey: "profile.frames.leaderboard", kind: "badge", badgeKey: "leaderboard" },
  { id: "leaderboard", file: cdnUrl(`${FRAMES_BASE}/avatar_frame_rank_2.png`), labelKey: "profile.frames.leaderboard", kind: "badge", badgeKey: "leaderboard" },
  { id: "leaderboard", file: cdnUrl(`${FRAMES_BASE}/avatar_frame_rank_3.png`), labelKey: "profile.frames.leaderboard", kind: "badge", badgeKey: "leaderboard" },
];

export const ALL_FRAMES: AvatarFrame[] = [...LEVEL_FRAMES, ...BADGE_FRAMES];

export function frameById(id: string | null | undefined): AvatarFrame | undefined {
  if (!id) return undefined;
  return ALL_FRAMES.find((f) => f.id === id);
}

/** Whether the user has unlocked a given frame. */
export function isFrameUnlocked(
  frame: AvatarFrame,
  level: number,
  awardedBadgeKeys: ReadonlySet<string>,
): boolean {
  if (frame.kind === "level") return level >= (frame.level ?? 1);
  return frame.badgeKey ? awardedBadgeKeys.has(frame.badgeKey) : false;
}

/**
 * Frames to show in the picker: every unlocked level frame, the next level
 * frame as a locked teaser, and all badge frames (locked ones greyed out).
 */
export function buildPickerFrames(
  level: number,
  awardedBadgeKeys: ReadonlySet<string>,
): { frame: AvatarFrame; unlocked: boolean }[] {
  const levelCap = Math.min(50, level + 1); // unlocked levels + one teaser
  const levels = LEVEL_FRAMES.filter((f) => (f.level ?? 1) <= levelCap).map((f) => ({
    frame: f,
    unlocked: level >= (f.level ?? 1),
  }));
  const badges = BADGE_FRAMES.map((f) => ({
    frame: f,
    unlocked: isFrameUnlocked(f, level, awardedBadgeKeys),
  }));
  return [...levels, ...badges];
}
