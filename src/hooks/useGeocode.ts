import { useState, useEffect } from "react";

interface GeoResult {
  address: string;
  province: string;
}

const cache = new Map<string, GeoResult>();

export function useGeocode(lat: number | undefined, lng: number | undefined) {
  const [result, setResult] = useState<GeoResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) return;

    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = cache.get(key);
    if (cached) {
      setResult(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const props = data.features?.[0]?.properties;
        if (props) {
          const city = props.city || props.town || props.village || props.county || "";
          const country = props.country || "";
          const address = [props.name, city, country].filter(Boolean).join(", ");
          const province = props.state || city;
          const geo: GeoResult = { address, province };
          cache.set(key, geo);
          setResult(geo);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [lat, lng]);

  return { ...result, loading };
}
