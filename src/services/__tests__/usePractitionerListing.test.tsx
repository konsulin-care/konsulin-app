/* eslint-disable react/display-name */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type AxiosInstance } from 'axios';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePractitionerListing } from '../clinic';

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

describe('usePractitionerListing', () => {
  it('uses location-based URL when locationId is provided', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { resourceType: 'Bundle', entry: [] }
    });

    const { result } = renderHook(
      () => usePractitionerListing('org-1', 'loc-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const calledUrl = mockAxiosInstance.get.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('location=Location/loc-1');
    expect(calledUrl).not.toContain('organization=');
    expect(calledUrl).toContain('_include=PractitionerRole:practitioner');
    expect(calledUrl).toContain('_include=PractitionerRole:service');
  });

  it('uses organization-based URL when locationId is omitted', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { resourceType: 'Bundle', entry: [] }
    });

    const { result } = renderHook(() => usePractitionerListing('org-1'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const calledUrl = mockAxiosInstance.get.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('organization=org-1');
    expect(calledUrl).not.toContain('location=');
  });

  it('returns practitioners with healthcare service names', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Practitioner',
              id: 'prac-1',
              name: [{ given: ['John'], family: 'Doe' }],
              photo: [{ url: 'https://example.com/photo.jpg' }]
            }
          },
          {
            resource: {
              resourceType: 'PractitionerRole',
              id: 'role-1',
              practitioner: { reference: 'Practitioner/prac-1' },
              specialty: [{ text: 'Cardiology' }],
              healthcareService: [
                { reference: 'HealthcareService/hs-1' },
                { reference: 'HealthcareService/hs-2' }
              ]
            }
          },
          {
            resource: {
              resourceType: 'HealthcareService',
              id: 'hs-1',
              name: 'General Consultation'
            }
          },
          {
            resource: {
              resourceType: 'HealthcareService',
              id: 'hs-2',
              name: 'Follow-up Visit'
            }
          }
        ]
      }
    });

    const { result } = renderHook(() => usePractitionerListing('org-1'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.practitioners).toHaveLength(1);
    expect(result.current.practitioners[0].practitionerName).toBe('John Doe');
    expect(result.current.practitioners[0].photoUrl).toBe(
      'https://example.com/photo.jpg'
    );
    expect(result.current.practitioners[0].specialties).toEqual(['Cardiology']);
    expect(result.current.practitioners[0].healthcareServiceNames).toEqual([
      'General Consultation',
      'Follow-up Visit'
    ]);
    expect(result.current.practitioners[0].practitionerRoleId).toBe('role-1');
  });

  it('returns empty healthcareServiceNames when no HealthcareService entries in bundle', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Practitioner',
              id: 'prac-1',
              name: [{ given: ['Jane'], family: 'Smith' }]
            }
          },
          {
            resource: {
              resourceType: 'PractitionerRole',
              id: 'role-1',
              practitioner: { reference: 'Practitioner/prac-1' },
              healthcareService: [{ reference: 'HealthcareService/hs-1' }]
            }
          }
          // No HealthcareService entry for hs-1
        ]
      }
    });

    const { result } = renderHook(() => usePractitionerListing('org-1'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.practitioners[0].healthcareServiceNames).toEqual([]);
  });

  it('returns empty array when bundle has no entries', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { resourceType: 'Bundle', entry: [] }
    });

    const { result } = renderHook(() => usePractitionerListing('org-1'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.practitioners).toEqual([]);
  });

  it('handles practitioners without a matching PractitionerRole', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Practitioner',
              id: 'prac-1',
              name: [{ given: ['Orphan'], family: 'Practitioner' }]
            }
          }
          // No PractitionerRole referencing prac-1
        ]
      }
    });

    const { result } = renderHook(() => usePractitionerListing('org-1'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.practitioners).toEqual([]);
  });
});
