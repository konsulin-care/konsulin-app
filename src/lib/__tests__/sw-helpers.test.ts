/* eslint-disable unicorn/prefer-https */
import { describe, expect, it } from 'vitest';

/* Mirrors public/sw.js lines 42-57 */

function isSameOrigin(url: URL, selfOrigin: string): boolean {
  return url.origin === selfOrigin;
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/favicon/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/images/')
  );
}

function isProxyApi(pathname: string): boolean {
  return pathname.startsWith('/proxy/');
}

// ---------------------------------------------------------------------------
// isSameOrigin
// ---------------------------------------------------------------------------
describe('isSameOrigin', () => {
  const ORIGIN = 'http://konsulin.care';

  it('returns true when origins match exactly', () => {
    expect(isSameOrigin(new URL('http://konsulin.care/page'), ORIGIN)).toBe(
      true
    );
  });

  it('returns true for root path', () => {
    expect(isSameOrigin(new URL('http://konsulin.care/'), ORIGIN)).toBe(true);
  });

  it('returns false for different host', () => {
    expect(isSameOrigin(new URL('https://other.com/page'), ORIGIN)).toBe(false);
  });

  it('returns false for different protocol', () => {
    expect(isSameOrigin(new URL('https://konsulin.care/page'), ORIGIN)).toBe(
      false
    );
  });

  it('returns false for different port', () => {
    expect(
      isSameOrigin(new URL('http://konsulin.care:8080/page'), ORIGIN)
    ).toBe(false);
  });

  it('returns false for subdomain', () => {
    expect(
      isSameOrigin(new URL('https://app.konsulin.care/page'), ORIGIN)
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isStaticAsset
// ---------------------------------------------------------------------------
describe('isStaticAsset', () => {
  it.each([
    { path: '/_next/static/chunk.js', label: '/_next/static/' },
    { path: '/favicon/icon.ico', label: '/favicon/' },
    { path: '/icons/192.png', label: '/icons/' },
    { path: '/images/logo.svg', label: '/images/' }
  ])('matches $label prefix', ({ path }) => {
    expect(isStaticAsset(path)).toBe(true);
  });

  it.each([
    { path: '/api/data' },
    { path: '/page' },
    { path: '/static/js/file.js' },
    { path: '/' },
    { path: '' }
  ])('rejects non-matching path "$path"', ({ path }) => {
    expect(isStaticAsset(path)).toBe(false);
  });

  it.each([
    { path: '/IMAGES/logo.svg' },
    { path: '/_NEXT/static/foo.js' },
    { path: '/FAVICON/icon.ico' }
  ])('is case-sensitive — rejects $path', ({ path }) => {
    expect(isStaticAsset(path)).toBe(false);
  });

  it.each([
    { path: '/_next/static' },
    { path: '/images' },
    { path: '/icons' },
    { path: '/favicon' }
  ])('rejects prefix match without trailing slash — $path', ({ path }) => {
    expect(isStaticAsset(path)).toBe(false);
  });

  it.each([{ path: '/images-something/foo' }, { path: '/icons-custom/bar' }])(
    'rejects deeply nested unrelated path — $path',
    ({ path }) => {
      expect(isStaticAsset(path)).toBe(false);
    }
  );
});

// ---------------------------------------------------------------------------
// isProxyApi
// ---------------------------------------------------------------------------
describe('isProxyApi', () => {
  it.each([
    { path: '/proxy/fhir/Patient' },
    { path: '/proxy/' },
    { path: '/proxy/api/config' }
  ])('matches /proxy/ prefix — $path', ({ path }) => {
    expect(isProxyApi(path)).toBe(true);
  });

  it.each([
    { path: '/proxy' },
    { path: '/api/data' },
    { path: '/page' },
    { path: '/' },
    { path: '' }
  ])('rejects non-matching path "$path"', ({ path }) => {
    expect(isProxyApi(path)).toBe(false);
  });

  it('is case-sensitive — rejects /PROXY/fhir', () => {
    expect(isProxyApi('/PROXY/fhir')).toBe(false);
  });
});
