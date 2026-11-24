import { INSTRUMENT_SYSTEM } from '@/lib/interpretation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { Bundle } from 'fhir/r4';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAPI } from '../../api';
import { useQuestionnaireTitles } from '../questionnaire-info';

vi.mock('../../api', () => ({
  getAPI: vi.fn()
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useQuestionnaireTitles instrument coding', () => {
  it('maps the Konsulin instrument coding to instrument info', async () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Questionnaire',
            id: 'phq-9',
            status: 'active',
            title: 'PHQ-9',
            code: [
              {
                system: 'http://loinc.org',
                code: '44261-6'
              },
              {
                system: INSTRUMENT_SYSTEM,
                code: 'phq-9'
              }
            ]
          }
        },
        {
          resource: {
            resourceType: 'Questionnaire',
            id: 'unknown',
            status: 'active',
            title: 'Unknown'
          }
        }
      ]
    };
    const mockGet = vi.fn().mockResolvedValue({ data: bundle });
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    const { result } = renderHook(
      () => useQuestionnaireTitles(['phq-9', 'unknown']),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.get('phq-9')).toEqual({
      title: 'PHQ-9',
      durationMinutes: null,
      instrument: { system: INSTRUMENT_SYSTEM, code: 'phq-9' }
    });
    expect(result.current.data?.get('unknown')).toEqual({
      title: 'Unknown',
      durationMinutes: null,
      instrument: null
    });
  });
});
