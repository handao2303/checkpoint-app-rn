// @react-native-firebase auto-initializes from google-services.json / GoogleService-Info.plist
// Those config files must be added to mobile/ before running expo prebuild.
//
// ⚠️  SETUP REQUIRED: Add google-services.json (Android) and GoogleService-Info.plist (iOS)
//     from Firebase Console to the mobile/ directory before building.
//
// ⚠️  TECH GAP: Firebase RN requires a native build — cannot run in Expo Go.
//     Run: npx expo prebuild && npx expo run:ios   (or run:android)
import firebase from '@react-native-firebase/app';
import firestoreModule from '@react-native-firebase/firestore';

export { firebase };
export const db = firestoreModule();
export const firestore = firestoreModule;
