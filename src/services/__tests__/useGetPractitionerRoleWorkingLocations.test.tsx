import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGetPractitionerRoleWorkingLocations } from '../clinicians';

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
        location: [{ reference: 'Location/loc-1' }],
        healthcareService: [
          { reference: 'HealthcareService/hs-1' },
          { reference: 'HealthcareService/hs-2' }
        ],
        availableTime: [
          {
            daysOfWeek: ['mon', 'wed'],
            availableStartTime: '09:00',
            availableEndTime: '17:00'
          }
        ]
      }
    },
    {
      resource: {
        resourceType: 'Location',
        id: 'loc-1',
        name: 'Cabang Klinik 1'
      }
    },
    {
      resource: {
        resourceType: 'HealthcareService',
        id: 'hs-1',
        name: 'Research Formulation Discussion',
        active: true
      }
    },
    {
      resource: {
        resourceType: 'HealthcareService',
        id: 'hs-2',
        name: 'Statistical Consultation',
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

describe('useGetPractitionerRoleWorkingLocations', () => {
  it('fetches and parses bundle into working location data', async () => {
    vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
      data: sampleBundle
    });

    const { result } = renderHook(
      () => useGetPractitionerRoleWorkingLocations('prac-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data).toHaveLength(1);

    const item = result.current.data[0];
    expect(item.practitionerRole.id).toBe('role-1');
    expect(item.location).toBeDefined();
    expect(item.location?.name).toBe('Cabang Klinik 1');
    expect(item.healthcareServices).toHaveLength(2);
    expect(item.healthcareServices[0].name).toBe(
      'Research Formulation Discussion'
    );
    expect(item.healthcareServices[1].name).toBe('Statistical Consultation');
  });

  it('calls the correct FHIR endpoint', async () => {
    vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
      data: sampleBundle
    });

    const { result } = renderHook(
      () => useGetPractitionerRoleWorkingLocations('prac-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/fhir/PractitionerRole?practitioner=prac-1&_include=PractitionerRole:location&_include=PractitionerRole:service'
    );
  });

  it('returns empty array when no PractitionerRole entries exist', async () => {
    const emptyBundle = {
      resourceType: 'Bundle' as const,
      type: 'searchset' as const,
      entry: []
    };

    vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
      data: emptyBundle
    });

    const { result } = renderHook(
      () => useGetPractitionerRoleWorkingLocations('prac-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('does not fetch when practitionerId is empty', () => {
    const { result } = renderHook(
      () => useGetPractitionerRoleWorkingLocations(''),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
  });

  it('handles missing location gracefully', async () => {
    const bundleWithoutLocation = {
      resourceType: 'Bundle' as const,
      type: 'searchset' as const,
      entry: [
        {
          resource: {
            resourceType: 'PractitionerRole',
            id: 'role-2',
            location: [{ reference: 'Location/missing-loc' }],
            healthcareService: [],
            availableTime: []
          }
        }
      ]
    };

    vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
      data: bundleWithoutLocation
    });

    const { result } = renderHook(
      () => useGetPractitionerRoleWorkingLocations('prac-2'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const item = result.current.data[0];
    expect(item.location).toBeUndefined();
    expect(item.healthcareServices).toEqual([]);
  });
});
