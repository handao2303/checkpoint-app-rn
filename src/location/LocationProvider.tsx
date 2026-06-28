/**
 * Mobile LocationProvider — wraps expo-location.
 * Ported from web/src/location/LocationProvider.tsx (browser geolocation replaced
 * with expo-location APIs).
 *
 * ⚠️  expo-location requires expo prebuild (native build). It will not work in
 *     Expo Go on iOS/Android without the managed workflow's native module.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Location from 'expo-location';
import { trackError, trackEvent } from '../lib/observability';
import { requestLocationPermission, getCurrentPosition } from '../lib/geo';

type Status = 'idle' | 'locating' | 'granted' | 'denied';

export type LocationCoords = {
  latitude: number;
  longitude: number;
};

type LocationContextValue = {
  /** Best-effort ambient location, or null if unknown/declined. */
  coords: LocationCoords | null;
  status: Status;
  /** Actively (re)request location permission and position. */
  request: () => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

/**
 * Shared ambient location for the whole app. Mount once (in RootNavigator);
 * screens read coords via useUserLocation().
 *
 * Two flavours of location, kept separate:
 *  - Ambient (this provider): best-effort, used for map centring / "near you".
 *    Auto-asks once on first mount.
 *  - Mandatory (useCheckin): check-in always asks explicitly.
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const bootstrapped = useRef(false);

  // One-time bootstrap: attempt silent locate, then ask permission once.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    let active = true;

    async function bootstrap() {
      setStatus('locating');
      trackEvent('location_auto_request', { source: 'ambient' });

      // Check existing permission first (avoids prompting unnecessarily).
      const { status: existing } = await Location.getForegroundPermissionsAsync();

      if (existing === 'granted') {
        try {
          const pos = await getCurrentPosition();
          if (!active) return;
          setCoords(pos);
          setStatus('granted');
          trackEvent('location_granted', { source: 'ambient_silent' });
        } catch (err: unknown) {
          if (!active) return;
          trackError(err, { feature: 'location', action: 'ambient_silent_locate' });
          setStatus('idle');
        }
        return;
      }

      // Permission not yet granted — request it.
      const granted = await requestLocationPermission();
      if (!active) return;

      if (granted) {
        try {
          const pos = await getCurrentPosition();
          if (!active) return;
          setCoords(pos);
          setStatus('granted');
          trackEvent('location_granted', { source: 'ambient_request' });
        } catch (err: unknown) {
          if (!active) return;
          trackError(err, { feature: 'location', action: 'ambient_request_locate' });
          setStatus('idle');
        }
      } else {
        setStatus('denied');
        trackEvent('location_denied', { source: 'ambient_request' });
      }
    }

    bootstrap().catch((err: unknown) => {
      if (!active) return;
      trackError(err, { feature: 'location', action: 'ambient_bootstrap' });
      setStatus('idle');
    });

    return () => {
      active = false;
    };
  }, []);

  const request = useCallback(() => {
    trackEvent('location_request_open', { source: 'ambient_manual' });
    let active = true;

    async function doRequest() {
      const granted = await requestLocationPermission();
      if (!active) return;

      if (granted) {
        try {
          const pos = await getCurrentPosition();
          if (!active) return;
          setCoords(pos);
          setStatus('granted');
          trackEvent('location_granted', { source: 'ambient_manual' });
        } catch (err: unknown) {
          if (!active) return;
          trackError(err, { feature: 'location', action: 'ambient_manual_locate' });
        }
      } else {
        setStatus('denied');
        trackEvent('location_denied', { source: 'ambient_manual' });
      }
    }

    doRequest().catch((err: unknown) => {
      if (!active) return;
      trackError(err, { feature: 'location', action: 'ambient_manual' });
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <LocationContext.Provider value={{ coords, status, request }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useUserLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useUserLocation must be used within a LocationProvider');
  return ctx;
}
