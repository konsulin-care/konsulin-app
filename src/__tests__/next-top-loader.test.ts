import { describe, expect, it } from 'vitest';

// Dynamic import of the wrapper component — verifies it resolves
// the double-wrapped CJS export from nextjs-toploader.
describe('next-top-loader', () => {
  it('exports a default component as a function', async () => {
    const mod = await import('@/components/next-top-loader');
    expect(mod).toHaveProperty('default');
    expect(typeof mod.default).toBe('function');
  });
});
