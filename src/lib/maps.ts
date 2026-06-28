// Map configuration for the native MapScreen.
// Ported from web/src/lib/maps.ts (categories + helpers). The native map uses
// an OpenStreetMap raster style defined inline in MapScreen (no API token).

import type { IconName } from '../components/ui/Icon';

// Default view (Hồ Chí Minh City) until geolocation kicks in.
// MapLibre uses GeoJSON order [longitude, latitude].
export const DEFAULT_CENTER: [number, number] = [106.7, 10.776];
export const DEFAULT_ZOOM = 12;

// Supercluster tuning — mirrors the web map.
export const CLUSTER_RADIUS = 40; // pixels
export const CLUSTER_MAX_ZOOM = 16;

// `icon` is a key into the self-hosted SVG registry (for on-screen <Icon>).
// `labelKey` is the i18n key — resolve it with `t()` at render time so the
// label re-renders on language change.
export const CATEGORIES = [
  { key: 'cafe', labelKey: 'ca_phe', icon: 'coffee', emoji: '☕' },
  { key: 'food', labelKey: 'an_uong', icon: 'food', emoji: '🍜' },
  { key: 'view', labelKey: 'ngam_canh', icon: 'mountain', emoji: '🌄' },
  { key: 'nature', labelKey: 'thien_nhien', icon: 'tree', emoji: '🌲' },
  { key: 'other', labelKey: 'khac', icon: 'pin', emoji: '📍' },
] as const satisfies ReadonlyArray<{
  key: string;
  labelKey: string;
  icon: IconName;
  emoji: string;
}>;

export type CategoryKey = (typeof CATEGORIES)[number]['key'];

/** The SVG icon name for a category (for <Icon name=...>). */
export function categoryIcon(category: string): IconName {
  return CATEGORIES.find((c) => c.key === category)?.icon ?? 'pin';
}
