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
  const ORIGIN = 'https://konsulin.id';

  it('returns true when origins match exactly', () => {
    expect(isSameOrigin(new URL('https://konsulin.id/page'), ORIGIN)).toBe(
      true
    );
  });

  it('returns true for root path', () => {
    expect(isSameOrigin(new URL('https://konsulin.id/'), ORIGIN)).toBe(true);
  });

  it('returns false for different host', () => {
    expect(isSameOrigin(new URL('https://other.com/page'), ORIGIN)).toBe(false);
  });

  it('returns false for different protocol', () => {
    expect(isSameOrigin(new URL('http://konsulin.id/page'), ORIGIN)).toBe(
      false
    );
  });

  it('returns false for different port', () => {
    expect(isSameOrigin(new URL('https://konsulin.id:8080/page'), ORIGIN)).toBe(
      false
    );
  });

  it('returns false for subdomain', () => {
    expect(isSameOrigin(new URL('https://app.konsulin.id/page'), ORIGIN)).toBe(
      false
    );
  });
});

// ---------------------------------------------------------------------------
// isStaticAsset
// ---------------------------------------------------------------------------
describe('isStaticAsset', () => {
  it('matches /_next/static/ prefix', () => {
    expect(isStaticAsset('/_next/static/chunk.js')).toBe(true);
  });

  it('matches /favicon/ prefix', () => {
    expect(isStaticAsset('/favicon/icon.ico')).toBe(true);
  });

  it('matches /icons/ prefix', () => {
    expect(isStaticAsset('/icons/192.png')).toBe(true);
  });

  it('matches /images/ prefix', () => {
    expect(isStaticAsset('/images/logo.svg')).toBe(true);
  });

  it('rejects non-matching pathnames', () => {
    expect(isStaticAsset('/api/data')).toBe(false);
    expect(isStaticAsset('/page')).toBe(false);
    expect(isStaticAsset('/static/js/file.js')).toBe(false);
    expect(isStaticAsset('/')).toBe(false);
    expect(isStaticAsset('')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(isStaticAsset('/IMAGES/logo.svg')).toBe(false);
    expect(isStaticAsset('/_NEXT/static/foo.js')).toBe(false);
    expect(isStaticAsset('/FAVICON/icon.ico')).toBe(false);
  });

  it('rejects prefix match without trailing slash', () => {
    expect(isStaticAsset('/_next/static')).toBe(false);
    expect(isStaticAsset('/images')).toBe(false);
    expect(isStaticAsset('/icons')).toBe(false);
    expect(isStaticAsset('/favicon')).toBe(false);
  });

  it('rejects deeply nested unrelated paths', () => {
    expect(isStaticAsset('/images-something/foo')).toBe(false);
    expect(isStaticAsset('/icons-custom/bar')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isProxyApi
// ---------------------------------------------------------------------------
describe('isProxyApi', () => {
  it('matches /proxy/ prefix', () => {
    expect(isProxyApi('/proxy/fhir/Patient')).toBe(true);
    expect(isProxyApi('/proxy/')).toBe(true);
    expect(isProxyApi('/proxy/api/config')).toBe(true);
  });

  it('rejects /proxy without trailing slash', () => {
    expect(isProxyApi('/proxy')).toBe(false);
  });

  it('rejects non-proxy paths', () => {
    expect(isProxyApi('/api/data')).toBe(false);
    expect(isProxyApi('/page')).toBe(false);
    expect(isProxyApi('/')).toBe(false);
    expect(isProxyApi('')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(isProxyApi('/PROXY/fhir')).toBe(false);
  });
});
