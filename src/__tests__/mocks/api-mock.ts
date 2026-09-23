import type { AxiosInstance } from 'axios';
import { vi } from 'vitest';

interface ApiMockResult {
  getAPI: ReturnType<typeof vi.fn>;
  mockGet: ReturnType<typeof vi.fn>;
  mockPost: ReturnType<typeof vi.fn>;
}

/**
 * Create API mocks for getAPI and its methods.
 * @param overrides - Optional mock function overrides
 */
export function mockGetAPI(overrides?: {
  get?: ReturnType<typeof vi.fn>;
  post?: ReturnType<typeof vi.fn>;
}): ApiMockResult {
  const mockGet =
    overrides?.get ?? vi.fn().mockResolvedValue({ data: { entry: [] } });
  const mockPost = overrides?.post ?? vi.fn().mockResolvedValue({ data: {} });

  return {
    getAPI: vi.fn().mockResolvedValue({
      get: mockGet,
      post: mockPost
    } as unknown as AxiosInstance),
    mockGet,
    mockPost
  };
}
