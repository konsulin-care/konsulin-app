/* eslint-disable react/display-name */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type AxiosInstance } from 'axios';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrganizationLocations } from '../clinic-practitioners';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';

const mockAxiosInstance = { get: vi.fn() };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAPI).mockResolvedValue(
    mockAxiosInstance as unknown as AxiosInstance
  );
});

describe('useOrganizationLocations', () => {
  it('fetches Location resources for the given clinic', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Location',
              id: 'loc-1',
              name: 'Main Clinic'
            }
          },
          {
            resource: {
              resourceType: 'Location',
              id: 'loc-2',
              name: 'Branch A'
            }
          }
        ]
      }
    });

    const { result } = renderHook(() => useOrganizationLocations('org-1'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const calledUrl = mockAxiosInstance.get.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('/fhir/Location');
    expect(calledUrl).toContain('organization=org-1');
    expect(calledUrl).toContain('_elements=name,id');

    expect(result.current.locations).toEqual([
      { id: 'loc-1', name: 'Main Clinic' },
      { id: 'loc-2', name: 'Branch A' }
    ]);
  });

  it('returns empty array when bundle has no entries', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { resourceType: 'Bundle' }
    });

    const { result } = renderHook(() => useOrganizationLocations('org-1'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.locations).toEqual([]);
  });

  it('skips fetch when clinicId is empty', () => {
    renderHook(() => useOrganizationLocations(''), {
      wrapper: createWrapper()
    });

    expect(mockAxiosInstance.get).not.toHaveBeenCalled();
  });

  it('handles Location entries with missing name gracefully', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        resourceType: 'Bundle',
        entry: [
          {
            resource: { resourceType: 'Location', id: 'loc-1', name: 'Named' }
          },
          { resource: { resourceType: 'Location', id: 'loc-2' } }
        ]
      }
    });

    const { result } = renderHook(() => useOrganizationLocations('org-1'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.locations).toEqual([
      { id: 'loc-1', name: 'Named' },
      { id: 'loc-2', name: '' }
    ]);
  });
});
