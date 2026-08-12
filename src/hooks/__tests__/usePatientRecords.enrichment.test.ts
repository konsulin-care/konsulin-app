import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Patient } from 'fhir/r4';
import type { ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/services/profile', () => ({
  getProfileById: vi.fn()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '@/context/auth/authContext';
import { getAPI } from '@/services/api';
import { getProfileById } from '@/services/profile';
import { usePatientRecords } from '../usePatientRecords';

const TestWrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    children
  );
};

describe('usePatientRecords profile enrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      dispatch: vi.fn(),
      state: {
        isAuthenticated: true,
        userInfo: { fhirId: 'pat-1' }
      }
    });
  });

  it('reuses the auth-state fullProfile instead of fetching the patient profile again', async () => {
    const mockPatientProfile: Patient = {
      id: 'pat-1',
      resourceType: 'Patient',
      name: [{ given: ['John'], family: 'Doe' }],
      photo: [{ url: 'https://example.com/patient.jpg' }]
    };
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      dispatch: vi.fn(),
      state: {
        isAuthenticated: true,
        userInfo: {
          fhirId: 'pat-1',
          fullProfile: mockPatientProfile
        }
      }
    });

    // Patient profile fetch must NOT happen; practitioner fetch still does.
    vi.mocked(getProfileById).mockImplementation((id, type) => {
      if (id === 'prac-1' && type === 'Practitioner') {
        return Promise.resolve({
          id: 'prac-1',
          resourceType: 'Practitioner',
          name: [{ given: ['Dr'], family: 'Smith' }]
        } as never);
      }
      return Promise.reject(new Error('patient profile should not be fetched'));
    });

    const apiMock = {
      get: vi.fn().mockResolvedValue({
        data: {
          resourceType: 'Bundle',
          type: 'searchset',
          entry: [
            {
              resource: {
                resourceType: 'Observation',
                id: 'obs-pat-1',
                status: 'final',
                code: {
                  coding: [{ system: 'https://loinc.org', code: '51855-5' }]
                },
                meta: { lastUpdated: '2024-06-01T00:00:00Z' }
              }
            }
          ]
        }
      })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock as never);

    const { result } = renderHook(() => usePatientRecords('pat-1'), {
      wrapper: TestWrapper
    });

    await waitFor(() => {
      expect(result.current.records.length).toBeGreaterThan(0);
    });

    expect(getProfileById).not.toHaveBeenCalledWith('pat-1', 'Patient');
    const patNote = result.current.records.find(r => r.type === 'PatientNote');
    expect(patNote?.patientProfile?.id).toBe('pat-1');
  });

  it('enriches PractitionerNote records with practitioner profile via one batched search', async () => {
    const mockPracProfile = {
      id: 'prac-1',
      resourceType: 'Practitioner',
      name: [{ given: ['Dr'], family: 'Smith' }],
      telecom: [{ system: 'email', value: 'dr@test.com' }],
      photo: [{ url: 'https://example.com/photo.jpg' }]
    } as const;
    const mockPatientProfile = {
      id: 'pat-1',
      resourceType: 'Patient',
      name: [{ given: ['John'], family: 'Doe' }],
      photo: [{ url: 'https://example.com/patient.jpg' }]
    } as const;

    // Only the patient profile is fetched individually; the practitioner
    // profile must come from the batched `_id` search.
    vi.mocked(getProfileById).mockImplementation((id, type) => {
      if (id === 'pat-1' && type === 'Patient') {
        return Promise.resolve(mockPatientProfile as never);
      }
      return Promise.reject(new Error('practitioner must be batched'));
    });

    const recordBundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-prac-1',
            status: 'final',
            code: {
              coding: [
                {
                  system: 'https://loinc.org',
                  code: '67855-7'
                }
              ]
            },
            performer: [{ reference: 'Practitioner/prac-1' }],
            meta: { lastUpdated: '2024-06-01T00:00:00Z' }
          }
        },
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-pat-1',
            status: 'final',
            code: {
              coding: [
                {
                  system: 'https://loinc.org',
                  code: '51855-5'
                }
              ]
            },
            meta: { lastUpdated: '2024-06-01T00:00:00Z' }
          }
        }
      ]
    };
    const apiMock = {
      get: vi
        .fn()
        // QR, Condition, Observation record queries
        .mockResolvedValueOnce({ data: recordBundle })
        .mockResolvedValueOnce({ data: recordBundle })
        .mockResolvedValueOnce({ data: recordBundle })
        // Batched practitioner profile search
        .mockResolvedValueOnce({
          data: {
            resourceType: 'Bundle',
            type: 'searchset',
            total: 1,
            entry: [{ resource: mockPracProfile }]
          }
        })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock as never);

    const { result } = renderHook(() => usePatientRecords('pat-1'), {
      wrapper: TestWrapper
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    await waitFor(() => {
      expect(result.current.records.length).toBeGreaterThan(0);
    });

    const pracNote = result.current.records.find(
      r => r.type === 'PractitionerNote'
    );
    expect(pracNote).toBeDefined();
    expect(pracNote.practitionerProfile).toBeDefined();
    expect(pracNote.practitionerProfile.id).toBe('prac-1');
    expect(pracNote.practitionerProfile.photo?.[0]?.url).toBe(
      'https://example.com/photo.jpg'
    );

    const patNote = result.current.records.find(r => r.type === 'PatientNote');
    expect(patNote).toBeDefined();
    expect(patNote.patientProfile).toBeDefined();
    expect(patNote.patientProfile.id).toBe('pat-1');

    // Exactly ONE batched practitioner search, no per-id fetches
    const pracUrl = apiMock.get.mock.calls[3][0] as string;
    expect(pracUrl).toContain('/fhir/Practitioner?_id=prac-1');
    expect(pracUrl).toContain('_elements=name,photo');
    expect(getProfileById).not.toHaveBeenCalledWith('prac-1', 'Practitioner');
  });
});
