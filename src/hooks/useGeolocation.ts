'use client';

import { useTranslations } from '@/i18n';
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
  const t = useTranslations('common');
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lon: null,
    loading: false,
    error: null
  });

  const request = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Codacy FP: guard for non-secure contexts where navigator.geolocation may be absent
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: t('geolocation.not_supported')
      }));
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
        let errorMessage = t('geolocation.unavailable');
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = t('geolocation.permission_denied');
        } else if (error.code === error.TIMEOUT) {
          errorMessage = t('geolocation.timeout');
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
  }, [t]);

  return { ...state, request };
}
