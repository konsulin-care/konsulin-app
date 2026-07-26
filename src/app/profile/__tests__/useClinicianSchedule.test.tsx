import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClinicianSchedule } from '../hooks/useClinicianSchedule';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/clinicians', () => ({
  useGetPractitionerRolesDetail: vi.fn(),
  useUpdatePractitionerInfo: vi.fn()
}));

import { useAuth } from '@/context/auth/authContext';
import { useGetPractitionerRolesDetail } from '@/services/clinicians';

describe('useClinicianSchedule', () => {
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
          fhirId: 'prac-1',
          fullname: 'Dr. Smith',
          email: 'dr@clinic.com'
        }
      },
      dispatch: vi.fn()
    } as never);

    vi.mocked(useGetPractitionerRolesDetail).mockImplementation(
      (_fhirId: string, onData: (data: { resource: unknown }[]) => void) => {
        // Defer callback so state update doesn't happen during render.
        setTimeout(() => {
          onData([
            {
              resource: {
                active: true,
                organizationData: { name: 'Clinic A' },
                availableTime: [
                  {
                    daysOfWeek: ['mon', 'wed'],
                    availableStartTime: '09:00',
                    availableEndTime: '12:00'
                  }
                ]
              }
            }
          ]);
        }, 0);
        return { isLoading: false, isError: false, refetch: vi.fn() };
      }
    );
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('returns grouped schedule by firm and day', async () => {
    const { result } = renderHook(() => useClinicianSchedule(), { wrapper });

    await waitFor(() => {
      expect(result.current.activeFirms).toHaveLength(1);
    });
    expect(result.current.groupedByFirmAndDay).toHaveProperty('Clinic A');
    expect(
      result.current.groupedByFirmAndDay['Clinic A'].availability
    ).toHaveProperty('Mon');
    expect(
      result.current.groupedByFirmAndDay['Clinic A'].availability.Mon
    ).toContainEqual({ fromTime: '09:00', toTime: '12:00' });
  });

  it('returns loading state', () => {
    vi.mocked(useGetPractitionerRolesDetail).mockReturnValue({
      isLoading: true,
      isError: false,
      refetch: vi.fn()
    } as never);

    const { result } = renderHook(() => useClinicianSchedule(), { wrapper });
    expect(result.current.isPractitionerRolesLoading).toBe(true);
  });
});
