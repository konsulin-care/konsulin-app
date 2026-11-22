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

vi.mock('@/services/anonymous-session', () => ({
  ensureAnonymousSession: vi.fn(),
  buildAnonymousIdentifier: vi.fn((guestId: string) => ({
    system: 'https://login.konsulin.care/guestid',
    value: guestId
  }))
}));

import { getAppQueryClient } from '@/components/general/query-provider';
import {
  isNetworkError,
  QUESTIONNAIRE_RESPONSE_KIND,
  registerSubmissionReplayHandlers,
  SOAP_BUNDLE_KIND
} from '@/lib/submission-replay';
import { ensureAnonymousSession } from '@/services/anonymous-session';
import { getAPI } from '@/services/api';
import { ApiError } from '@/services/api-error';

const QUESTIONNAIRE_RESPONSE_URL = '/fhir/QuestionnaireResponse';

const boundPayload = {
  resourceType: 'QuestionnaireResponse',
  id: 'QR-1',
  author: { reference: 'Patient/patient-1' },
  questionnaire: 'Questionnaire/questionnaire-1',
  authored: '2025-01-01T10:00:00Z'
};

/**
 * Mocks the API surface used by the questionnaire response handler.
 *
 * @param total - The exists probe result count to return.
 * @returns The mocked post and get functions.
 */
function mockQuestionnaireApi(total: number): {
  mockPost: ReturnType<typeof vi.fn>;
  mockGet: ReturnType<typeof vi.fn>;
} {
  const mockPost = vi.fn().mockResolvedValue({ data: {} });
  const mockGet = vi.fn().mockResolvedValue({
    data: { resourceType: 'Bundle', total }
  });
  vi.mocked(getAPI).mockResolvedValue({
    post: mockPost,
    get: mockGet
  } as unknown as AxiosInstance);
  return { mockPost, mockGet };
}

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
  it('re-posts the stored payload when the exists probe returns no match', async () => {
    const { mockPost } = mockQuestionnaireApi(0);

    registerSubmissionReplayHandlers();
    const handler = mockRegistry.get(QUESTIONNAIRE_RESPONSE_KIND);
    expect(handler).toBeDefined();

    await handler?.(boundPayload);

    expect(mockPost).toHaveBeenCalledWith(
      QUESTIONNAIRE_RESPONSE_URL,
      boundPayload
    );
  });

  it('resolves without posting when the exists probe already finds a match', async () => {
    const { mockPost } = mockQuestionnaireApi(1);

    registerSubmissionReplayHandlers();
    const handler = mockRegistry.get(QUESTIONNAIRE_RESPONSE_KIND);

    await handler?.(boundPayload);

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('probes by questionnaire, authored range and count summary', async () => {
    const { mockGet } = mockQuestionnaireApi(0);

    registerSubmissionReplayHandlers();
    const handler = mockRegistry.get(QUESTIONNAIRE_RESPONSE_KIND);

    await handler?.(boundPayload);

    const probeUrl = mockGet.mock.calls[0]?.[0] as string;
    expect(probeUrl).toContain('questionnaire=Questionnaire/questionnaire-1');
    expect(probeUrl).toContain('authored=ge2025-01-01T10:00:00Z');
    expect(probeUrl).toContain('authored=le2025-01-01T10:00:00Z');
    expect(probeUrl).toContain('_summary=count');
    expect(probeUrl).toContain('author=Patient/patient-1');
  });

  it('binds an unbound guest payload with an anonymous identifier', async () => {
    const { mockPost } = mockQuestionnaireApi(0);
    vi.mocked(ensureAnonymousSession).mockResolvedValue('guest-123');
    const guestPayload = {
      resourceType: 'QuestionnaireResponse',
      questionnaire: 'Questionnaire/questionnaire-1',
      authored: '2025-01-01T10:00:00Z'
    };

    registerSubmissionReplayHandlers();
    const handler = mockRegistry.get(QUESTIONNAIRE_RESPONSE_KIND);

    await handler?.(guestPayload);

    expect(ensureAnonymousSession).toHaveBeenCalledWith(false);
    expect(mockPost).toHaveBeenCalledWith(QUESTIONNAIRE_RESPONSE_URL, {
      ...guestPayload,
      identifier: [
        {
          system: 'https://login.konsulin.care/guestid',
          value: 'guest-123'
        }
      ]
    });
  });

  it('invalidates research queries after a successful replay', async () => {
    mockQuestionnaireApi(0);
    const invalidateQueries = vi.fn();
    vi.mocked(getAppQueryClient).mockReturnValue({
      invalidateQueries
    } as unknown as QueryClient);

    registerSubmissionReplayHandlers();
    const handler = mockRegistry.get(QUESTIONNAIRE_RESPONSE_KIND);

    await handler?.(boundPayload);

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
  it('returns false for an ApiError with status 400', () => {
    expect(isNetworkError(new ApiError({ response: { status: 400 } }))).toBe(
      false
    );
  });

  it('returns false for an ApiError with status 500', () => {
    expect(isNetworkError(new ApiError({ response: { status: 500 } }))).toBe(
      false
    );
  });

  it('returns true for an ApiError with code ERR_NETWORK and no status', () => {
    expect(isNetworkError(new ApiError({ code: 'ERR_NETWORK' }))).toBe(true);
  });

  it('treats errors without a status as network failures', () => {
    expect(isNetworkError({ message: 'Network Error' })).toBe(true);
  });

  it('treats non-objects as non-network failures', () => {
    expect(isNetworkError('string')).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
