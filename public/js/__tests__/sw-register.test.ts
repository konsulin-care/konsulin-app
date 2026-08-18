import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for public/js/sw-register.js (classic non-module script).
 *
 * The script has no exports — it runs as side effects on load.
 * We test indirectly by controlling globals before dynamic import,
 * then asserting against navigator.serviceWorker mocks.
 *
 * Critical constraint: the file MUST be a classic script (no ES module
 * syntax) so it can load via strategy='beforeInteractive' without
 * type='module'. Module scripts are deferred by spec and would run
 * AFTER chunk JS, defeating the purpose.
 */

// import.meta.url is a scheme:// URL under vitest's jsdom env, not file —
// resolve via import.meta.dirname so readFileSync can read the script.
const SW_REGISTER_PATH = resolve(import.meta.dirname, '../sw-register.js');

function mockServiceWorker(overrides = {}) {
  return {
    // vitest's mockResolvedValue type requires an explicit argument
    // eslint-disable-next-line unicorn/no-useless-undefined
    register: vi.fn().mockResolvedValue(undefined),
    getRegistrations: vi.fn().mockResolvedValue([]),
    ...overrides
  };
}

function setHostname(hostname: string) {
  Object.defineProperty(globalThis, 'location', {
    value: { hostname },
    writable: true,
    configurable: true
  });
}

describe('sw-register (classic script)', () => {
  let origSW: ServiceWorkerContainer | undefined;

  beforeEach(() => {
    origSW = navigator.serviceWorker;
  });

  afterEach(() => {
    // navigator.serviceWorker is read-only in the TS DOM lib; jsdom allows
    // redefinition, so restore it via defineProperty instead of assignment.
    Object.defineProperty(navigator, 'serviceWorker', {
      value: origSW,
      configurable: true
    });
    vi.restoreAllMocks();
  });

  describe('classic-script compliance', () => {
    it('contains no ES module export syntax', () => {
      const src = readFileSync(SW_REGISTER_PATH, 'utf8');
      expect(src).not.toMatch(/\bexport\b/);
    });

    it('contains no top-level await', () => {
      const src = readFileSync(SW_REGISTER_PATH, 'utf8');
      // Allow await inside .then() callbacks but not at top level
      const offenders = src
        .split('\n')
        .map(line => line.trim())
        .filter(trimmed => trimmed.startsWith('await '));
      expect(offenders).toEqual([]);
    });
  });

  describe('isLocalHost detection', () => {
    it.each([
      ['localhost', true],
      ['127.0.0.1', true],
      ['app.localhost', true],
      ['myapp.localhost', true],
      ['example.com', false],
      // Test fixture, not a real deployment target
      // eslint-disable-next-line sonarjs/no-hardcoded-ip
      ['192.168.1.1', false],
      ['0.0.0.0', false]
    ])('hostname "%s" → isLocalHost=%s', async (host, expected) => {
      setHostname(host);
      const sw = mockServiceWorker();
      Object.defineProperty(navigator, 'serviceWorker', {
        value: sw,
        configurable: true
      });

      vi.resetModules();
      await import('../sw-register.js');

      if (expected) {
        expect(sw.register).not.toHaveBeenCalled();
      } else {
        expect(sw.register).toHaveBeenCalledWith('/sw.js');
      }
    });
  });

  describe('localhost behavior', () => {
    it('skips registration on localhost', async () => {
      setHostname('localhost');
      const sw = mockServiceWorker();
      Object.defineProperty(navigator, 'serviceWorker', {
        value: sw,
        configurable: true
      });

      vi.resetModules();
      await import('../sw-register.js');

      expect(sw.register).not.toHaveBeenCalled();
    });

    it('unregisters existing SWs on localhost', async () => {
      setHostname('localhost');
      const mockReg = { unregister: vi.fn() };
      const sw = mockServiceWorker({
        getRegistrations: vi.fn().mockResolvedValue([mockReg])
      });
      Object.defineProperty(navigator, 'serviceWorker', {
        value: sw,
        configurable: true
      });

      vi.resetModules();
      await import('../sw-register.js');

      expect(mockReg.unregister).toHaveBeenCalledOnce();
    });

    it('handles multiple existing SW registrations', async () => {
      setHostname('localhost');
      const reg1 = { unregister: vi.fn() };
      const reg2 = { unregister: vi.fn() };
      const sw = mockServiceWorker({
        getRegistrations: vi.fn().mockResolvedValue([reg1, reg2])
      });
      Object.defineProperty(navigator, 'serviceWorker', {
        value: sw,
        configurable: true
      });

      vi.resetModules();
      await import('../sw-register.js');

      expect(reg1.unregister).toHaveBeenCalledOnce();
      expect(reg2.unregister).toHaveBeenCalledOnce();
    });
  });

  describe('production behavior', () => {
    it('registers /sw.js on production host', async () => {
      setHostname('example.com');
      const sw = mockServiceWorker();
      Object.defineProperty(navigator, 'serviceWorker', {
        value: sw,
        configurable: true
      });

      vi.resetModules();
      await import('../sw-register.js');

      expect(sw.register).toHaveBeenCalledWith('/sw.js');
    });
  });

  describe('missing API', () => {
    it('does nothing when serviceWorker API is absent', async () => {
      setHostname('example.com');
      // Reflect.deleteProperty bypasses the TS readonly check and actually
      // removes the key so `'serviceWorker' in navigator` is false.
      Reflect.deleteProperty(navigator, 'serviceWorker');

      vi.resetModules();
      // Should not throw — module must resolve without the SW API
      await expect(import('../sw-register.js')).resolves.toBeDefined();
    });
  });
});
