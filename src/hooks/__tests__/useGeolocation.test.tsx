import en from '@/messages/en/common.json';
import id from '@/messages/id/common.json';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGeolocation } from '../useGeolocation';

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn((namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      common: {
        'geolocation.not_supported': 'Geolocation not supported',
        'geolocation.unavailable': 'Location unavailable',
        'geolocation.permission_denied': 'Location permission denied',
        'geolocation.timeout': 'Location request timed out'
      }
    };
    return translations[namespace]?.[key] ?? key;
  })
}));

/** Shape of the geolocation error consumed by the hook's error callback. */
interface MockPositionError {
  code: number;
  PERMISSION_DENIED: number;
  POSITION_UNAVAILABLE: number;
  TIMEOUT: number;
}

/**
 * Build a geolocation error carrying the DOM constants the hook compares.
 *
 * @param code - error code (1 denied, 2 unavailable, 3 timeout).
 * @returns The mock error object.
 */
function geolocationError(code: number): MockPositionError {
  return {
    code,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3
  };
}

type SuccessCallback = (position: {
  coords: { latitude: number; longitude: number };
}) => void;
type ErrorCallback = (error: MockPositionError) => void;

/**
 * Replace navigator.geolocation with a scripted getCurrentPosition.
 *
 * @param impl - Receives the success and error callbacks to invoke.
 */
function stubGeolocation(
  impl: (success: SuccessCallback, error: ErrorCallback) => void
): void {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: vi.fn(impl) }
  });
}

describe('useGeolocation', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each<[number, string]>([
    [1, 'Location permission denied'],
    [2, 'Location unavailable'],
    [3, 'Location request timed out']
  ])('maps error code %i to %s', (code, expectedMessage) => {
    stubGeolocation((_success, error) => error(geolocationError(code)));

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    expect(result.current.error).toBe(expectedMessage);
  });

  it('reports Geolocation not supported without a geolocation API', () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    expect(result.current.error).toBe('Geolocation not supported');
  });

  it('sets coordinates on success', () => {
    stubGeolocation(success =>
      success({ coords: { latitude: -6.2, longitude: 106.8 } })
    );

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    expect(result.current.lat).toBe(-6.2);
    expect(result.current.lon).toBe(106.8);
    expect(result.current.error).toBeNull();
  });

  it('keeps the message keys resolvable in both locales', () => {
    const keys = [
      'not_supported',
      'unavailable',
      'permission_denied',
      'timeout'
    ] as const;

    for (const key of keys) {
      expect(en.geolocation[key]).toBeTruthy();
      expect(id.geolocation[key]).toBeTruthy();
    }
    expect(en.geolocation.unavailable).toBe('Location unavailable');
    expect(id.geolocation.unavailable).toBe('Lokasi tidak tersedia');
  });
});
