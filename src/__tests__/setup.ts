import '@testing-library/jest-dom';

// Polyfill ResizeObserver for cmdk (Command component) in jsdom
/* eslint-disable sonarjs/void-use */
globalThis.ResizeObserver = class ResizeObserver {
  observe = () => {
    void this;
  };
  unobserve = () => {
    void this;
  };
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
