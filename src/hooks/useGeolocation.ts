import { useState, useCallback, useRef } from 'react';

export type GeoState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'granted'; lat: number; lon: number }
  | { status: 'denied' }
  | { status: 'unavailable' };

const CACHE_MS = 5 * 60 * 1000; // 5 minutes

export function useGeolocation() {
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' });
  const cacheRef = useRef<{ lat: number; lon: number; at: number } | null>(null);

  const request = useCallback(() => {
    // Return cached position if still fresh
    if (cacheRef.current && Date.now() - cacheRef.current.at < CACHE_MS) {
      const { lat, lon } = cacheRef.current;
      setGeo({ status: 'granted', lat, lon });
      return;
    }

    if (!navigator?.geolocation) {
      setGeo({ status: 'unavailable' });
      return;
    }

    setGeo({ status: 'loading' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        cacheRef.current = { lat, lon, at: Date.now() };
        setGeo({ status: 'granted', lat, lon });
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        if (err.code === err.PERMISSION_DENIED) {
          setGeo({ status: 'denied' });
        } else {
          setGeo({ status: 'unavailable' });
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: CACHE_MS }
    );
  }, []);

  return { geo, request };
}
