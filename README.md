# Checkpoint Mobile (React Native)

React Native (Expo) implementation of Checkpoint — a travel check-in app.

> **Hướng dẫn cài đặt & chạy chi tiết:** `docs/mobile-rn-setup.md`

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy & fill environment
cp .env.example .env.local
# Edit .env.local with your Supabase + API URL

# 3. Start the app
npm start

# Or run on specific platform:
npm run web      # Web browser (fastest for testing)
npm run ios      # iOS simulator (requires Xcode)
npm run android  # Android emulator (requires Android Studio)
```

## Available Scripts

| Script | Lệnh | Mô tả |
| ------ | ---- | ----- |
| Start | `npm start` | Expo dev server + QR |
| iOS | `npm run ios` | iOS simulator |
| Android | `npm run android` | Android emulator |
| Web | `npm run web` | Web browser |
| Typecheck | `npm run typecheck` | `tsc --noEmit` |
| Lint | `npm run lint` | TypeScript check |

## Environment Variables

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `EXPO_PUBLIC_API_URL` | ✅ | `http://localhost:8080` | Backend API |
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ | — | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ | — | Supabase anon key |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | ❌ | — | For comments (Firestore) |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | ❌ | — | For comments |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | ❌ | — | For comments |

## Stack

| Layer | Technology |
| ----- | ---------- |
| Framework | Expo SDK 56 (managed) |
| Navigation | expo-router (file-based) |
| State | TanStack Query v5 |
| HTTP | axios |
| Map | @maplibre/maplibre-react-native |
| Auth | @supabase/supabase-js + expo-secure-store |
| DB | @react-native-firebase/firestore (comments, notifs) |
| Media | expo-image-picker, expo-camera, expo-image-manipulator |
| i18n | i18next + react-i18next + expo-localization |
| Storage | @react-native-async-storage/async-storage |
| Styling | StyleSheet (matching web Tailwind tokens) |

## Project Structure

```
app/                          # expo-router routes (15 routes)
  _layout.tsx                 # Root: providers, auth init, splash
  index.tsx                   # Map screen (MapLibre)
  discover.tsx                # Feed + search
  create.tsx                  # Check-in form
  profile.tsx                 # Profile + passport + badges
  login.tsx                   # Auth screen
  leaderboard.tsx             # Rankings
  badges.tsx, ai-plan.tsx     # Collections
  [c]/[id].tsx                # Deep links
  [p]/[id].tsx
  [j]/[id].tsx
  [u]/[username].tsx
src/
  lib/                        # 12 files adapted from web/ (api, maps, geo, i18n...)
  services/                   # auth, firebase, comments, image, exif
  components/ui/              # Button, Card, Icon, UserAvatar, Skeleton
  hooks/                      # useAuth
  theme/                      # Design tokens
``````

## Key Differences from Web PWA

- **Camera**: Uses expo-camera (native) instead of react-webcam
- **HEIC**: Handled natively by iOS picker (no heic2any needed)
- **EXIF**: Uses expo-media-library instead of exifr
- **Maps**: Uses @maplibre/maplibre-react-native instead of react-map-gl
- **Storage**: Uses expo-secure-store + AsyncStorage instead of localStorage
- **Share**: Uses expo-sharing instead of Web Share API
- **Offline**: MMKV/local queue instead of Workbox service worker
- **Notifications**: FCM/APNs via @react-native-firebase/messaging
- **Image cache**: expo-image built-in instead of Workbox runtime cache

## Migration Status

See `docs/pwa-and-react-native-migration-analysis.md` for the full migration plan.
# checkpoint-app-rn
