import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGetExercise } from '../exercise';

// Mock the API module
vi.mock('@/services/api', async () => {
  const actual =
    await vi.importActual<Record<string, unknown>>('@/services/api');
  return {
    ...actual,
    getAPI: vi.fn()
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
  getUri: vi.fn()
};

const mockBundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  entry: [
    {
      resource: {
        resourceType: 'Media',
        id: 'media-1',
        content: {
          url: 'https://example.com/exercise.mp4',
          title: 'Squat Form Guide'
        },
        duration: 3600,
        note: [{ text: 'Keep your back straight' }]
      }
    },
    {
      resource: {
        resourceType: 'Media',
        id: 'media-2',
        content: {
          url: 'https://example.com/stretch.mp4',
          title: 'Hamstring Stretch'
        },
        duration: 1800,
        note: [{ text: 'Hold for 30 seconds' }]
      }
    }
  ]
} as const;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useGetExercise', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('fetches and transforms Media bundle into ExerciseItem array', async () => {
    const { getAPI } = await import('@/services/api');
    vi.mocked(getAPI).mockResolvedValue(
      mockAxiosInstance as unknown as AxiosInstance
    );
    mockAxiosInstance.get.mockResolvedValue({ data: mockBundle });

    const { result } = renderHook(() => useGetExercise(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const exercises = result.current.data;
    expect(exercises).toHaveLength(2);
    expect(exercises[0]).toEqual({
      id: 'media-1',
      url: 'https://example.com/exercise.mp4',
      title: 'Squat Form Guide',
      duration: 60,
      description: 'Keep your back straight'
    });
    expect(exercises[1]).toEqual({
      id: 'media-2',
      url: 'https://example.com/stretch.mp4',
      title: 'Hamstring Stretch',
      duration: 30,
      description: 'Hold for 30 seconds'
    });
  });

  it('calls /fhir/Media endpoint', async () => {
    const { getAPI } = await import('@/services/api');
    vi.mocked(getAPI).mockResolvedValue(
      mockAxiosInstance as unknown as AxiosInstance
    );
    mockAxiosInstance.get.mockResolvedValue({ data: mockBundle });

    const { result } = renderHook(() => useGetExercise(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/fhir/Media');
  });

  it('handles empty entry gracefully', async () => {
    const { getAPI } = await import('@/services/api');
    vi.mocked(getAPI).mockResolvedValue(
      mockAxiosInstance as unknown as AxiosInstance
    );
    mockAxiosInstance.get.mockResolvedValue({ data: { entry: [] } });

    const { result } = renderHook(() => useGetExercise(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('handles missing entry gracefully', async () => {
    const { getAPI } = await import('@/services/api');
    vi.mocked(getAPI).mockResolvedValue(
      mockAxiosInstance as unknown as AxiosInstance
    );
    mockAxiosInstance.get.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useGetExercise(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});
