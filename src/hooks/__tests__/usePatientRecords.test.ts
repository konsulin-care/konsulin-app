import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/services/profile', () => ({
  getProfileById: vi.fn()
}));

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

function mockBundle(overrides?: Record<string, unknown>) {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: [],
    ...overrides
  };
}

describe('usePatientRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches records from 3 resource queries', async () => {
    const apiMock = {
      get: vi.fn().mockResolvedValue({ data: mockBundle() })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    const { result } = renderHook(() => usePatientRecords('pat-1'), {
      wrapper: TestWrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const allUrls = apiMock.get.mock.calls.map((c: [string]) => c[0]);
    expect(allUrls).toEqual([
      expect.stringContaining('QuestionnaireResponse'),
      expect.stringContaining('Condition'),
      expect.stringContaining('Observation')
    ]);
  });

  it('enriches PractitionerNote records with practitioner profile', async () => {
    const mockPracProfile = {
      id: 'prac-1',
      resourceType: 'Practitioner',
      name: [{ given: ['Dr'], family: 'Smith' }],
      telecom: [{ system: 'email', value: 'dr@test.com' }],
      photo: [{ url: 'https://example.com/photo.jpg' }]
    };
    const mockPatientProfile = {
      id: 'pat-1',
      resourceType: 'Patient',
      name: [{ given: ['John'], family: 'Doe' }],
      photo: [{ url: 'https://example.com/patient.jpg' }]
    };

    vi.mocked(getProfileById).mockImplementation((id, type) => {
      if (id === 'prac-1' && type === 'Practitioner') {
        return Promise.resolve(mockPracProfile);
      }
      if (id === 'pat-1' && type === 'Patient') {
        return Promise.resolve(mockPatientProfile);
      }
      return Promise.reject(new Error('unknown profile'));
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
        }
      })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    const { result } = renderHook(() => usePatientRecords('pat-1'), {
      wrapper: TestWrapper
    });

    // Wait for loading to finish and enrichment to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Wait for enrichment (profiles may arrive after isLoading)
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
  });

  it('does not call $everything endpoint', async () => {
    const apiMock = {
      get: vi.fn().mockResolvedValue({ data: mockBundle() })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    const { result } = renderHook(() => usePatientRecords('pat-1'), {
      wrapper: TestWrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const allUrls = apiMock.get.mock.calls.map((c: [string]) => c[0]);
    for (const url of allUrls) {
      expect(url).not.toContain('$everything');
    }
  });

  it('returns empty records array when patientId is null', async () => {
    const { result } = renderHook(() => usePatientRecords(null), {
      wrapper: TestWrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.records).toEqual([]);
  });

  it('filters Observation query to Practitioner Note + Patient Journal LOINC codes', async () => {
    const apiMock = {
      get: vi.fn().mockResolvedValue({ data: mockBundle() })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    const { result } = renderHook(() => usePatientRecords('pat-1'), {
      wrapper: TestWrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const obsUrl = apiMock.get.mock.calls[2][0] as string;
    expect(obsUrl).toContain('Observation');
    expect(obsUrl).toContain('code=http://loinc.org|67855-7,51855-5');
    expect(obsUrl).not.toContain('$everything');
  });

  it('exposes fetchNextPage and hasNextPage controls', async () => {
    const apiMock = {
      get: vi.fn().mockResolvedValue({
        data: mockBundle({
          link: [
            {
              relation: 'next',
              url: 'https://fhir.internal/fhir/Patient/pat-1/QuestionnaireResponse?pageToken=ABC'
            }
          ]
        })
      })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    const { result } = renderHook(() => usePatientRecords('pat-1'), {
      wrapper: TestWrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.fetchNextPage).toBe('function');
    expect(result.current.hasNextPage).toBe(true);
    expect(typeof result.current.isFetchingNextPage).toBe('boolean');
  });

  it('hasNextPage is true when any resource type has more pages', async () => {
    const apiMock = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          data: mockBundle({
            link: [
              {
                relation: 'next',
                url: 'https://fhir.internal/fhir/Patient/pat-1/QuestionnaireResponse?pageToken=ABC'
              }
            ]
          })
        })
        .mockResolvedValueOnce({ data: mockBundle() })
        .mockResolvedValueOnce({ data: mockBundle() })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    const { result } = renderHook(() => usePatientRecords('pat-1'), {
      wrapper: TestWrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasNextPage).toBe(true);
  });

  it('hasNextPage is false when no compartment has more pages', async () => {
    const apiMock = {
      get: vi.fn().mockResolvedValue({ data: mockBundle() })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    const { result } = renderHook(() => usePatientRecords('pat-1'), {
      wrapper: TestWrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasNextPage).toBe(false);
  });

  it('resolves titlesLoading to false after QR title resolution', async () => {
    const mockPatientProfile = {
      id: 'pat-1',
      resourceType: 'Patient',
      name: [{ given: ['John'], family: 'Doe' }]
    };
    vi.mocked(getProfileById).mockImplementation((id, type) => {
      if (id === 'pat-1' && type === 'Patient') {
        return Promise.resolve(mockPatientProfile);
      }
      return Promise.reject(new Error('unknown profile'));
    });

    const apiMock = {
      get: vi
        .fn()
        // QR bundle with one record
        .mockResolvedValueOnce({
          data: {
            resourceType: 'Bundle',
            type: 'searchset',
            entry: [
              {
                resource: {
                  resourceType: 'QuestionnaireResponse',
                  id: 'qr-1',
                  status: 'completed',
                  questionnaire: 'Questionnaire/phq2',
                  meta: { lastUpdated: '2024-06-01T00:00:00Z' }
                }
              }
            ]
          }
        })
        // Condition bundle (empty)
        .mockResolvedValueOnce({ data: mockBundle() })
        // Observation bundle (empty)
        .mockResolvedValueOnce({ data: mockBundle() })
        // Questionnaire title resolution
        .mockResolvedValueOnce({
          data: {
            resourceType: 'Bundle',
            type: 'searchset',
            total: 1,
            entry: [
              {
                resource: {
                  resourceType: 'Questionnaire',
                  id: 'phq2',
                  title: 'Patient Health Questionnaire - 2 Items'
                }
              }
            ]
          }
        })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    const { result } = renderHook(() => usePatientRecords('pat-1'), {
      wrapper: TestWrapper
    });

    // Wait for initial loading to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Wait for enrichment to finish (titlesLoading should go false)
    await waitFor(() => expect(result.current.titlesLoading).toBe(false));

    // Record should have the resolved display title
    expect(result.current.records[0].title).toBe(
      'Patient Health Questionnaire - 2 Items'
    );
  });
});
