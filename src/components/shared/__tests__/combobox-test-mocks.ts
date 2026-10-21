import { vi } from 'vitest';

/** Mutable locale switch read by the mocked useTranslations at call time. */
export const mockLocale = { current: 'en' };

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    'common.loading': 'Loading...',
    'common.no_results_found': 'No results found.'
  },
  id: {
    'common.loading': 'Memuat...',
    'common.no_results_found': 'Tidak ada hasil.'
  }
};

/**
 * vi.mock factory for '@/i18n'. Resolves the combobox loading/empty keys for
 * the locale currently set on `mockLocale`.
 *
 * @returns Mocked module exposing `useTranslations`.
 */
export function comboboxI18nMockFactory(): {
  useTranslations: (namespace: string) => (key: string) => string;
} {
  return {
    useTranslations: vi.fn(
      (namespace: string) => (key: string) =>
        TRANSLATIONS[mockLocale.current]?.[`${namespace}.${key}`] ?? key
    )
  };
}
