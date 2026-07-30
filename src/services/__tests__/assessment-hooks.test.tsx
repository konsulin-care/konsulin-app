import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Questionnaire } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAPI } from '../api';
import {
  useCuratedAssessments,
  useFeaturedAssessments
} from '../api/assessment';

vi.mock('../api', () => ({
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

const MOCK_BUNDLE = {
  data: {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: [
      {
        resource: {
          resourceType: 'Questionnaire',
          id: 'phq-9',
          title: 'PHQ-9',
          status: 'active',
          extension: [],
          useContext: [],
          code: [{ system: 'https://lucide.dev/icons', code: 'brain' }]
        } as Questionnaire
      },
      {
        resource: {
          resourceType: 'Questionnaire',
          id: 'gad-7',
          title: 'GAD-7',
          status: 'active',
          extension: [],
          useContext: [],
          code: [{ system: 'https://lucide.dev/icons', code: 'activity' }]
        } as Questionnaire
      }
    ]
  }
};

describe('useCuratedAssessments', () => {
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGet = vi.fn().mockResolvedValue(MOCK_BUNDLE);
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as ReturnType<typeof getAPI>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches questionnaires with context=regular and status=active', async () => {
    const { result } = renderHook(() => useCuratedAssessments(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('context=regular')
    );
  });

  it('requests _elements for icon, duration, and category fields', async () => {
    renderHook(() => useCuratedAssessments(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining(
          'id,title,description,extension,useContext,code'
        )
      );
    });
  });

  it('returns questionnaire resources (not bundle entries)', async () => {
    const { result } = renderHook(() => useCuratedAssessments(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].id).toBe('phq-9');
  });

  it('returns empty array when no entries', async () => {
    mockGet.mockResolvedValue({ data: { entry: [] } });

    const { result } = renderHook(() => useCuratedAssessments(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('includes status=active in the query', async () => {
    renderHook(() => useCuratedAssessments(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('status=active')
      );
    });
  });
});

describe('useFeaturedAssessments', () => {
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGet = vi.fn().mockResolvedValue(MOCK_BUNDLE);
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as ReturnType<typeof getAPI>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches with context=popular and _elements', async () => {
    renderHook(() => useFeaturedAssessments(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('context=popular')
      );
    });
  });

  it('returns questionnaire resources', async () => {
    const { result } = renderHook(() => useFeaturedAssessments(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].id).toBe('phq-9');
  });

  it('requests extended _elements', async () => {
    renderHook(() => useFeaturedAssessments(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining(
          'id,title,description,extension,useContext,code'
        )
      );
    });
  });
});
