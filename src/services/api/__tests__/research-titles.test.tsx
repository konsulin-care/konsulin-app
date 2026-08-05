import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { Bundle } from 'fhir/r4';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAPI } from '../../api';
import { useQuestionnaireTitles } from '../research';

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

const TITLES_BUNDLE: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  entry: [
    {
      resource: {
        resourceType: 'Questionnaire',
        id: 'phq2',
        status: 'active',
        title: 'PHQ-2'
      }
    },
    {
      resource: {
        resourceType: 'Questionnaire',
        id: 'big-five-inventory',
        status: 'active',
        title: 'Big Five Inventory'
      }
    }
  ]
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('useQuestionnaireTitles', () => {
  it('batch-fetches titles for the given ids and returns an id to title map', async () => {
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
      '/fhir/Questionnaire?_id=big-five-inventory,phq2&_elements=id,title'
    );
    expect(result.current.data).toEqual({
      'big-five-inventory': 'Big Five Inventory',
      phq2: 'PHQ-2'
    });
  });

  it('seeds the shared per-questionnaire title cache used by /record', async () => {
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
  });

  it('merges titles already cached for the requested ids', async () => {
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
    expect(result.current.data).toEqual({
      'gad-7': 'GAD-7',
      phq2: 'PHQ-2 cached'
    });
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
