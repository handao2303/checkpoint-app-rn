// Firebase initialization support.
// Web: Uses firebase/web SDK with dynamic imports
// Native: Uses @react-native-firebase (requires native plugin in app.json)
// Note: Firebase is optional — comments/notifications degrade gracefully when not configured.

import { Platform } from "react-native";

let _db: any = null;

export function getFirebaseDb(): any {
  if (_db) return _db;

  if (Platform.OS === "web") {
    // Web Firebase is initialized lazily via dynamic import in comments/notifications
    return null;
  }

  // Native: requires @react-native-firebase plugin in app.json
  try {
    const firestore = require("@react-native-firebase/firestore");
    _db = firestore.default();
  } catch {
    console.warn("Firebase native not configured");
  }

  return _db;
}

export const db = getFirebaseDb();
