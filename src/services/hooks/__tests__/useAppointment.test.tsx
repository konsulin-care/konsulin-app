import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Bundle, BundleEntry } from 'fhir/r4';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppointment } from '../useAppointment';

const mockAPI = vi.fn();

vi.mock('@/services/api', () => ({
  getAPI: vi.fn(() =>
    Promise.resolve({
      get: mockAPI
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

describe('useAppointment', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    mockAPI.mockReset();
  });

  it('fetches single appointment by ID', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: 1,
      entry: [
        {
          resource: {
            resourceType: 'Appointment',
            id: 'appt-1',
            status: 'booked',
            slot: [{ reference: 'Slot/slot-1' }],
            participant: [
              {
                actor: { reference: 'Practitioner/prac-1' },
                status: 'accepted'
              }
            ]
          }
        } as BundleEntry
      ]
    };

    mockAPI.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(() => useAppointment('appt-1'), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.appointmentId).toBe('appt-1');
  });

  it('constructs correct FHIR query', async () => {
    mockAPI.mockResolvedValueOnce({
      data: {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 0,
        entry: []
      } as Bundle
    });

    renderHook(() => useAppointment('appt-1'), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(mockAPI).toHaveBeenCalled();
    });

    const url = mockAPI.mock.calls[0][0] as string;
    expect(url).toContain('_id=appt-1');
    expect(url).toContain('_include=Appointment:slot');
    expect(url).toContain('_include=Appointment:actor:PractitionerRole');
    expect(url).toContain('_include:iterate=PractitionerRole:practitioner');
  });

  it('returns null when appointment is not found', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: 0,
      entry: []
    };

    mockAPI.mockResolvedValueOnce({ data: bundle });

    const { result } = renderHook(() => useAppointment('nonexistent'), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('disables query when appointmentId is empty', async () => {
    const { result } = renderHook(() => useAppointment(''), {
      wrapper: createWrapper(queryClient)
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockAPI).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});
