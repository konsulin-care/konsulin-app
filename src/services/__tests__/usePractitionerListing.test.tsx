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
  it('does not filter by active=true in URL', async () => {
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
    expect(calledUrl).not.toContain('active=true');
  });

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

  it('returns active and inactive practitioners with their status', async () => {
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
              resourceType: 'Practitioner',
              id: 'prac-2',
              name: [{ given: ['Jane'], family: 'Smith' }]
            }
          },
          {
            resource: {
              resourceType: 'PractitionerRole',
              id: 'role-1',
              active: true,
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
              resourceType: 'PractitionerRole',
              id: 'role-2',
              active: false,
              practitioner: { reference: 'Practitioner/prac-2' },
              specialty: [{ text: 'Radiology' }]
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

    expect(result.current.practitioners).toHaveLength(2);

    // Active practitioner
    const active = result.current.practitioners.find(p => p.id === 'prac-1');
    expect(active?.active).toBe(true);
    expect(active?.practitionerName).toBe('John Doe');
    expect(active?.photoUrl).toBe('https://example.com/photo.jpg');
    expect(active?.specialties).toEqual(['Cardiology']);
    expect(active?.healthcareServiceNames).toEqual([
      'General Consultation',
      'Follow-up Visit'
    ]);
    expect(active?.practitionerRoleId).toBe('role-1');

    // Inactive practitioner
    const inactive = result.current.practitioners.find(p => p.id === 'prac-2');
    expect(inactive?.active).toBe(false);
    expect(inactive?.practitionerName).toBe('Jane Smith');
    expect(inactive?.specialties).toEqual(['Radiology']);
    expect(inactive?.practitionerRoleId).toBe('role-2');
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
