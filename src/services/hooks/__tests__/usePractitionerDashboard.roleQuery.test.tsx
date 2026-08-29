/* eslint-disable react/display-name */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Bundle } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePractitionerDashboard } from '../usePractitionerDashboard';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/** Month bundle whose entries include PractitionerRole resources. */
const monthWithRoles: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 1,
  entry: [
    {
      resource: {
        resourceType: 'PractitionerRole',
        id: 'role-1',
        availableTime: [{ daysOfWeek: ['mon'] }]
      }
    }
  ]
};

describe('usePractitionerDashboard role query slimming', () => {
  let queryClient: QueryClient;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    mockGet = vi.fn();
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet,
      post: vi.fn()
    } as unknown as Awaited<ReturnType<typeof getAPI>>);
    mockGet.mockResolvedValue({ data: monthWithRoles });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('skips the dedicated role query when month data already includes PractitionerRole', async () => {
    const { result } = renderHook(
      () =>
        usePractitionerDashboard({
          practitionerId: 'pract-1',
          monthStart: new Date('2026-07-01'),
          monthEnd: new Date('2026-07-31')
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Roles come from the month-included entries (cache seeding), so the
    // calendar availability still resolves without a dedicated fetch.
    await waitFor(() => {
      expect(result.current.availableTime.length).toBeGreaterThan(0);
    });

    const roleCalls = mockGet.mock.calls.filter(
      ([url]: [string]) =>
        typeof url === 'string' && url.includes('/fhir/PractitionerRole?')
    );
    expect(roleCalls).toHaveLength(0);
  });

  it('fires the role query when month data has no PractitionerRole', async () => {
    mockGet.mockResolvedValue({
      data: { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] }
    });

    const { result } = renderHook(
      () =>
        usePractitionerDashboard({
          practitionerId: 'pract-1',
          monthStart: new Date('2026-07-01'),
          monthEnd: new Date('2026-07-31')
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(
        mockGet.mock.calls.some(
          ([url]: [string]) =>
            typeof url === 'string' && url.includes('/fhir/PractitionerRole?')
        )
      ).toBe(true);
    });
  });
});
