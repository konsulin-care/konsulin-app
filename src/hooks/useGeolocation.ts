'use client';

import { useCallback, useState } from 'react';

interface GeolocationState {
  lat: number | null;
  lon: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for browser geolocation.
 *
 * Returns current coordinates and loading state.
 * Uses low accuracy for faster results (3s timeout).
 *
 * @returns GeolocationState with lat, lon, loading, error
 */
export function useGeolocation(): GeolocationState & { request: () => void } {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lon: null,
    loading: false,
    error: null
  });

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation not supported' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    // Geolocation is required for distance-based recommendations
    // eslint-disable-next-line sonarjs/no-intrusive-permissions
    navigator.geolocation.getCurrentPosition(
      position => {
        setState({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          loading: false,
          error: null
        });
      },
      error => {
        let errorMessage = 'Location unavailable';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location permission denied';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Location request timed out';
        }
        setState({
          lat: null,
          lon: null,
          loading: false,
          error: errorMessage
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 3000,
        maximumAge: 300_000 // 5min cache
      }
    );
  }, []);

  return { ...state, request };
}
