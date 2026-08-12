import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { Person } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  apiRequest: vi.fn(),
  getAPI: vi.fn()
}));

import { apiRequest, getAPI } from '@/services/api';
import { getProfileById, useUpdateProfile } from '@/services/profile';

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

const personFixture: Person = {
  resourceType: 'Person',
  id: 'person-1',
  active: true,
  name: [{ use: 'official', given: ['Jane'], family: 'Doe' }],
  telecom: [{ system: 'email', value: 'jane@konsulin.care' }]
};

describe('profile service — Person resource support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches a Person profile by FHIR id and type', async () => {
    vi.mocked(apiRequest).mockResolvedValue(personFixture);

    const result = await getProfileById('person-1', 'Person');

    expect(apiRequest).toHaveBeenCalledWith('GET', '/fhir/Person/person-1');
    expect(result).toEqual(personFixture);
  });

  it('PUTs a full Person resource via useUpdateProfile', async () => {
    const mockPut = vi.fn().mockResolvedValue({ data: personFixture });
    vi.mocked(getAPI).mockResolvedValue({
      ...mockAxiosInstance,
      put: mockPut
    } as unknown as AxiosInstance);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ payload: personFixture });
    });

    expect(mockPut).toHaveBeenCalledWith(
      '/fhir/Person/person-1',
      personFixture
    );
  });
});
