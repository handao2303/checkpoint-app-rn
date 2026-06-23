// Map configuration. OpenFreeMap is fully free and needs no API token.
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

// Default view (Hồ Chí Minh City) until geolocation kicks in.
export const DEFAULT_VIEW = { longitude: 106.7, latitude: 10.776, zoom: 12 };

export const CATEGORIES = [
  { key: "cafe", labelKey: "ca_phe", emoji: "☕" },
  { key: "food", labelKey: "an_uong", emoji: "🍜" },
  { key: "view", labelKey: "ngam_canh", emoji: "🌄" },
  { key: "nature", labelKey: "thien_nhien", emoji: "🌲" },
  { key: "other", labelKey: "khac", emoji: "📍" },
] as const;

export function categoryIcon(category: string): string {
  const map: Record<string, string> = {
    cafe: "coffee",
    food: "utensils",
    view: "mountain",
    nature: "tree",
    other: "pin",
  };
  return map[category] ?? "pin";
}
