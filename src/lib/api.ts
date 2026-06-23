import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { t } from "./i18n";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";

const ACCESS_KEY = "cp_access_token";
const REFRESH_KEY = "cp_refresh_token";

// Token storage — uses SecureStore on native, AsyncStorage fallback on web.
const tokenStore = {
  async get(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch {
      // non-fatal
    }
  },
  async remove(key: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {
      // non-fatal
    }
  },
};

const http = axios.create({
  baseURL: API_URL,
  validateStatus: () => true,
});

// ---- Token management ----
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export async function initTokens(): Promise<void> {
  _accessToken = await tokenStore.get(ACCESS_KEY);
  _refreshToken = await tokenStore.get(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  return _accessToken;
}

async function setTokens(access: string, refresh: string): Promise<void> {
  _accessToken = access;
  _refreshToken = refresh;
  await tokenStore.set(ACCESS_KEY, access);
  await tokenStore.set(REFRESH_KEY, refresh);
}

async function clearTokens(): Promise<void> {
  _accessToken = null;
  _refreshToken = null;
  await tokenStore.remove(ACCESS_KEY);
  await tokenStore.remove(REFRESH_KEY);
}

// ---- Error types ----
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---- Auth expired handler ----
let onAuthExpired: (() => void) | null = null;
export function setAuthExpiredHandler(fn: (() => void) | null) {
  onAuthExpired = fn;
}

// ---- DTOs ----

export interface User {
  id: string;
  email?: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  role: string;
  is_anonymous: boolean;
  total_xp: number;
  level: number;
  checkpoint_count: number;
  journey_count: number;
  checkin_streak: number;
  created_at: string;
  updated_at: string;
  xp_to_next: number;
  level_progress: number;
}

export interface PublicUserSummary {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export interface Checkpoint {
  id: string;
  user_id: string;
  name: string;
  category: string;
  note?: string;
  rating?: number;
  lat: number;
  lng: number;
  address?: string;
  journey_id?: string;
  image_url?: string;
  thumbnail_url?: string;
  media_type?: "image" | "video";
  xp_awarded: number;
  view_count: number;
  taken_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CheckpointImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  type: "image" | "video";
  sort_order: number;
  pending?: boolean;
}

export interface CheckpointDetail {
  checkpoint: Checkpoint;
  images: CheckpointImage[];
  author: { username: string; display_name?: string; avatar_url?: string };
}

export interface CheckinInput {
  name: string;
  category: string;
  note?: string;
  rating?: number;
  lat: number;
  lng: number;
  address?: string;
  province?: string;
  province_code?: string;
  taken_at?: string;
  place_id?: string;
  journey_id?: string;
  images: { object_key: string; thumbnail_key?: string; type?: "image" | "video" }[];
}

export interface CheckinResult {
  checkpoint: Checkpoint;
  xp_awarded: number;
  total_xp: number;
  level: number;
  new_badges?: Badge[];
}

export interface Badge {
  key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  level: number;
}

export interface UploadSlot {
  upload_url: string;
  object_key: string;
  thumbnail_upload_url: string;
  thumbnail_key: string;
}

export type UploadMediaType = "image" | "video";

export interface UploadSlotRequest {
  media: { type: UploadMediaType }[];
}

export interface Bounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface Place {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address?: string;
  checkin_count: number;
  avg_rating?: number;
  image_count: number;
  cover_image_url?: string;
  cover_thumbnail_url?: string;
  viewer_has_checked_in?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaceReview {
  note: string;
  rating?: number;
  created_at: string;
  author: { username: string; display_name?: string; avatar_url?: string };
}

export interface PlaceDetail {
  place: Place;
  avg_rating?: number;
  images: { id: string; url: string; thumbnail_url?: string }[];
  reviews: PlaceReview[];
  checkins: FeedItem[];
}

export interface PlaceSuggestion {
  name: string;
  category: string;
  place_id: string;
}

export interface NearbyPlacesResponse {
  places: Place[];
  next_offset?: number;
  total?: number;
}

export interface FeedItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  note?: string;
  rating?: number;
  lat: number;
  lng: number;
  address?: string;
  place_id?: string;
  xp_awarded: number;
  created_at: string;
  author: { username: string; display_name?: string; avatar_url?: string };
  image_url?: string;
  thumbnail_url?: string;
  media_type?: "image" | "video";
  distance_m: number;
}

export interface FeedPage {
  items: FeedItem[];
  next_cursor?: string;
}

export type LatLng = { lat: number; lng: number };

export interface Journey {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  is_active: boolean;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

export interface JourneyStop {
  id: string;
  name: string;
  category: string;
  note?: string;
  address?: string;
  lat: number;
  lng: number;
  place_id?: string;
  image_url?: string;
  thumbnail_url?: string;
  media_type?: "image" | "video";
  created_at: string;
}

export interface JourneyDetail {
  journey: Journey;
  stats: { checkpoint_count: number; total_xp: number; distance_km: number };
  checkpoints: JourneyStop[];
}

export interface PassportStamp {
  province: string;
  province_code: string | null;
  checkin_count: number;
  first_at: string;
  last_at: string;
  cover_url?: string;
}

export interface Passport {
  province_count: number;
  stamps: PassportStamp[];
}

export interface UserBadge extends Badge {
  awarded: boolean;
  awarded_at?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  total_xp: number;
  level: number;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  me?: LeaderboardEntry;
}

export interface ReactionSummary {
  counts: Record<string, number>;
  total: number;
  mine?: string | null;
}

export interface DriveStatus {
  connected: boolean;
  email?: string;
  connected_at?: string;
}

export interface PhotosStatus {
  connected: boolean;
}

// ---- Re-auth ----
let reauthInFlight: Promise<boolean> | null = null;

async function ensureFreshToken(): Promise<boolean> {
  reauthInFlight ??= reauth().finally(() => {
    reauthInFlight = null;
  });
  return reauthInFlight;
}

async function reauth(): Promise<boolean> {
  if (_refreshToken) {
    try {
      const res = await http.post("/auth/refresh", { refresh_token: _refreshToken });
      if (isSuccessful(res)) {
        await setTokens(res.data.access_token, res.data.refresh_token);
        return true;
      }
    } catch {
      // fall through
    }
  }
  await clearTokens();
  return false;
}

function isSuccessful(res: AxiosResponse): boolean {
  return res.status >= 200 && res.status < 300;
}

// ---- Authenticated request ----
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<AxiosResponse> {
  const headers = new Headers(init.headers);
  if (_accessToken) headers.set("Authorization", `Bearer ${_accessToken}`);
  const axiosHeaders: Record<string, string> = {};
  headers.forEach((value, key) => {
    axiosHeaders[key] = value;
  });
  const config: AxiosRequestConfig = {
    method: init.method ?? "GET",
    headers: axiosHeaders,
    data: init.body,
    signal: init.signal ?? undefined,
  };
  const res = await http.request({ ...config, url: path });
  if (res.status === 401 && retry) {
    if (await ensureFreshToken()) return apiFetch(path, init, false);
    onAuthExpired?.();
  }
  return res;
}

// ---- Auth endpoints ----

export async function exchange(supabaseToken: string): Promise<User> {
  const res = await http.post("/auth/exchange", { supabase_token: supabaseToken });
  if (!isSuccessful(res)) throw new Error(`exchange failed: ${res.status}`);
  await setTokens(res.data.access_token, res.data.refresh_token);
  return res.data.user as User;
}

export async function loginWithPassword(identifier: string, password: string): Promise<User> {
  const res = await http.post("/auth/login", { identifier, password });
  if (!isSuccessful(res)) {
    throw new Error(res.status === 401 ? t("login.invalid") : t("common.error"));
  }
  await setTokens(res.data.access_token, res.data.refresh_token);
  return res.data.user as User;
}

export async function getMe(): Promise<User> {
  const res = await apiFetch("/users/me");
  if (!isSuccessful(res)) throw new Error(`getMe failed: ${res.status}`);
  return res.data as User;
}

export async function logoutFromBackend(): Promise<void> {
  if (_refreshToken) {
    try {
      await http.post("/auth/logout", { refresh_token: _refreshToken });
    } catch {
      // best-effort
    }
  }
  await clearTokens();
}

// ---- User endpoints ----

export async function getUserProfile(ref: string): Promise<User> {
  const res = await apiFetch(`/users/${encodeURIComponent(ref)}`);
  if (!isSuccessful(res)) throw new Error(`load user failed: ${res.status}`);
  return res.data as User;
}

export async function getUsersByIDs(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];
  const res = await apiFetch(`/users/by-ids?ids=${encodeURIComponent(ids.join(","))}`);
  if (!isSuccessful(res)) throw new Error(`load users by ids failed: ${res.status}`);
  return res.data as User[];
}

export async function getUserFollowers(ref: string): Promise<PublicUserSummary[]> {
  const res = await apiFetch(`/users/${encodeURIComponent(ref)}/followers`);
  if (!isSuccessful(res)) throw new Error(`load followers failed: ${res.status}`);
  return res.data as PublicUserSummary[];
}

export async function getUserFollowingList(ref: string): Promise<PublicUserSummary[]> {
  const res = await apiFetch(`/users/${encodeURIComponent(ref)}/following-list`);
  if (!isSuccessful(res)) throw new Error(`load following users failed: ${res.status}`);
  return res.data as PublicUserSummary[];
}

export async function updateProfile(patch: {
  display_name?: string;
  bio?: string;
  username?: string;
}): Promise<User> {
  const res = await apiFetch("/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!isSuccessful(res)) {
    if (res.status === 409) throw new Error(t("profile.usernameTaken"));
    if (res.status === 400) throw new Error(t("profile.usernameInvalid"));
    throw new Error(`updateProfile failed: ${res.status}`);
  }
  return res.data as User;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const res = await apiFetch(`/users/${encodeURIComponent(username)}`);
  if (res.status === 404) return true;
  if (isSuccessful(res)) return false;
  throw new Error(`check username failed: ${res.status}`);
}

export async function uploadAvatar(file: File | { uri: string; type: string; name: string }): Promise<User> {
  const form = new FormData();
  if (file instanceof File) {
    form.append("avatar", file);
  } else {
    form.append("avatar", {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as unknown as Blob);
  }
  const res = await apiFetch("/users/me/avatar", { method: "POST", body: form });
  if (res.status === 415) throw new Error(t("profile.imageTypeError"));
  if (!isSuccessful(res)) throw new Error(`uploadAvatar failed: ${res.status}`);
  return res.data as User;
}

// ---- Checkpoint endpoints ----

export async function getCheckpointsInBounds(
  b: Bounds,
  opts?: { category?: string; filter?: string },
): Promise<Checkpoint[]> {
  const p = new URLSearchParams({
    bbox: `${b.minLng},${b.minLat},${b.maxLng},${b.maxLat}`,
    limit: "300",
  });
  if (opts?.category && opts.category !== "all") p.set("category", opts.category);
  if (opts?.filter && opts.filter !== "all") p.set("filter", opts.filter);
  const res = await apiFetch(`/checkpoints?${p}`);
  if (!isSuccessful(res)) throw new Error("load checkpoints failed");
  return res.data.checkpoints ?? [];
}

export async function createCheckpoint(input: CheckinInput): Promise<CheckinResult> {
  const res = await apiFetch("/checkpoints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!isSuccessful(res)) throw new ApiError(res.status, `create checkpoint failed: ${res.status}`);
  return res.data;
}

export async function getCheckpointDetail(id: string): Promise<CheckpointDetail> {
  const res = await apiFetch(`/checkpoints/${id}`);
  if (!isSuccessful(res)) throw new Error("load checkpoint failed");
  return res.data;
}

export async function getMyCheckpoints(limit = 30, provinceCode?: string): Promise<Checkpoint[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (provinceCode) params.set("province_code", provinceCode);
  const res = await apiFetch(`/checkpoints/me?${params}`);
  if (!isSuccessful(res)) throw new Error("load my checkpoints failed");
  return res.data.checkpoints ?? [];
}

export async function getMyCheckpointPage({
  limit = 20,
  cursor,
}: {
  limit?: number;
  cursor?: string;
} = {}): Promise<{ checkpoints: Checkpoint[]; next_cursor?: string }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const res = await apiFetch(`/checkpoints/me?${params}`);
  if (!isSuccessful(res)) throw new Error("load my checkpoints failed");
  return { checkpoints: res.data.checkpoints ?? [], next_cursor: res.data.next_cursor };
}

export async function getUserCheckpoints(userId: string, limit = 30, provinceCode?: string): Promise<Checkpoint[]> {
  const params = new URLSearchParams({ user_id: userId, limit: String(limit) });
  if (provinceCode) params.set("province_code", provinceCode);
  const res = await apiFetch(`/checkpoints/by-user?${params}`);
  if (!isSuccessful(res)) throw new Error("load user checkpoints failed");
  return res.data.checkpoints ?? [];
}

export async function deleteCheckpoint(id: string): Promise<void> {
  const res = await apiFetch(`/checkpoints/${id}`, { method: "DELETE" });
  if (!isSuccessful(res)) throw new Error(`delete checkpoint failed: ${res.status}`);
}

export async function updateCheckpoint(
  id: string,
  patch: { name: string; note?: string | null; rating?: number | null },
): Promise<Checkpoint> {
  const res = await apiFetch(`/checkpoints/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!isSuccessful(res)) throw new Error(`update checkpoint failed: ${res.status}`);
  return res.data as Checkpoint;
}

export async function getUploadSlots(count: number): Promise<UploadSlot[]> {
  const res = await apiFetch("/checkpoints/upload-slots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
  if (!isSuccessful(res)) throw new Error(`get upload slots failed: ${res.status}`);
  return res.data.slots as UploadSlot[];
}

export async function putFilesToSlots(
  slots: UploadSlot[],
  files: { original: Blob | { uri: string }; thumbnail?: Blob | { uri: string }; type: UploadMediaType }[],
): Promise<void> {
  const puts = slots.flatMap((slot, i) => {
    const arr = [
      fetch(slot.upload_url, {
        method: "PUT",
        body: files[i].original as BodyInit,
        headers: { "Content-Type": "application/octet-stream" },
      }),
    ];
    if (files[i].type === "image" && files[i].thumbnail) {
      arr.push(
        fetch(slot.thumbnail_upload_url, {
          method: "PUT",
          body: files[i].thumbnail as BodyInit,
          headers: { "Content-Type": "image/jpeg" },
        }),
      );
    }
    return arr;
  });
  const results = await Promise.all(puts);
  const failed = results.find((r) => !r.ok);
  if (failed) throw new Error(`R2 upload failed: ${failed.status}`);
}

// ---- Place / Discover endpoints ----

export async function searchPlaces(q: string, near?: LatLng): Promise<Place[]> {
  const p = new URLSearchParams({ q });
  if (near) {
    p.set("lat", String(near.lat));
    p.set("lng", String(near.lng));
  }
  const res = await apiFetch(`/places/search?${p}`);
  if (!isSuccessful(res)) throw new Error("search failed");
  return res.data.places ?? [];
}

export async function getPopularPlaces(near?: LatLng): Promise<Place[]> {
  const p = new URLSearchParams({ limit: "10" });
  if (near) {
    p.set("lat", String(near.lat));
    p.set("lng", String(near.lng));
  }
  const res = await apiFetch(`/places/popular?${p}`);
  if (!isSuccessful(res)) throw new Error("popular failed");
  return res.data.places ?? [];
}

export async function getPlace(id: string, opts?: { limit?: number; offset?: number }): Promise<PlaceDetail> {
  const { limit = 20, offset = 0 } = opts ?? {};
  const res = await apiFetch(`/places/${id}?limit=${limit}&offset=${offset}`);
  if (!isSuccessful(res)) throw new Error("load place failed");
  return res.data;
}

export async function getNearbyPlaces(lat: number, lng: number): Promise<PlaceSuggestion[]> {
  try {
    const res = await apiFetch(`/places/suggest?lat=${lat}&lng=${lng}`);
    if (!isSuccessful(res)) return [];
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

export async function getNearbyAppPlaces(
  at: LatLng,
  opts?: { limit?: number; offset?: number; category?: string; sort?: "distance" | "popular" }
): Promise<NearbyPlacesResponse> {
  const { limit = 20, offset = 0, category, sort } = opts ?? {};
  const p = new URLSearchParams({
    lat: String(at.lat),
    lng: String(at.lng),
    limit: String(limit),
    offset: String(offset),
  });
  if (category && category !== "all") p.set("category", category);
  if (sort) p.set("sort", sort);
  const res = await apiFetch(`/places/nearby?${p}`);
  if (!isSuccessful(res)) throw new Error("load nearby places failed");
  const places = res.data.places ?? [];
  return {
    places,
    next_offset: places.length === limit ? offset + limit : undefined,
    total: res.data.total,
  };
}

export async function getFeed(at: LatLng, cursor?: string): Promise<FeedPage> {
  const p = new URLSearchParams({ lat: String(at.lat), lng: String(at.lng), limit: "15" });
  if (cursor) p.set("cursor", cursor);
  const res = await apiFetch(`/discover/feed?${p}`);
  if (!isSuccessful(res)) throw new Error("load feed failed");
  return res.data;
}

export async function getFeedFollowing(at: LatLng, cursor?: string): Promise<FeedPage> {
  const p = new URLSearchParams({ lat: String(at.lat), lng: String(at.lng), limit: "15" });
  if (cursor) p.set("cursor", cursor);
  const res = await apiFetch(`/discover/feed/following?${p}`);
  if (!isSuccessful(res)) throw new Error("load following feed failed");
  return res.data;
}

// ---- Follow ----

export async function getFollowing(): Promise<string[]> {
  if (!_accessToken) return [];
  const res = await apiFetch("/users/following");
  if (!isSuccessful(res)) return [];
  return res.data.ids ?? [];
}

export async function followUser(ref: string): Promise<void> {
  const res = await apiFetch(`/users/${encodeURIComponent(ref)}/follow`, { method: "POST" });
  if (!isSuccessful(res)) throw new Error(`follow failed: ${res.status}`);
}

export async function unfollowUser(ref: string): Promise<void> {
  const res = await apiFetch(`/users/${encodeURIComponent(ref)}/follow`, { method: "DELETE" });
  if (!isSuccessful(res)) throw new Error(`unfollow failed: ${res.status}`);
}

// ---- Reactions ----

export async function getReactions(id: string): Promise<ReactionSummary> {
  const res = await apiFetch(`/checkpoints/${id}/reactions`);
  if (!isSuccessful(res)) throw new Error("load reactions failed");
  return res.data;
}

export async function setReaction(id: string, reaction: string): Promise<ReactionSummary> {
  const res = await apiFetch(`/checkpoints/${id}/reaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reaction }),
  });
  if (!isSuccessful(res)) throw new Error(`set reaction failed: ${res.status}`);
  return res.data;
}

