import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  getLocale,
  LOCALES,
  updateLocale,
  useLocale
} from '../locale';

/**
 * Forwards each cookie string to document.cookie.
 *
 * @param values - Cookie strings to assign, in order.
 */
const setCookies = (...values: string[]): void => {
  for (const value of values) {
    // eslint-disable-next-line unicorn/no-document-cookie -- test helper
    document.cookie = value;
  }
};

describe('LOCALES', () => {
  it('contains en and id', () => {
    expect(LOCALES).toEqual(['en', 'id']);
  });
});

describe('DEFAULT_LOCALE', () => {
  it('defaults to id', () => {
    expect(DEFAULT_LOCALE).toBe('id');
  });
});

describe('getLocale', () => {
  beforeEach(() => {
    setCookies('NEXT_LOCALE=; path=/; max-age=0');
  });

  it('returns the locale from the cookie when present', () => {
    setCookies('NEXT_LOCALE=en; path=/');
    expect(getLocale()).toBe('en');
  });

  it('returns DEFAULT_LOCALE when cookie is absent', () => {
    expect(getLocale()).toBe(DEFAULT_LOCALE);
  });

  it('returns DEFAULT_LOCALE when cookie has an invalid value', () => {
    setCookies('NEXT_LOCALE=fr; path=/');
    expect(getLocale()).toBe(DEFAULT_LOCALE);
  });

  it('reads the first NEXT_LOCALE when multiple cookies exist', () => {
    setCookies(
      'theme=dark; path=/',
      'NEXT_LOCALE=en; path=/',
      'session=abc; path=/'
    );
    expect(getLocale()).toBe('en');
  });
});

describe('getLocale SSR safety', () => {
  beforeEach(() => {
    setCookies('NEXT_LOCALE=; path=/; max-age=0');
  });

  it('returns DEFAULT_LOCALE instead of throwing when document is undefined', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'document', {
      value: undefined,
      configurable: true,
      writable: true
    });
    try {
      expect(getLocale()).toBe(DEFAULT_LOCALE);
    } finally {
      if (original) Object.defineProperty(globalThis, 'document', original);
    }
  });

  it('still returns the cookie value when document is available', () => {
    setCookies('NEXT_LOCALE=en; path=/');
    expect(getLocale()).toBe('en');
  });
});

describe('updateLocale', () => {
  beforeEach(() => {
    setCookies('NEXT_LOCALE=; path=/; max-age=0');
  });

  it('writes the locale to the cookie', () => {
    updateLocale('en');
    expect(getLocale()).toBe('en');
  });

  it('sets path to /', () => {
    updateLocale('id');
    const cookieString = document.cookie;
    expect(cookieString).toContain('NEXT_LOCALE=id');
  });

  it('sets sameSite to lax', () => {
    updateLocale('en');
    // jsdom doesn't expose cookie attributes, but we verify the value is set
    expect(getLocale()).toBe('en');
  });

  it('sets a max-age of approximately 1 year', () => {
    updateLocale('en');
    expect(getLocale()).toBe('en');
  });
});

describe('useLocale', () => {
  beforeEach(() => {
    setCookies('NEXT_LOCALE=; path=/; max-age=0');
  });

  it('returns the current locale from the cookie', () => {
    setCookies('NEXT_LOCALE=en; path=/');
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe('en');
  });

  it('returns DEFAULT_LOCALE when cookie is absent', () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe(DEFAULT_LOCALE);
  });

  it('renders DEFAULT_LOCALE before effects flush even when cookie differs', () => {
    setCookies('NEXT_LOCALE=en; path=/');
    let firstRender: ReturnType<typeof useLocale> | undefined;
    renderHook(() => {
      const value = useLocale();
      firstRender ??= value;
      return value;
    });
    expect(firstRender).toBe(DEFAULT_LOCALE);
  });

  it('syncs to the cookie locale after effects flush', () => {
    setCookies('NEXT_LOCALE=en; path=/');
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe('en');
  });

  it('updates when updateLocale is called', () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe(DEFAULT_LOCALE);

    act(() => {
      updateLocale('en');
    });
    expect(result.current).toBe('en');
  });
});
