import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAPI } from '../../api';
import { useQuestionnaireTitle } from '../questionnaire-info';

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

afterEach(() => {
  vi.clearAllMocks();
});

describe('useQuestionnaireTitle', () => {
  it('fetches the title for an uncached questionnaire id', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'searchset',
        entry: [
          {
            resource: {
              resourceType: 'Questionnaire',
              id: 'phq-9',
              status: 'active',
              title: 'PHQ-9'
            }
          }
        ]
      }
    });
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useQuestionnaireTitle('phq-9'), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(
      '/fhir/Questionnaire?_id=phq-9&_elements=title'
    );
    expect(result.current.data).toBe('PHQ-9');
  });

  it('reads an already-cached title without fetching', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    queryClient.setQueryData(
      ['questionnaire', 'phq-9', 'title'],
      'PHQ-9 cached'
    );
    const mockGet = vi.fn();
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useQuestionnaireTitle('phq-9'), {
      wrapper: createWrapperWithClient(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.data).toBe('PHQ-9 cached');
  });

  it('falls back to the id when the questionnaire has no title and seeds the cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    const mockGet = vi.fn().mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'searchset',
        entry: [
          {
            resource: {
              resourceType: 'Questionnaire',
              id: 'ocean',
              status: 'active'
            }
          }
        ]
      }
    });
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useQuestionnaireTitle('ocean'), {
      wrapper: createWrapperWithClient(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe('ocean');
    expect(queryClient.getQueryData(['questionnaire', 'ocean', 'title'])).toBe(
      'ocean'
    );
  });

  it('does not fetch when no id is given', () => {
    const mockGet = vi.fn();
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useQuestionnaireTitle(''), {
      wrapper: createWrapper()
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
