import { enqueueSubmission } from '@/lib/submission-queue';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { Bundle, QuestionnaireResponse } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAPI } from '../api';
import { useSubmitQuestionnaire, useSubmitSoapBundle } from '../api/assessment';

vi.mock('../api', () => ({ getAPI: vi.fn() }));

vi.mock('../anonymous-session', () => ({
  ensureAnonymousSession: vi.fn(),
  buildAnonymousIdentifier: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: {
    assessmentDrafts: 'assessment_drafts',
    pendingSubmissions: 'pending_submissions'
  },
  dbDelete: vi.fn(() => Promise.resolve())
}));

vi.mock('@/lib/submission-queue', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/lib/submission-queue')>();
  return { ...actual, enqueueSubmission: vi.fn() };
});

import {
  buildAnonymousIdentifier,
  ensureAnonymousSession
} from '../anonymous-session';

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

const MOCK_QR: QuestionnaireResponse = {
  resourceType: 'QuestionnaireResponse',
  id: 'QR-1',
  questionnaire: 'Questionnaire/phq2',
  status: 'completed',
  item: []
};

const NETWORK_ERROR = { code: 'ERR_NETWORK' };

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('offline submission queue', () => {
  it('queues the prepared payload on network failure instead of throwing', async () => {
    const mockPost = vi.fn().mockRejectedValue(NETWORK_ERROR);
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);
    const mockEnqueue = vi.mocked(enqueueSubmission).mockResolvedValue({
      id: 'q1',
      ownerId: '',
      kind: 'questionnaire-response',
      payload: {},
      createdAt: 1,
      attempts: 0
    });

    const { result } = renderHook(() => useSubmitQuestionnaire('phq2', true), {
      wrapper: createWrapper()
    });

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.mutateAsync(MOCK_QR);
    });

    expect(outcome).toMatchObject({ queued: true });
    expect(mockPost).toHaveBeenCalledWith(
      '/fhir/QuestionnaireResponse',
      expect.objectContaining({ status: 'completed' })
    );
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    const [kind, payload] = mockEnqueue.mock.calls[0];
    expect(kind).toBe('questionnaire-response');
    expect(payload).toMatchObject({
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: 'https://konsulin.care/fhir/Questionnaire/phq2'
    });
  });

  it('rethrows non-network errors without queueing', async () => {
    const mockPost = vi.fn().mockRejectedValue({
      response: { status: 500 },
      message: 'Server error'
    });
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useSubmitQuestionnaire('phq2', true), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await expect(result.current.mutateAsync(MOCK_QR)).rejects.toBeDefined();
    });

    expect(enqueueSubmission).not.toHaveBeenCalled();
  });

  it('queues even when the anonymous session call fails offline', async () => {
    vi.mocked(ensureAnonymousSession).mockRejectedValue(NETWORK_ERROR);
    vi.mocked(buildAnonymousIdentifier).mockReturnValue({
      system: 'https://konsulin.care/fhir/CodeSystem/anonymous-session',
      value: 'guest-1'
    });
    const mockPost = vi.fn().mockRejectedValue(NETWORK_ERROR);
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);
    const mockEnqueue = vi.mocked(enqueueSubmission).mockResolvedValue({
      id: 'q2',
      ownerId: 'guest-1',
      kind: 'questionnaire-response',
      payload: {},
      createdAt: 1,
      attempts: 0
    });

    const { result } = renderHook(() => useSubmitQuestionnaire('phq2', false), {
      wrapper: createWrapper()
    });

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.mutateAsync(MOCK_QR);
    });

    expect(outcome).toMatchObject({ queued: true });
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
  });

  it('queues a SOAP bundle on network failure', async () => {
    const mockPost = vi.fn().mockRejectedValue(NETWORK_ERROR);
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);
    const mockEnqueue = vi.mocked(enqueueSubmission).mockResolvedValue({
      id: 'q3',
      ownerId: '',
      kind: 'soap-bundle',
      payload: {},
      createdAt: 1,
      attempts: 0
    });

    const { result } = renderHook(() => useSubmitSoapBundle(), {
      wrapper: createWrapper()
    });

    const bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: []
    } as Bundle;

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.mutateAsync(bundle);
    });

    expect(outcome).toMatchObject({ queued: true });
    expect(mockPost).toHaveBeenCalledWith('/fhir', bundle);
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    const [kind, payload] = mockEnqueue.mock.calls[0];
    expect(kind).toBe('soap-bundle');
    expect(payload).toEqual(bundle);
  });
});
