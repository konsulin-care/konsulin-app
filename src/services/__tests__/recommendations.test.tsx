import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';
import type { AxiosInstance } from 'axios';
import { useRecommendations, useSpecialties } from '../recommendations';

const mockGet = vi.fn();
const mockGetAPI = vi.mocked(getAPI);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const RECOMMENDATION = {
  practitionerRoleId: 'role-1',
  practitionerId: 'practitioner-1',
  practitionerName: 'dr. Sarah Chen',
  specialties: ['psychiatry'],
  scheduleId: 'schedule-1',
  healthcareServiceId: 'service-1',
  healthcareServiceName: 'Psychiatric Consultation',
  durationMinutes: 60,
  fee: 500_000,
  currency: 'IDR',
  nextSlot: { start: '2026-08-20T09:00:00Z', end: '2026-08-20T10:00:00Z' },
  locationId: 'loc-1',
  locationName: 'Rumah Bicara',
  locationAddress: { city: 'Jakarta' },
  distanceKm: 2.4
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAPI.mockResolvedValue({ get: mockGet } as unknown as AxiosInstance);
});

afterEach(() => {
  mockGetAPI.mockReset();
});

describe('useRecommendations', () => {
  it('stays disabled without a specialty param', async () => {
    renderHook(() => useRecommendations(null), {
      wrapper: createWrapper()
    });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('fetches from the non-proxied BFF with the specified params', async () => {
    mockGet.mockResolvedValue({
      data: { specialty: 'psychology', recommendations: [RECOMMENDATION] }
    });
    const { result } = renderHook(
      () =>
        useRecommendations({ specialty: 'psychology', lat: -6.2, lon: 106.8 }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getAPI).toHaveBeenCalledWith({ proxy: false });
    expect(mockGet).toHaveBeenCalledWith('/api/recommendations', {
      params: { specialty: 'psychology', lat: -6.2, lon: 106.8 }
    });
    expect(result.current.data?.recommendations[0].practitionerName).toBe(
      'dr. Sarah Chen'
    );
  });

  it('passes the forward contract fields through to the BFF', async () => {
    mockGet.mockResolvedValue({
      data: { specialty: 'psychology', recommendations: [] }
    });
    renderHook(
      () =>
        useRecommendations({
          specialty: 'psychology',
          serviceTypeCode: 'mood-disorder-care',
          icfDomain: 'mental-emotional-health'
        }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet).toHaveBeenCalledWith('/api/recommendations', {
      params: {
        specialty: 'psychology',
        serviceTypeCode: 'mood-disorder-care',
        icfDomain: 'mental-emotional-health'
      }
    });
  });
});

describe('useSpecialties', () => {
  it('returns the distinct specialty list from the BFF', async () => {
    mockGet.mockResolvedValue({
      data: { specialties: ['psychology', 'psychiatry', 'orthopedics'] }
    });
    const { result } = renderHook(() => useSpecialties(), {
      wrapper: createWrapper()
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/recommendations/specialties');
    expect(result.current.data).toEqual([
      'psychology',
      'psychiatry',
      'orthopedics'
    ]);
  });
});
