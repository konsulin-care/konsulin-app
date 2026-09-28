'use client';

import { useEffect, useState } from 'react';

const COOKIE_NAME = 'NEXT_LOCALE';
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export const LOCALES = ['en', 'id'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'id';

/** Read all cookies as a raw string (jsdom-safe wrapper). */
function readCookies(): string {
  // eslint-disable-next-line unicorn/no-document-cookie -- low-level cookie access required for locale persistence
  return document.cookie;
}

/** Write a cookie string (jsdom-safe wrapper). */
function writeCookie(cookie: string): void {
  // eslint-disable-next-line unicorn/no-document-cookie -- low-level cookie access required for locale persistence
  document.cookie = cookie;
}

/** Read locale from cookie. Falls back to DEFAULT_LOCALE. */
export function getLocale(): Locale {
  const match = readCookies()
    .split('; ')
    .find(row => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return DEFAULT_LOCALE;
  const value = match.split('=')[1] as Locale;
  return LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

// Shared subscriber set for locale changes
const listeners = new Set<() => void>();

/** Write locale to cookie and notify hook subscribers. */
export function setLocale(locale: Locale): void {
  writeCookie(
    `${COOKIE_NAME}=${locale}; path=/; sameSite=lax; max-age=${MAX_AGE}`
  );
  for (const listener of listeners) listener();
}

/** Client-side hook that returns the current locale and re-renders on change. */
export function useLocale(): Locale {
  const [locale, setLocaleState] = useState(getLocale);

  useEffect(() => {
    const handler = () => setLocaleState(getLocale());
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return locale;
}
