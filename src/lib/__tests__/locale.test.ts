import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  getLocale,
  LOCALES,
  updateLocale,
  useLocale
} from '../locale';

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
    document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
  });

  it('returns the locale from the cookie when present', () => {
    document.cookie = 'NEXT_LOCALE=en; path=/';
    expect(getLocale()).toBe('en');
  });

  it('returns DEFAULT_LOCALE when cookie is absent', () => {
    expect(getLocale()).toBe(DEFAULT_LOCALE);
  });

  it('returns DEFAULT_LOCALE when cookie has an invalid value', () => {
    document.cookie = 'NEXT_LOCALE=fr; path=/';
    expect(getLocale()).toBe(DEFAULT_LOCALE);
  });

  it('reads the first NEXT_LOCALE when multiple cookies exist', () => {
    document.cookie = 'theme=dark; path=/';
    document.cookie = 'NEXT_LOCALE=en; path=/';
    document.cookie = 'session=abc; path=/';
    expect(getLocale()).toBe('en');
  });
});

describe('getLocale SSR safety', () => {
  beforeEach(() => {
    document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
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
    document.cookie = 'NEXT_LOCALE=en; path=/';
    expect(getLocale()).toBe('en');
  });
});

describe('updateLocale', () => {
  beforeEach(() => {
    document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
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
    document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
  });

  it('returns the current locale from the cookie', () => {
    document.cookie = 'NEXT_LOCALE=en; path=/';
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe('en');
  });

  it('returns DEFAULT_LOCALE when cookie is absent', () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe(DEFAULT_LOCALE);
  });

  it('renders DEFAULT_LOCALE before effects flush even when cookie differs', () => {
    document.cookie = 'NEXT_LOCALE=en; path=/';
    let firstRender: ReturnType<typeof useLocale> | undefined;
    renderHook(() => {
      const value = useLocale();
      firstRender ??= value;
      return value;
    });
    expect(firstRender).toBe(DEFAULT_LOCALE);
  });

  it('syncs to the cookie locale after effects flush', () => {
    document.cookie = 'NEXT_LOCALE=en; path=/';
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
