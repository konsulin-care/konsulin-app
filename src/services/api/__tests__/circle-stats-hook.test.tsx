import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCircleStats } from '../circle';

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

const CANONICAL_QUERY =
  '/fhir/Communication?sender=Patient/DG3F3STPYZ6HX25A&topic=research-referral&_elements=recipient&_count=500';

describe('useCircleStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(
      mockAxios as unknown as Awaited<ReturnType<typeof getAPI>>
    );
  });

  it('queries the user referral Communications and derives stats', async () => {
    mockAxios.get.mockResolvedValue({
      data: {
        entry: [
          {
            resource: {
              resourceType: 'Communication',
              id: 'c1',
              status: 'completed',
              recipient: [{ reference: 'Patient/A' }]
            }
          },
          {
            resource: {
              resourceType: 'Communication',
              id: 'c2',
              status: 'completed',
              recipient: [{ reference: 'Patient/B' }]
            }
          }
        ]
      }
    });

    const { result } = renderHook(() => useCircleStats('DG3F3STPYZ6HX25A'), {
      wrapper: makeWrapper(makeQueryClient())
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toEqual({ converted: 2, joined: 2 });
    expect(mockAxios.get).toHaveBeenCalledWith(CANONICAL_QUERY);
  });

  it('is disabled without a fhirId', () => {
    const { result } = renderHook(() => useCircleStats(), {
      wrapper: makeWrapper(makeQueryClient())
    });

    expect(result.current.isPending).toBe(true);
    expect(mockAxios.get).not.toHaveBeenCalled();
  });
});
