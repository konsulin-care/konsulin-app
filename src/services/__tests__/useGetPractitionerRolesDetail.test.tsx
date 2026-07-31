import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGetPractitionerRolesDetail } from '../clinicians';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';

const mockAxiosInstance = { get: vi.fn() };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
}

const sampleBundle = {
  resourceType: 'Bundle' as const,
  type: 'searchset' as const,
  entry: [
    {
      resource: {
        resourceType: 'PractitionerRole',
        id: 'role-1',
        practitioner: { reference: 'Practitioner/prac-1' },
        organization: { reference: 'Organization/org-1' },
        active: true
      }
    }
  ]
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAPI).mockResolvedValue(
    mockAxiosInstance as unknown as AxiosInstance
  );
});

describe('useGetPractitionerRolesDetail', () => {
  it('calls onSuccess once with transformed role entries when data arrives', async () => {
    vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
      data: sampleBundle
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(
      () =>
        useGetPractitionerRolesDetail('prac-1', data => {
          onSuccess(data);
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    const payload = onSuccess.mock.calls[0]?.[0] as
      | Array<{ resource: { id: string } }>
      | undefined;
    expect(payload).toHaveLength(1);
    expect(payload?.[0]?.resource.id).toBe('role-1');
    expect(result.current.data).toBeDefined();
  });

  it('does not re-invoke an inline onSuccess on re-render (regression: render loop)', async () => {
    vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
      data: sampleBundle
    });

    const onSuccess = vi.fn();
    const { rerender } = renderHook(
      ({ id }: { id: string }) =>
        useGetPractitionerRolesDetail(id, data => {
          onSuccess(data);
        }),
      { initialProps: { id: 'prac-1' }, wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    // Callers pass inline arrows; every render creates a fresh identity.
    rerender({ id: 'prac-1' });

    // Data did not change, so onSuccess must not fire again.
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not call onSuccess when the query is disabled (empty practitionerId)', () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () =>
        useGetPractitionerRolesDetail('', data => {
          onSuccess(data);
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
