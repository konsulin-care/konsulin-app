import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Appointment } from 'fhir/r4';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateAppointmentStatus } from '../useUpdateAppointmentStatus';

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock('@/services/api', () => ({
  getAPI: vi.fn(() =>
    Promise.resolve({
      get: mockGet,
      put: mockPut
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
    mockGet.mockReset();
    mockPut.mockReset();
  });

  it('fetches current appointment then PUTs full resource', async () => {
    const existingAppointment = {
      resourceType: 'Appointment' as const,
      id: 'appt-1',
      status: 'booked' as Appointment['status'],
      start: '2026-07-06T09:00:00.000Z',
      end: '2026-07-06T10:00:00.000Z',
      participant: []
    };
    mockGet.mockResolvedValueOnce({ data: existingAppointment });
    mockPut.mockResolvedValueOnce({
      data: { ...existingAppointment, status: 'fulfilled' }
    });

    const { result } = renderHook(() => useUpdateAppointmentStatus(), {
      wrapper: createWrapper(queryClient)
    });

    result.current.mutate({ id: 'appt-1', status: 'fulfilled' });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledOnce();
      expect(mockPut).toHaveBeenCalledOnce();
    });

    const getUrl = mockGet.mock.calls[0][0] as string;
    const putUrl = mockPut.mock.calls[0][0] as string;
    const putBody = mockPut.mock.calls[0][1] as Appointment;

    expect(getUrl).toBe('/fhir/Appointment/appt-1');
    expect(putUrl).toBe('/fhir/Appointment/appt-1');
    // PUT body should be the full resource with updated status
    expect(putBody).toEqual({
      resourceType: 'Appointment',
      id: 'appt-1',
      status: 'fulfilled',
      start: '2026-07-06T09:00:00.000Z',
      end: '2026-07-06T10:00:00.000Z',
      participant: []
    });
  });

  it('returns success on successful update', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        resourceType: 'Appointment',
        id: 'appt-1',
        status: 'booked',
        participant: []
      }
    });
    mockPut.mockResolvedValueOnce({
      data: {
        resourceType: 'Appointment',
        id: 'appt-1',
        status: 'fulfilled',
        participant: []
      }
    });

    const { result } = renderHook(() => useUpdateAppointmentStatus(), {
      wrapper: createWrapper(queryClient)
    });

    result.current.mutate({ id: 'appt-1', status: 'fulfilled' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.status).toBe('fulfilled');
  });

  it('handles error on failed GET', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useUpdateAppointmentStatus(), {
      wrapper: createWrapper(queryClient)
    });

    result.current.mutate({ id: 'appt-1', status: 'fulfilled' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('handles error on failed PUT', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        resourceType: 'Appointment',
        id: 'appt-1',
        status: 'booked',
        participant: []
      }
    });
    mockPut.mockRejectedValueOnce(new Error('Update failed'));

    const { result } = renderHook(() => useUpdateAppointmentStatus(), {
      wrapper: createWrapper(queryClient)
    });

    result.current.mutate({ id: 'appt-1', status: 'fulfilled' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
