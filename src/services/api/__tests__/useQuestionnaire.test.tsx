/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useQuestionnaire } from '../assessment';

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<any>('@/services/api');
  return {
    ...actual,
    getAPI: vi.fn()
  };
});

// Track useQuery options passed by useQuestionnaire
let capturedQueryOptions: Record<string, unknown> | null = null;

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<any>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: (options: any) => {
      capturedQueryOptions = options;
      return actual.useQuery(options);
    }
  };
});

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  request: vi.fn(),
  defaults: {},
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() }
  },
  getUri: vi.fn(),
  create: vi.fn()
} as any;

describe('useQuestionnaire', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    capturedQueryOptions = null;
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should set staleTime to 30000ms', async () => {
    const { getAPI } = await import('@/services/api');
    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        entry: [
          {
            resource: {
              resourceType: 'Questionnaire',
              id: 'q-123',
              title: 'Test',
              status: 'active'
            }
          }
        ]
      }
    });

    renderHook(() => useQuestionnaire('q-123'), { wrapper });

    expect(capturedQueryOptions?.staleTime).toBe(30_000);
  });

  it('should set retry to 1', async () => {
    const { getAPI } = await import('@/services/api');
    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        entry: [
          {
            resource: {
              resourceType: 'Questionnaire',
              id: 'q-123',
              title: 'Test',
              status: 'active'
            }
          }
        ]
      }
    });

    renderHook(() => useQuestionnaire('q-123'), { wrapper });

    expect(capturedQueryOptions?.retry).toBe(1);
  });

  it('should call the API with the correct endpoint', async () => {
    const { getAPI } = await import('@/services/api');

    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        entry: [
          {
            resource: {
              resourceType: 'Questionnaire',
              id: 'q-123',
              title: 'Test',
              status: 'active'
            }
          }
        ]
      }
    });

    renderHook(() => useQuestionnaire('q-123'), { wrapper });

    await waitFor(() => {
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/fhir/Questionnaire?_id=q-123'
      );
    });
  });

  it('should return questionnaire entries on success', async () => {
    const { getAPI } = await import('@/services/api');

    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        entry: [
          {
            resource: {
              resourceType: 'Questionnaire',
              id: 'q-123',
              title: 'PHQ-9',
              status: 'active'
            }
          }
        ]
      }
    });

    const { result } = renderHook(() => useQuestionnaire('q-123'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].resource.id).toBe('q-123');
  });

  it('should return empty array when no entries exist', async () => {
    const { getAPI } = await import('@/services/api');

    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        entry: []
      }
    });

    const { result } = renderHook(() => useQuestionnaire('q-123'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});
