// Web Firebase initialization — used by comments.ts for web platform.
// Native Firebase is initialized via @react-native-firebase/app (auto-config).

import { Platform } from "react-native";

let _db: any = null;

export function getFirebaseDb(): any {
  if (Platform.OS !== "web") return null;
  if (_db) return _db;

  try {
    // Dynamic import for web only
    const { initializeApp } = require("firebase/app");
    const { getFirestore } = require("firebase/firestore");

    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

    if (apiKey && projectId) {
      const app = initializeApp({ apiKey, projectId, appId }, "checkpoint-web");
      _db = getFirestore(app);
    }
  } catch {
    console.warn("Firebase web not configured");
  }

  return _db;
}

export const db = getFirebaseDb();