export async function clearReaction(id: string): Promise<ReactionSummary> {
  const res = await apiFetch(`/checkpoints/${id}/reaction`, { method: "DELETE" });
  if (!isSuccessful(res)) throw new Error(`clear reaction failed: ${res.status}`);
  return res.data;
}

// ---- Views ----

export async function viewCheckpoint(id: string): Promise<void> {
  try {
    await apiFetch(`/checkpoints/${id}/view`, { method: "POST" });
  } catch {
    // fire-and-forget
  }
}

// ---- Journeys ----

export async function getMyJourneys(): Promise<Journey[]> {
  const res = await apiFetch("/journeys/me");
  if (!isSuccessful(res)) throw new Error("load journeys failed");
  return res.data.journeys ?? [];
}

export async function getJourney(id: string): Promise<JourneyDetail> {
  const res = await apiFetch(`/journeys/${id}`);
  if (!isSuccessful(res)) throw new Error("load journey failed");
  return res.data;
}

export async function createJourney(title: string, description?: string): Promise<Journey> {
  const res = await apiFetch("/journeys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description }),
  });
  if (!isSuccessful(res)) throw new Error("create journey failed");
  return res.data;
}

export async function updateJourney(
  id: string,
  patch: { title?: string; description?: string; is_active?: boolean },
): Promise<Journey> {
  const res = await apiFetch(`/journeys/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!isSuccessful(res)) throw new Error("update journey failed");
  return res.data;
}

export async function deleteJourney(id: string, deleteCheckpoints = false): Promise<void> {
  const mode = deleteCheckpoints ? "delete" : "detach";
  const res = await apiFetch(`/journeys/${id}?checkpoints=${mode}`, { method: "DELETE" });
  if (!isSuccessful(res)) throw new Error(`delete journey failed: ${res.status}`);
}

export async function assignCheckpointsToJourney(journeyId: string, checkpointIds: string[]): Promise<void> {
  const res = await apiFetch(`/journeys/${journeyId}/checkpoints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ checkpoint_ids: checkpointIds }),
  });
  if (!isSuccessful(res)) throw new Error("assign checkpoints to journey failed");
}

