import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateAppointmentStatus } from '../useUpdateAppointmentStatus';

const mockAPI = vi.fn();

vi.mock('@/services/api', () => ({
  getAPI: vi.fn(() =>
    Promise.resolve({
      put: mockAPI
    })
  )
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryWrapper';
  return Wrapper;
}

describe('useUpdateAppointmentStatus', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    mockAPI.mockReset();
  });

  it('sends PUT request with status to correct URL', async () => {
    mockAPI.mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(() => useUpdateAppointmentStatus(), {
      wrapper: createWrapper(queryClient)
    });

    result.current.mutate({ id: 'appt-1', status: 'fulfilled' });

    await waitFor(() => {
      expect(mockAPI).toHaveBeenCalled();
    });

    const callArgs = mockAPI.mock.calls[0] as [string, Record<string, string>];
    const url = callArgs[0];
    const body = callArgs[1];
    expect(url).toBe('/fhir/Appointment/appt-1');
    expect(body).toEqual({ status: 'fulfilled' });
  });

  it('returns success on successful update', async () => {
    mockAPI.mockResolvedValueOnce({
      data: { id: 'appt-1', status: 'fulfilled' }
    });

    const { result } = renderHook(() => useUpdateAppointmentStatus(), {
      wrapper: createWrapper(queryClient)
    });

    result.current.mutate({ id: 'appt-1', status: 'fulfilled' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });

  it('handles error on failed update', async () => {
    mockAPI.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useUpdateAppointmentStatus(), {
      wrapper: createWrapper(queryClient)
    });

    result.current.mutate({ id: 'appt-1', status: 'invalid-status' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
