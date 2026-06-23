import * as Location from "expo-location";
import { getItem, setItem } from "./storage";

const LOCATED_KEY = "cp.geo.located";
const AUTO_ASK_DISMISSED_KEY = "cp.geo.autoAskDismissed";

export type Coords = { lat: number; lng: number };

export function markLocated(): void {
  setItem(LOCATED_KEY, "1");
}

export function hasLocatedBefore(): boolean {
  return getItem(LOCATED_KEY) === "1";
}

export function markAutoAskDismissed(): void {
  setItem(AUTO_ASK_DISMISSED_KEY, "1");
}

export function wasAutoAskDismissed(): boolean {
  return getItem(AUTO_ASK_DISMISSED_KEY) === "1";
}

export async function getCurrentCoords(
  opts: Location.LocationOptions = { accuracy: Location.Accuracy.High },
): Promise<Coords> {
  const { coords } = await Location.getCurrentPositionAsync(opts);
  markLocated();
  return { lat: coords.latitude, lng: coords.longitude };
}

export async function requestForegroundPermissions(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function canLocateSilently(): Promise<boolean> {
  if (hasLocatedBefore()) return true;
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === "granted";
}

export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
