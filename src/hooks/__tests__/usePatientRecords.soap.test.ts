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

function mockBundle() {
  return { resourceType: 'Bundle', type: 'searchset', entry: [] };
}

describe('usePatientRecords SOAP title resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProfileById).mockResolvedValue({
      id: 'pat-1',
      resourceType: 'Patient',
      name: [{ given: ['John'], family: 'Doe' }]
    } as never);
  });

  it('resolves SOAP Notes records with the questionnaire title', async () => {
    const apiMock = {
      get: vi
        .fn()
        // QR bundle with one SOAP record
        .mockResolvedValueOnce({
          data: {
            resourceType: 'Bundle',
            type: 'searchset',
            entry: [
              {
                resource: {
                  resourceType: 'QuestionnaireResponse',
                  id: 'soap-1',
                  status: 'completed',
                  questionnaire: 'Questionnaire/soap',
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
                  id: 'soap',
                  title: 'SOAP Note'
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

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // SOAP record should get the resolved questionnaire title
    await waitFor(() => expect(result.current.titlesLoading).toBe(false));
    expect(result.current.records[0].type).toBe('SOAP Notes');
    expect(result.current.records[0].title).toBe('SOAP Note');
  });
});
