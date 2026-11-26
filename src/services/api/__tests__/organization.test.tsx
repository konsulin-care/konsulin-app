import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrganizationName } from '../organization';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';

const mockAxios = { get: vi.fn() };

function makeWrapper(queryClient: QueryClient) {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

describe('useOrganizationName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(
      mockAxios as unknown as Awaited<ReturnType<typeof getAPI>>
    );
  });

  it('GETs /fhir/Organization/<id> and returns its name', async () => {
    mockAxios.get.mockResolvedValue({
      data: { resourceType: 'Organization', id: 'org-1', name: 'Klinik A' }
    });

    const { result } = renderHook(() => useOrganizationName('org-1'), {
      wrapper: makeWrapper(makeQueryClient())
    });

    await waitFor(() => {
      expect(result.current.data).toBe('Klinik A');
    });

    expect(mockAxios.get).toHaveBeenCalledWith('/fhir/Organization/org-1');
  });

  it('makes no request without an organization id', () => {
    const { result } = renderHook(() => useOrganizationName(undefined), {
      wrapper: makeWrapper(makeQueryClient())
    });

    expect(result.current.isPending).toBe(true);
    expect(mockAxios.get).not.toHaveBeenCalled();
  });
});
