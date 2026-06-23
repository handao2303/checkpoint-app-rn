import { getItem, setItem, removeItem } from "./storage";

const REAL_KEY = "cp_has_real_account";
const GUEST_OUT_KEY = "cp_guest_logged_out";

export function hasRealAccount(): boolean {
  return getItem(REAL_KEY) === "1";
}

export function markRealAccount(): void {
  setItem(REAL_KEY, "1");
  removeItem(GUEST_OUT_KEY);
}

export function setGuestLoggedOut(): void {
  setItem(GUEST_OUT_KEY, "1");
}

export function clearGuestLoggedOut(): void {
  removeItem(GUEST_OUT_KEY);
}

export function isGuestLoggedOut(): boolean {
  return getItem(GUEST_OUT_KEY) === "1";
}
