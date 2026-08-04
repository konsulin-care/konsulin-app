import '@testing-library/jest-dom';

// Polyfill ResizeObserver for cmdk (Command component) in jsdom
/* eslint-disable sonarjs/void-use */
globalThis.ResizeObserver = class ResizeObserver {
  // deepsource:ignore JS-0098 — no-op observer callbacks must return void, not `this`
  observe = () => {
    void this;
  };
  // deepsource:ignore JS-0098 — no-op observer callbacks must return void, not `this`
  unobserve = () => {
    void this;
  };
  // deepsource:ignore JS-0098 — no-op observer callbacks must return void, not `this`
  disconnect = () => {
    void this;
  };
};
/* eslint-enable sonarjs/void-use */

// Polyfill scrollIntoView for cmdk in jsdom
// eslint-disable-next-line @typescript-eslint/no-empty-function
Element.prototype.scrollIntoView = () => {};

// Polyfill scrollTo for card stack in jsdom
// eslint-disable-next-line @typescript-eslint/no-empty-function
Element.prototype.scrollTo = () => {};

// Polyfill window.matchMedia for vaul drawer in jsdom

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      addListener: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      removeListener: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      addEventListener: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  });
}

// Polyfill crypto.randomUUID for jsdom
if (!globalThis.crypto?.randomUUID) {
  globalThis.crypto = Object.assign({}, globalThis.crypto ?? {}, {
    randomUUID: () => '00000000-0000-0000-0000-000000000000'
  }) as Crypto;
}

// Polyfill setPointerCapture/releasePointerCapture for vaul in jsdom
// eslint-disable-next-line @typescript-eslint/no-empty-function
Element.prototype.setPointerCapture = () => {};
// eslint-disable-next-line @typescript-eslint/no-empty-function
Element.prototype.releasePointerCapture = () => {};

// Polyfill localStorage for Node 26 environments where it may be unavailable
/* eslint-disable @typescript-eslint/no-dynamic-delete */
if (globalThis.localStorage === undefined) {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach(k => delete store[k]);
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (i: number) => Object.keys(store)[i] ?? null
    },
    writable: false
  });
}
/* eslint-enable @typescript-eslint/no-dynamic-delete */
