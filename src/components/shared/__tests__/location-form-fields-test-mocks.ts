import { vi } from 'vitest';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  common: {
    'location.open': 'Open',
    'location.close': 'Close',
    'location.name': 'Location Name',
    'location.name_placeholder': 'Main Clinic',
    'location.address': 'Address',
    'location.longitude': 'Longitude',
    'location.latitude': 'Latitude',
    'location.select_province': 'Select Province',
    'location.select_city': 'Select City',
    'location.select_district': 'Select District',
    'location.add_time': 'Add Time',
    'location.no_hours': 'No hours set for this day',
    'location.image_alt': 'Location preview',
    'location.address_placeholder': 'Street address'
  }
};

/**
 * vi.mock factory for '@/services/api/cities'. Stubs the province/city/
 * district hooks so the form renders without network geometry data.
 *
 * @returns Mocked module exposing the three useGet* hooks.
 */
export function citiesApiMockFactory(): {
  useGetProvinces: () => { data: unknown[]; isLoading: boolean };
  useGetCities: () => { data: unknown[]; isLoading: boolean };
  useGetDistricts: () => { data: unknown[]; isLoading: boolean };
} {
  return {
    useGetProvinces: () => ({ data: [], isLoading: false }),
    useGetCities: () => ({ data: [], isLoading: false }),
    useGetDistricts: () => ({ data: [], isLoading: false })
  };
}

/**
 * vi.mock factory for '@/i18n'. Resolves the location form keys and falls
 * back to the key itself for unknown keys.
 *
 * @returns Mocked module exposing `useTranslations`.
 */
export function locationFormFieldsI18nMockFactory(): {
  useTranslations: (namespace: string) => (key: string) => string;
} {
  return {
    useTranslations: vi.fn(
      (namespace: string) => (key: string) =>
        TRANSLATIONS[namespace]?.[key] ?? key
    )
  };
}
