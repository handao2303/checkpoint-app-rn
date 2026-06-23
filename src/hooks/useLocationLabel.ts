import type { Coords } from "../lib/geo";
import { useGeocode } from "./useGeocode";

export function useLocationLabel(coords: Coords | null | undefined) {
  const geo = useGeocode(coords?.lat, coords?.lng);

  return {
    locationLabel: geo?.address?.split(",")[0] ?? "Gần bạn",
    locationHint: geo?.address ?? null,
  };
}
