import type { ResearchProgress } from '@/utils/fhir/research';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReferralWrite } from '../useReferralWrite';

const { mockUseAuth, mockWriteReferral, mockEnsureAnonymousSession } =
  vi.hoisted(() => ({
    mockUseAuth: vi.fn(),
    mockWriteReferral: vi.fn(),
    mockEnsureAnonymousSession: vi.fn()
  }));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: mockUseAuth
}));

vi.mock('@/services/api/referral', () => ({
  writeReferralCommunication: mockWriteReferral
}));

vi.mock('@/services/anonymous-session', () => ({
  ensureAnonymousSession: mockEnsureAnonymousSession
}));

const CANONICAL_BATCH = {
  id: 'batch-1',
  start: '2026-08-01',
  end: '2026-08-31',
  questionnaireIds: ['phq2']
};

function progressWith(isComplete: boolean): ResearchProgress {
  return {
    studies: [
      {
        study: { id: 'study-1' },
        batches: [],
        currentBatch: CANONICAL_BATCH,
        completedCount: isComplete ? 1 : 0,
        totalCount: 1,
        isComplete,
        firstUncompletedQuestionnaireId: isComplete ? null : 'phq2',
        completedQuestionnaireIds: isComplete ? ['phq2'] : [],
        history: [],
        consecutiveBatches: 0
      }
    ],
    cumulativeResponses: 1,
    currentLevel: { level: 1, title: 'Starter', current: 1, next: 5 },
    nextLevel: { level: 2, title: 'Next', current: 1, next: 5 },
    levelProgress: { current: { level: 1 }, next: { level: 2 } } as never,
    completedQuestionnaireIds: isComplete ? ['phq2'] : []
  } as unknown as ResearchProgress;
}

describe('useReferralWrite', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockWriteReferral.mockReset();
    mockEnsureAnonymousSession.mockReset();
    window.history.replaceState({}, '', '/research');
  });

  it('writes exactly one Communication when a patient batch completes', async () => {
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: true, userInfo: { fhirId: 'PAT-REFEREE' } },
      isLoading: false
    });
    mockWriteReferral.mockResolvedValue(true);
    window.localStorage.setItem('konsulin_ref', 'p_DG3F3STPYZ6HX25A');

    const { result, rerender } = renderHook(
      ({ progress }: { progress: ResearchProgress | undefined }) =>
        useReferralWrite(progress),
      { initialProps: { progress: progressWith(false) } }
    );

    expect(mockWriteReferral).not.toHaveBeenCalled();

    rerender({ progress: progressWith(true) });

    await waitFor(() => {
      expect(mockWriteReferral).toHaveBeenCalledTimes(1);
    });
    expect(mockWriteReferral).toHaveBeenCalledWith({
      sender: 'DG3F3STPYZ6HX25A',
      recipient: 'PAT-REFEREE',
      batch: 'batch-1'
    });
    expect(
      window.localStorage.getItem('konsulin_referral_written_batch-1')
    ).toBe('1');
    expect(result.current).toBeUndefined();
  });

  it('does not write without a stored patient ref', async () => {
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: true, userInfo: { fhirId: 'PAT-REFEREE' } },
      isLoading: false
    });
    mockWriteReferral.mockResolvedValue(true);

    renderHook(() => useReferralWrite(progressWith(true)));

    await new Promise(resolve => setTimeout(resolve, 20));
    expect(mockWriteReferral).not.toHaveBeenCalled();
  });

  it('does not write when the batch is incomplete', async () => {
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: true, userInfo: { fhirId: 'PAT-REFEREE' } },
      isLoading: false
    });
    window.localStorage.setItem('konsulin_ref', 'p_DG3F3STPYZ6HX25A');

    renderHook(() => useReferralWrite(progressWith(false)));

    await new Promise(resolve => setTimeout(resolve, 20));
    expect(mockWriteReferral).not.toHaveBeenCalled();
  });

  it('does not write twice for an already written batch', async () => {
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: true, userInfo: { fhirId: 'PAT-REFEREE' } },
      isLoading: false
    });
    mockWriteReferral.mockResolvedValue(true);
    window.localStorage.setItem('konsulin_ref', 'p_DG3F3STPYZ6HX25A');
    window.localStorage.setItem('konsulin_referral_written_batch-1', '1');

    renderHook(() => useReferralWrite(progressWith(true)));

    await new Promise(resolve => setTimeout(resolve, 20));
    expect(mockWriteReferral).not.toHaveBeenCalled();
  });

  it('uses the guest session id as recipient for guest referees', async () => {
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: false, userInfo: {} },
      isLoading: false
    });
    mockEnsureAnonymousSession.mockResolvedValue('guest-123');
    mockWriteReferral.mockResolvedValue(true);
    window.localStorage.setItem('konsulin_ref', 'p_DG3F3STPYZ6HX25A');

    renderHook(() => useReferralWrite(progressWith(true)));

    await waitFor(() => {
      expect(mockWriteReferral).toHaveBeenCalledWith({
        sender: 'DG3F3STPYZ6HX25A',
        recipient: 'guest-123',
        batch: 'batch-1'
      });
    });
  });

  it('records the write even when the effect is cancelled mid-write', async () => {
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: false, userInfo: {} },
      isLoading: false
    });
    mockEnsureAnonymousSession.mockResolvedValue('guest-123');
    let resolveWrite: ((value: boolean) => void) | undefined;
    mockWriteReferral.mockReturnValue(
      new Promise<boolean>(resolve => {
        resolveWrite = resolve;
      })
    );
    window.localStorage.setItem('konsulin_ref', 'p_DG3F3STPYZ6HX25A');

    const { unmount } = renderHook(() => useReferralWrite(progressWith(true)));

    await waitFor(() => {
      expect(mockWriteReferral).toHaveBeenCalledTimes(1);
    });
    // Effect cleanup runs while the write is still pending.
    unmount();
    resolveWrite?.(true);

    await waitFor(() => {
      expect(
        window.localStorage.getItem('konsulin_referral_written_batch-1')
      ).toBe('1');
    });
  });

  it('captures a landing ?ref= into localStorage on mount', async () => {
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: false, userInfo: {} },
      isLoading: false
    });
    window.history.replaceState({}, '', '/research?ref=p_DG3F3STPYZ6HX25A');

    renderHook(() => useReferralWrite(progressWith(false)));

    await waitFor(() => {
      expect(window.localStorage.getItem('konsulin_ref')).toBe(
        'p_DG3F3STPYZ6HX25A'
      );
    });
  });
});
