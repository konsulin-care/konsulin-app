/* eslint-disable @typescript-eslint/unbound-method */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { Bundle } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { submitFhirBundle, useFhirBundleSubmit } from '../fhir-bundle';

// Mock the API module — getAPI becomes vi.fn()
vi.mock('@/services/api', async () => {
  const actual =
    await vi.importActual<Record<string, unknown>>('@/services/api');
  return {
    ...actual,
    getAPI: vi.fn()
  };
});

import { getAPI } from '@/services/api';

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
} as unknown as AxiosInstance;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const sampleBundle: Bundle = {
  resourceType: 'Bundle',
  type: 'transaction',
  entry: [
    {
      resource: {
        resourceType: 'PractitionerRole',
        id: 'role-1',
        active: true
      },
      request: { method: 'PUT', url: 'PractitionerRole/role-1' }
    }
  ]
};

describe('submitFhirBundle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('posts the bundle to /fhir and returns response data', async () => {
    const responseData: Bundle = {
      resourceType: 'Bundle',
      type: 'transaction-response',
      entry: [{ response: { status: '200' } }]
    };
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({ data: responseData });

    const result = await submitFhirBundle(sampleBundle);

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/fhir', sampleBundle);
    expect(result).toEqual(responseData);
  });

  it('throws when the POST request fails', async () => {
    const error = new Error('Network error');
    vi.mocked(mockAxiosInstance.post).mockRejectedValue(error);

    await expect(submitFhirBundle(sampleBundle)).rejects.toThrow(error);
  });
});

describe('useFhirBundleSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('submits the bundle via mutation and returns response data', async () => {
    const responseData: Bundle = {
      resourceType: 'Bundle',
      type: 'transaction-response'
    };
    vi.mocked(mockAxiosInstance.post).mockResolvedValue({ data: responseData });

    const { result } = renderHook(() => useFhirBundleSubmit(), {
      wrapper: createWrapper()
    });

    result.current.mutate(sampleBundle);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(responseData);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/fhir', sampleBundle);
  });

  it('sets error state on failure', async () => {
    const error = new Error('Server error');
    vi.mocked(mockAxiosInstance.post).mockRejectedValue(error);

    const { result } = renderHook(() => useFhirBundleSubmit(), {
      wrapper: createWrapper()
    });

    result.current.mutate(sampleBundle);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});