// ---- Gamification ----

export async function getPassport(): Promise<Passport> {
  const res = await apiFetch("/me/passport");
  if (!isSuccessful(res)) throw new Error(`getPassport failed: ${res.status}`);
  return res.data as Passport;
}

export async function getUserPassport(ref: string): Promise<Passport> {
  const res = await apiFetch(`/users/${encodeURIComponent(ref)}/passport`);
  if (!isSuccessful(res)) throw new Error(`getUserPassport failed: ${res.status}`);
  return res.data as Passport;
}

export async function getLeaderboard(): Promise<Leaderboard> {
  const res = await apiFetch("/leaderboard");
  if (!isSuccessful(res)) throw new Error(`getLeaderboard failed: ${res.status}`);
  return res.data as Leaderboard;
}

export async function getBadges(): Promise<UserBadge[]> {
  const res = await apiFetch("/me/badges");
  if (!isSuccessful(res)) throw new Error(`getBadges failed: ${res.status}`);
  return res.data as UserBadge[];
}

// ---- Integrations ----

export async function initDriveConnect(): Promise<{ auth_url: string }> {
  const res = await apiFetch("/integrations/drive/init", { method: "POST" });
  if (!isSuccessful(res)) throw new Error("drive init failed");
  return res.data as { auth_url: string };
}

export async function getDriveStatus(): Promise<DriveStatus> {
  const res = await apiFetch("/integrations/drive/status");
  if (!isSuccessful(res)) throw new Error("drive status failed");
  return res.data as DriveStatus;
}

export async function disconnectDrive(): Promise<void> {
  const res = await apiFetch("/integrations/drive/disconnect", { method: "DELETE" });
  if (!isSuccessful(res)) throw new Error("drive disconnect failed");
}

export async function initPhotosConnect(): Promise<{ auth_url: string }> {
  const res = await apiFetch("/integrations/photos/init", { method: "POST" });
  if (!isSuccessful(res)) throw new Error("photos init failed");
  return res.data as { auth_url: string };
}

export async function getPhotosStatus(): Promise<PhotosStatus> {
  const res = await apiFetch("/integrations/photos/status");
  if (!isSuccessful(res)) throw new Error("photos status failed");
  return res.data as PhotosStatus;
}

export async function disconnectPhotos(): Promise<void> {
  const res = await apiFetch("/integrations/photos/disconnect", { method: "DELETE" });
  if (!isSuccessful(res)) throw new Error("photos disconnect failed");
}
