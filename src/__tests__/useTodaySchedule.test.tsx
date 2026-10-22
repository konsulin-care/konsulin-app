import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTodaySchedule } from '../app/hooks/useTodaySchedule';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/api/appointments', () => ({
  useGetTodaySessions: vi.fn()
}));

import { useAuth } from '@/context/auth/authContext';
import { useGetTodaySessions } from '@/services/api/appointments';

describe('useTodaySchedule', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Practitioner',
          fhirId: 'practitioner-1',
          fullname: 'Dr. Jane Smith',
          email: 'jane@clinic.com'
        }
      },
      dispatch: vi.fn()
    });
    vi.mocked(useGetTodaySessions).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn()
    } as never);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('returns loading state when auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: true,
      state: { isAuthenticated: false, userInfo: undefined },
      dispatch: vi.fn()
    } as never);

    const { result } = renderHook(() => useTodaySchedule(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns sessions from the API', async () => {
    vi.mocked(useGetTodaySessions).mockReturnValue({
      data: {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 2,
        entry: [
          {
            resource: {
              resourceType: 'Appointment',
              id: 'appt-1',
              status: 'booked',
              slot: [{ reference: 'Slot/slot-1' }],
              participant: [
                { actor: { display: 'John Doe', reference: 'Patient/pat-1' } }
              ]
            }
          },
          {
            resource: {
              resourceType: 'Slot',
              id: 'slot-1',
              status: 'free',
              start: '2026-07-26T09:00:00Z',
              end: '2026-07-26T09:30:00Z'
            }
          },
          {
            resource: {
              resourceType: 'Patient',
              id: 'pat-1',
              name: [{ given: ['John'], family: 'Doe' }],
              telecom: [{ system: 'email', value: 'john@test.com' }]
            }
          }
        ]
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn()
    } as never);

    const { result } = renderHook(() => useTodaySchedule(), { wrapper });
    await waitFor(() => {
      expect(result.current.sessions.length).toBeGreaterThan(0);
    });
  });

  it('returns empty array when there are no sessions', () => {
    const { result } = renderHook(() => useTodaySchedule(), { wrapper });
    expect(result.current.sessions).toEqual([]);
  });
});
