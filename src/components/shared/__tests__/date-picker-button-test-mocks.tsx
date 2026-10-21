import type { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';

/** Mutable locale switch read by the mocked useTranslations at call time. */
export const mockLocale = { current: 'en' };

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    'common.date_picker.pick_a_date': 'Pick a date',
    'common.date_picker.select_date': 'Select Date'
  },
  id: {
    'common.date_picker.pick_a_date': 'Pilih tanggal',
    'common.date_picker.select_date': 'Pilih Tanggal'
  }
};

/**
 * vi.mock factory for '@/i18n'. Resolves the date-picker keys for the locale
 * currently set on `mockLocale`.
 *
 * @returns Mocked module exposing `useTranslations`.
 */
export function datePickerI18nMockFactory(): {
  useTranslations: (namespace: string) => (key: string) => string;
} {
  return {
    useTranslations: vi.fn(
      (namespace: string) => (key: string) =>
        TRANSLATIONS[mockLocale.current]?.[`${namespace}.${key}`] ?? key
    )
  };
}

/**
 * vi.mock factory for '@/components/ui/app-drawer'. Renders a flat div so
 * tests can assert open state and title without Radix internals.
 *
 * @returns Mocked module exposing the drawer default export.
 */
export function appDrawerMockFactory(): {
  default: (props: {
    children: ReactNode;
    open: boolean;
    title?: string;
  }) => ReactElement;
} {
  return {
    default: ({
      children,
      open,
      title
    }: {
      children: ReactNode;
      open: boolean;
      title?: string;
    }) => (
      <div data-testid='drawer-root' data-open={open}>
        {title && <div data-testid='drawer-title'>{title}</div>}
        {open && children}
      </div>
    )
  };
}

/**
 * vi.mock factory for '@/components/ui/calendar-base'. Stands in for the
 * calendar with a single button that selects Mar 15, 2026.
 *
 * @returns Mocked module exposing `CalendarBase`.
 */
export function calendarBaseMockFactory(): {
  CalendarBase: (props: {
    mode: string;
    onSelect?: (date: unknown) => void;
  }) => ReactElement;
} {
  return {
    CalendarBase: ({
      mode,
      onSelect
    }: {
      mode: string;
      onSelect?: (date: unknown) => void;
    }) => (
      <div data-testid='calendar-base' data-mode={mode}>
        <button
          type='button'
          onClick={() => onSelect?.(new Date('2026-03-15'))}
        >
          Select Mar 15
        </button>
      </div>
    )
  };
}
