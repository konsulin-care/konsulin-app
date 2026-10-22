import type { QueryClient } from '@tanstack/react-query';
import type { AxiosInstance } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Registry shared between the mock factory and the tests (mock-prefixed so
// vitest can hoist the factory safely).
const mockRegistry = new Map<string, (payload: unknown) => Promise<void>>();

vi.mock('@/lib/submission-queue', () => ({
  registerSubmissionHandler: (
    kind: string,
    fn: (payload: unknown) => Promise<void>
  ) => {
    mockRegistry.set(kind, fn);
  }
}));

vi.mock('@/services/api', () => ({ getAPI: vi.fn() }));

vi.mock('@/components/general/query-provider', () => ({
  getAppQueryClient: vi.fn()
}));

import { getAppQueryClient } from '@/components/general/query-provider';
import {
  isNetworkError,
  QUESTIONNAIRE_RESPONSE_KIND,
  registerSubmissionReplayHandlers,
  SOAP_BUNDLE_KIND
} from '@/lib/submission-replay';
import { getAPI } from '@/services/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registerSubmissionReplayHandlers', () => {
  it('registers handlers for both submission kinds', () => {
    registerSubmissionReplayHandlers();

    expect(mockRegistry.has(QUESTIONNAIRE_RESPONSE_KIND)).toBe(true);
    expect(mockRegistry.has(SOAP_BUNDLE_KIND)).toBe(true);
  });
});

describe('questionnaire response replay', () => {
  it('re-posts the stored payload to /fhir/QuestionnaireResponse', async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: {} });
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);

    registerSubmissionReplayHandlers();
    const handler = mockRegistry.get(QUESTIONNAIRE_RESPONSE_KIND);
    expect(handler).toBeDefined();

    const payload = { resourceType: 'QuestionnaireResponse', id: 'QR-1' };
    await handler?.(payload);

    expect(mockPost).toHaveBeenCalledWith(
      '/fhir/QuestionnaireResponse',
      payload
    );
  });

  it('invalidates research queries after a successful replay', async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: {} });
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);
    const invalidateQueries = vi.fn();
    vi.mocked(getAppQueryClient).mockReturnValue({
      invalidateQueries
    } as unknown as QueryClient);

    registerSubmissionReplayHandlers();
    const handler = mockRegistry.get(QUESTIONNAIRE_RESPONSE_KIND);

    await handler?.({ resourceType: 'QuestionnaireResponse' });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['research'] });
  });
});

describe('soap bundle replay', () => {
  it('re-posts the stored bundle to /fhir', async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: {} });
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);

    registerSubmissionReplayHandlers();
    const handler = mockRegistry.get(SOAP_BUNDLE_KIND);
    expect(handler).toBeDefined();

    const bundle = { resourceType: 'Bundle', type: 'transaction', entry: [] };
    await handler?.(bundle);

    expect(mockPost).toHaveBeenCalledWith('/fhir', bundle);
  });
});

describe('isNetworkError', () => {
  it('treats ERR_NETWORK codes as network failures', () => {
    expect(isNetworkError({ code: 'ERR_NETWORK' })).toBe(true);
  });

  it('treats errors without a response as network failures', () => {
    expect(isNetworkError({ message: 'Network Error' })).toBe(true);
  });

  it('treats HTTP errors with a response as non-network failures', () => {
    expect(isNetworkError({ response: { status: 500 } })).toBe(false);
  });

  it('treats non-objects as non-network failures', () => {
    expect(isNetworkError('string')).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
