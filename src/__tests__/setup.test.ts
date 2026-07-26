import { describe, expect, it, vi } from 'vitest';

describe('test setup polyfills', () => {
  it('ResizeObserver exists globally', () => {
    expect(globalThis.ResizeObserver).toBeDefined();
  });

  it('ResizeObserver can be instantiated', () => {
    const instance = new globalThis.ResizeObserver(vi.fn());
    expect(instance).toBeInstanceOf(globalThis.ResizeObserver);
  });

  it('observe does not throw', () => {
    const instance = new globalThis.ResizeObserver(vi.fn());
    expect(() => instance.observe(document.body)).not.toThrow();
  });

  it('unobserve does not throw', () => {
    const instance = new globalThis.ResizeObserver(vi.fn());
    expect(() => instance.unobserve(document.body)).not.toThrow();
  });

  it('disconnect does not throw', () => {
    const instance = new globalThis.ResizeObserver(vi.fn());
    expect(() => instance.disconnect()).not.toThrow();
  });

  it('each method returns undefined', () => {
    const instance = new globalThis.ResizeObserver(vi.fn());
    expect(instance.observe(document.body)).toBeUndefined();
    expect(instance.unobserve(document.body)).toBeUndefined();
    expect(instance.disconnect()).toBeUndefined();
  });
});
