import '@testing-library/jest-dom';

// Polyfill ResizeObserver for cmdk (Command component) in jsdom
globalThis.ResizeObserver = class ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
};

// Polyfill scrollIntoView for cmdk in jsdom
// eslint-disable-next-line @typescript-eslint/no-empty-function
Element.prototype.scrollIntoView = () => {};

// Polyfill crypto.randomUUID for jsdom
if (!globalThis.crypto?.randomUUID) {
  globalThis.crypto = Object.assign({}, globalThis.crypto ?? {}, {
    randomUUID: () => '00000000-0000-0000-0000-000000000000'
  }) as Crypto;
}
