/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock axios before importing getAPI
vi.mock('axios', () => {
  const mockCreate = vi.fn(() => ({
    interceptors: {
      response: { use: vi.fn() }
    }
  }));
  return {
    default: { create: mockCreate },
    create: mockCreate
  };
});

// Clear module and mock state between tests
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('getAPI', () => {
  it('creates instance with /proxy baseURL by default', async () => {
    const { getAPI } = await import('../api');
    const axios = await import('axios');

    const instance = await getAPI();

    expect(axios.default.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: '/proxy' })
    );
    expect(instance).toBeDefined();
  });

  it('creates instance with empty baseURL when proxy: false', async () => {
    const { getAPI } = await import('../api');
    const axios = await import('axios');

    const instance = await getAPI({ proxy: false });

    expect(axios.default.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: '' })
    );
    expect(instance).toBeDefined();
  });

  it('returns cached proxy instance on subsequent calls', async () => {
    const { getAPI } = await import('../api');
    const axios = await import('axios');

    const first = await getAPI();
    const second = await getAPI();

    expect(axios.default.create).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('returns cached direct instance on subsequent proxy:false calls', async () => {
    const { getAPI } = await import('../api');
    const axios = await import('axios');

    const first = await getAPI({ proxy: false });
    const second = await getAPI({ proxy: false });

    expect(axios.default.create).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('maintains separate caches for proxy and direct instances', async () => {
    const { getAPI } = await import('../api');

    const proxyInstance = await getAPI();
    const directInstance = await getAPI({ proxy: false });

    expect(proxyInstance).not.toBe(directInstance);
  });
});
