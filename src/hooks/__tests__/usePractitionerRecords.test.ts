import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';
import { usePractitionerRecords } from '../usePractitionerRecords';

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

describe('usePractitionerRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches records from 3 resource queries', async () => {
    const apiMock = {
      get: vi.fn().mockResolvedValue({ data: mockBundle() })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    const { result } = renderHook(() => usePractitionerRecords('pat-1'), {
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

  it('does not call $everything endpoint', async () => {
    const apiMock = {
      get: vi.fn().mockResolvedValue({ data: mockBundle() })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    const { result } = renderHook(() => usePractitionerRecords('pat-1'), {
      wrapper: TestWrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const allUrls = apiMock.get.mock.calls.map((c: [string]) => c[0]);
    for (const url of allUrls) {
      expect(url).not.toContain('$everything');
    }
  });

  it('returns empty records when patientId is null', async () => {
    const { result } = renderHook(() => usePractitionerRecords(null), {
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

    const { result } = renderHook(() => usePractitionerRecords('pat-1'), {
      wrapper: TestWrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const obsUrl = apiMock.get.mock.calls[2][0] as string;
    expect(obsUrl).toContain('Observation');
    expect(obsUrl).toContain('code=http://loinc.org|67855-7,51855-5');
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

    const { result } = renderHook(() => usePractitionerRecords('pat-1'), {
      wrapper: TestWrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasNextPage).toBe(true);
    expect(typeof result.current.fetchNextPage).toBe('function');
  });

  it('includes all QuestionnaireResponses (practitioner view)', async () => {
    const apiMock = {
      get: vi.fn().mockResolvedValue({ data: mockBundle() })
    };
    vi.mocked(getAPI).mockResolvedValue(apiMock);

    const { result } = renderHook(() => usePractitionerRecords('pat-1'), {
      wrapper: TestWrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const qrUrl = apiMock.get.mock.calls[0][0] as string;
    expect(qrUrl).toContain('QuestionnaireResponse');
    expect(qrUrl).not.toContain('author');
  });

  it('resolves titlesLoading to false after QR title resolution', async () => {
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

    const { result } = renderHook(() => usePractitionerRecords('pat-1'), {
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
