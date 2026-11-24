import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { QuestionnaireResponse } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAPI } from '../../api';
import {
  useSubmitQuestionnaire,
  useUpdateSubmitQuestionnaire
} from '../assessment';

vi.mock('../../api', () => ({ getAPI: vi.fn() }));

vi.mock('../../anonymous-session', () => ({
  ensureAnonymousSession: vi.fn(),
  buildAnonymousIdentifier: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { assessmentDrafts: 'assessment_drafts' },
  dbDelete: vi.fn(() => Promise.resolve())
}));

vi.mock('@/utils/redirect-intent', () => ({
  markGuestSubmission: vi.fn()
}));

import { markGuestSubmission } from '@/utils/redirect-intent';
import { ensureAnonymousSession } from '../../anonymous-session';

const MOCK_QR: QuestionnaireResponse = {
  resourceType: 'QuestionnaireResponse',
  id: 'QR-1',
  questionnaire: 'Questionnaire/phq2',
  status: 'completed',
  item: []
};

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

function mockApi(overrides: Partial<Record<'post' | 'put', unknown>>) {
  const api = {
    post: vi.fn(),
    put: vi.fn(),
    ...overrides
  };
  vi.mocked(getAPI).mockResolvedValue(api as unknown as AxiosInstance);
  return api;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ensureAnonymousSession).mockResolvedValue('guest-1');
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('guest submission marker', () => {
  it('records the marker after a successful guest submission', async () => {
    const api = mockApi({ post: vi.fn().mockResolvedValue({ data: MOCK_QR }) });

    const { result } = renderHook(() => useSubmitQuestionnaire('phq2', false), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.mutateAsync(MOCK_QR);
    });

    expect(api.post).toHaveBeenCalledWith(
      '/fhir/QuestionnaireResponse',
      expect.anything()
    );
    expect(markGuestSubmission).toHaveBeenCalledTimes(1);
  });

  it('records the marker after a successful guest update', async () => {
    const api = mockApi({ put: vi.fn().mockResolvedValue({ data: MOCK_QR }) });

    const { result } = renderHook(
      () => useUpdateSubmitQuestionnaire('phq2', false),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.mutateAsync(MOCK_QR);
    });

    expect(api.put).toHaveBeenCalled();
    expect(markGuestSubmission).toHaveBeenCalledTimes(1);
  });

  it('does not record the marker for an authenticated submission', async () => {
    mockApi({ post: vi.fn().mockResolvedValue({ data: MOCK_QR }) });

    const { result } = renderHook(() => useSubmitQuestionnaire('phq2', true), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.mutateAsync(MOCK_QR);
    });

    expect(ensureAnonymousSession).not.toHaveBeenCalled();
    expect(markGuestSubmission).not.toHaveBeenCalled();
  });

  it('does not record the marker when the guest submission fails', async () => {
    const serverError = Object.assign(new Error('server error'), {
      status: 500
    });
    mockApi({ post: vi.fn().mockRejectedValue(serverError) });

    const { result } = renderHook(() => useSubmitQuestionnaire('phq2', false), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await expect(result.current.mutateAsync(MOCK_QR)).rejects.toThrow(
        'server error'
      );
    });

    expect(markGuestSubmission).not.toHaveBeenCalled();
  });
});
