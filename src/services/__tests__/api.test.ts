/* eslint-disable @typescript-eslint/unbound-method */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock axios before importing getAPI
vi.mock('axios', () => {
  const mockCreate = vi.fn(() => ({
    interceptors: {
      request: { use: vi.fn() },
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

interface InterceptorRegistration {
  interceptors: {
    response: {
      use: ReturnType<typeof vi.fn>;
    };
  };
}

/** Returns the error handler registered on the mocked axios response interceptor. */
async function getInterceptorErrorHandler(): Promise<
  (error: unknown) => Promise<unknown>
> {
  const { getAPI } = await import('../api');
  const axios = await import('axios');

  await getAPI();

  const createMock = vi.mocked(axios.default.create);
  const instance = createMock.mock.results[0]?.value as unknown as
    InterceptorRegistration | undefined;
  const useMock = instance?.interceptors.response.use;
  // setupLimiterInterceptors registers the release-slot handler first (index 0);
  // setupResponseInterceptor registers the ApiError mapper second (index 1).
  const errorHandler = useMock?.mock.calls[1]?.[1] as
    ((error: unknown) => Promise<unknown>) | undefined;

  if (!errorHandler) {
    throw new Error('response interceptor was not registered');
  }

  return errorHandler;
}

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

  describe('multipart option', () => {
    it('creates instance without Content-Type header when multipart: true', async () => {
      const { getAPI } = await import('../api');
      const axios = await import('axios');

      const instance = await getAPI({ proxy: false, multipart: true });

      expect(axios.default.create).toHaveBeenCalledWith(
        expect.objectContaining({ headers: {} })
      );
      expect(instance).toBeDefined();
    });

    it('maintains separate cache for multipart direct instance', async () => {
      const { getAPI } = await import('../api');
      const axios = await import('axios');

      await getAPI({ proxy: false, multipart: true });

      // Subsequent same-config call returns cached instance
      const cached = await getAPI({ proxy: false, multipart: true });
      await getAPI({ proxy: false, multipart: true });

      // Should have created only once
      expect(axios.default.create).toHaveBeenCalledTimes(1);
      expect(cached).toBeDefined();
    });

    it('multipart instance is distinct from non-multipart direct instance', async () => {
      const { getAPI } = await import('../api');

      const direct = await getAPI({ proxy: false });
      const multipart = await getAPI({ proxy: false, multipart: true });

      expect(direct).not.toBe(multipart);
    });

    it('discriminates cache keys correctly across all four config combos', async () => {
      const { getAPI } = await import('../api');
      const axios = await import('axios');

      // Config 1: default proxy
      const p1 = await getAPI();
      const p2 = await getAPI();
      expect(p1).toBe(p2);

      // Config 2: direct
      const d1 = await getAPI({ proxy: false });
      const d2 = await getAPI({ proxy: false });
      expect(d1).toBe(d2);

      // Config 3: direct multipart
      const m1 = await getAPI({ proxy: false, multipart: true });
      const m2 = await getAPI({ proxy: false, multipart: true });
      expect(m1).toBe(m2);

      // All distinct
      expect(p1).not.toBe(d1);
      expect(d1).not.toBe(m1);
      expect(p1).not.toBe(m1);

      // Exactly 3 creates for 3 distinct configs
      expect(axios.default.create).toHaveBeenCalledTimes(3);
    });

    it('multipart: true without proxy: false defaults proxy to true and is not cached', async () => {
      const { getAPI } = await import('../api');
      const axios = await import('axios');

      // proxy defaults to true; multipart is valid but won't hit any cache branch
      const first = await getAPI({ multipart: true });
      const second = await getAPI({ multipart: true });

      expect(axios.default.create).toHaveBeenCalledTimes(2);
      expect(first).not.toBe(second);
    });
  });

  describe('response interceptor errors', () => {
    it('rejects a 400 response with an ApiError whose status is 400', async () => {
      const handler = await getInterceptorErrorHandler();
      const { ApiError } = await import('../api-error');
      const axiosError = {
        message: 'Request failed with status code 400',
        code: 'ERR_BAD_REQUEST',
        config: { url: '/fhir/QuestionnaireResponse', method: 'post' },
        response: { status: 400, data: { message: 'bad request' } }
      };

      const error = await handler(axiosError).catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as InstanceType<typeof ApiError>).status).toBe(400);
    });

    it('rejects a request with no response and code ERR_NETWORK with an ApiError whose status is undefined and code is ERR_NETWORK', async () => {
      const handler = await getInterceptorErrorHandler();
      const { ApiError } = await import('../api-error');
      const axiosError = {
        message: 'Network Error',
        code: 'ERR_NETWORK',
        config: { url: '/fhir/QuestionnaireResponse', method: 'post' }
      };

      const error = await handler(axiosError).catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as InstanceType<typeof ApiError>;
      expect(apiError.status).toBeUndefined();
      expect(apiError.code).toBe('ERR_NETWORK');
    });

    it('rejected ApiError message equals String(originalAxiosError)', async () => {
      const handler = await getInterceptorErrorHandler();
      const axiosError = {
        message: 'Request failed with status code 400',
        code: 'ERR_BAD_REQUEST',
        config: { url: '/fhir/QuestionnaireResponse', method: 'post' },
        response: { status: 400, data: { message: 'bad request' } }
      };

      const error = await handler(axiosError).catch((err: unknown) => err);

      expect((error as Error).message).toBe(String(axiosError));
    });
  });
});
