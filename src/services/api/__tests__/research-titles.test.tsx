import { FhirExtensionUrls } from '@/utils/fhir/extensions';
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

/** Wrapper bound to an explicit QueryClient so cache state can be asserted. */
function createWrapperWithClient(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const DURATION_URL = FhirExtensionUrls.questionnaireEstimatedDuration;

const TITLES_BUNDLE: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  entry: [
    {
      resource: {
        resourceType: 'Questionnaire',
        id: 'phq2',
        status: 'active',
        title: 'PHQ-2',
        extension: [
          {
            url: DURATION_URL,
            valueDuration: { value: 8, code: 'min' }
          }
        ]
      }
    },
    {
      resource: {
        resourceType: 'Questionnaire',
        id: 'big-five-inventory',
        status: 'active',
        title: 'Big Five Inventory',
        extension: [
          {
            url: DURATION_URL,
            valueInteger: 15
          }
        ]
      }
    }
  ]
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('useQuestionnaireTitles', () => {
  it('batch-fetches titles and durations for the given ids', async () => {
    const mockGet = vi.fn().mockResolvedValue({ data: TITLES_BUNDLE });
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    const { result } = renderHook(
      () => useQuestionnaireTitles(['phq2', 'big-five-inventory', 'phq2']),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(
      '/fhir/Questionnaire?_id=big-five-inventory,phq2&_elements=id,title,extension'
    );
    expect(result.current.data).toEqual(
      new Map([
        [
          'big-five-inventory',
          { title: 'Big Five Inventory', durationMinutes: 15 }
        ],
        ['phq2', { title: 'PHQ-2', durationMinutes: 8 }]
      ])
    );
  });

  it('reports a null duration when the extension is missing', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'searchset',
        entry: [
          {
            resource: {
              resourceType: 'Questionnaire',
              id: 'gad-7',
              status: 'active',
              title: 'GAD-7'
            }
          }
        ]
      }
    });
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useQuestionnaireTitles(['gad-7']), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(
      new Map([['gad-7', { title: 'GAD-7', durationMinutes: null }]])
    );
  });

  it('seeds the shared per-questionnaire title and duration caches', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    const mockGet = vi.fn().mockResolvedValue({ data: TITLES_BUNDLE });
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useQuestionnaireTitles(['phq2']), {
      wrapper: createWrapperWithClient(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(['questionnaire', 'phq2', 'title'])).toBe(
      'PHQ-2'
    );
    expect(
      queryClient.getQueryData(['questionnaire', 'big-five-inventory', 'title'])
    ).toBe('Big Five Inventory');
    expect(
      queryClient.getQueryData(['questionnaire', 'phq2', 'duration'])
    ).toBe(8);
  });

  it('merges cached titles for the requested ids without refetching', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    queryClient.setQueryData(
      ['questionnaire', 'phq2', 'title'],
      'PHQ-2 cached'
    );
    const mockGet = vi.fn().mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'searchset',
        entry: [
          {
            resource: {
              resourceType: 'Questionnaire',
              id: 'gad-7',
              status: 'active',
              title: 'GAD-7'
            }
          }
        ]
      }
    });
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    const { result } = renderHook(
      () => useQuestionnaireTitles(['phq2', 'gad-7']),
      { wrapper: createWrapperWithClient(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(
      new Map([
        ['gad-7', { title: 'GAD-7', durationMinutes: null }],
        ['phq2', { title: 'PHQ-2 cached', durationMinutes: null }]
      ])
    );
  });

  it('does not fetch when there are no ids', () => {
    const mockGet = vi.fn();
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useQuestionnaireTitles([]), {
      wrapper: createWrapper()
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
