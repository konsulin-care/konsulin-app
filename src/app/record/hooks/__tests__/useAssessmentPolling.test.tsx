import { renderHook } from '@testing-library/react';
import type { QuestionnaireResponse } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDbGet, mockDbDelete, mockGetAPI } = vi.hoisted(() => ({
  mockDbGet: vi.fn(),
  mockDbDelete: vi.fn(),
  mockGetAPI: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { serviceRequests: 'serviceRequests' },
  dbGet: mockDbGet,
  dbDelete: mockDbDelete
}));

vi.mock('@/services/api', () => ({
  getAPI: mockGetAPI
}));

import { useAssessmentPolling } from '../useAssessmentPolling';

function buildQR(resultBrief?: string): QuestionnaireResponse {
  return {
    resourceType: 'QuestionnaireResponse',
    id: 'qr-1',
    status: 'completed',
    questionnaire: 'Questionnaire/test-q',
    item: [
      {
        linkId: 'interpretation',
        item: resultBrief
          ? [{ linkId: 'result-brief', answer: [{ valueString: resultBrief }] }]
          : []
      }
    ]
  } as QuestionnaireResponse;
}

describe('useAssessmentPolling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns existing result brief when present and not placeholder', () => {
    const qr = buildQR('Mild depression');
    const { result } = renderHook(() =>
      useAssessmentPolling({
        recordId: 'qr-1',
        questionnaireResponse: qr,
        isAuthenticated: true
      })
    );
    expect(result.current.polledResultBrief).toBe('Mild depression');
  });

  it('returns null for guest users', () => {
    const qr = buildQR('Mild depression');
    const { result } = renderHook(() =>
      useAssessmentPolling({
        recordId: 'qr-1',
        questionnaireResponse: qr,
        isAuthenticated: false
      })
    );
    expect(result.current.polledResultBrief).toBeNull();
  });

  it('returns null when no result brief exists', () => {
    const qr = buildQR();
    const { result } = renderHook(() =>
      useAssessmentPolling({
        recordId: 'qr-1',
        questionnaireResponse: qr,
        isAuthenticated: true
      })
    );
    expect(result.current.polledResultBrief).toBeNull();
  });
});
