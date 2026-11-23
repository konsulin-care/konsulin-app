import { useAuth } from '@/context/auth/authContext';
import type { PendingSubmission } from '@/lib/indexeddb';
import { listOwnedSubmissions } from '@/lib/submission-queue';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWaitingSubmissions } from '../useWaitingSubmissions';

vi.mock('@/lib/submission-queue', () => ({
  listOwnedSubmissions: vi.fn()
}));

vi.mock('@/lib/submission-replay', () => ({
  QUESTIONNAIRE_RESPONSE_KIND: 'questionnaire-response'
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

/** Builds a queued submission with the given kind and payload. */
function makeItem(
  id: string,
  kind: string,
  payload: unknown,
  status?: 'waiting' | 'parked'
): PendingSubmission {
  const item: PendingSubmission = {
    id,
    ownerId: '',
    kind,
    payload,
    createdAt: 1,
    attempts: 0
  };
  if (status) item.status = status;
  return item;
}

/** Sets the mocked auth state for the current render. */
function setAuth(options: {
  isLoading: boolean;
  isAuthenticated: boolean;
  role?: string;
  fhirId?: string;
}): void {
  vi.mocked(useAuth).mockReturnValue({
    isLoading: options.isLoading,
    dispatch: vi.fn(),
    state: {
      isAuthenticated: options.isAuthenticated,
      userInfo: {
        role_name: options.role,
        fhirId: options.fhirId
      }
    }
  } as ReturnType<typeof useAuth>);
}

describe('useWaitingSubmissions', () => {
  beforeEach(() => {
    vi.mocked(listOwnedSubmissions).mockResolvedValue([]);
    setAuth({
      isLoading: false,
      isAuthenticated: true,
      role: 'Patient',
      fhirId: 'p1'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the questionnaire and authored of waiting questionnaire responses', async () => {
    vi.mocked(listOwnedSubmissions).mockResolvedValue([
      makeItem('a', 'questionnaire-response', {
        questionnaire: 'http://q/phq-9',
        authored: '2024-01-02T03:04:05Z',
        author: { reference: 'Patient/p1' }
      }),
      makeItem(
        'parked',
        'questionnaire-response',
        { questionnaire: 'http://q/parked', authored: '2024-01-01' },
        'parked'
      ),
      makeItem('other', 'soap-bundle', {
        questionnaire: 'http://q/other',
        authored: '2024-01-03'
      }),
      makeItem('b', 'questionnaire-response', {
        questionnaire: 'http://q/gad-7',
        authored: '2024-01-04T00:00:00Z'
      })
    ]);

    const { result } = renderHook(() => useWaitingSubmissions());

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current).toEqual([
      {
        questionnaire: 'http://q/phq-9',
        authored: '2024-01-02T03:04:05Z'
      },
      {
        questionnaire: 'http://q/gad-7',
        authored: '2024-01-04T00:00:00Z'
      }
    ]);
    expect(listOwnedSubmissions).toHaveBeenCalledWith('Patient/p1', false);
  });

  it('returns an empty list while auth is loading', async () => {
    setAuth({ isLoading: true, isAuthenticated: false });

    const { result } = renderHook(() => useWaitingSubmissions());

    await waitFor(() => expect(useAuth).toHaveBeenCalled());
    expect(result.current).toEqual([]);
    expect(listOwnedSubmissions).not.toHaveBeenCalled();
  });

  it('returns an empty list and warns when reading the queue fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(listOwnedSubmissions).mockRejectedValue(
      new Error('IndexedDB unavailable')
    );

    const { result } = renderHook(() => useWaitingSubmissions());

    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(result.current).toEqual([]);
    warn.mockRestore();
  });

  it('re-reads the queue when the window fires online', async () => {
    vi.mocked(listOwnedSubmissions).mockResolvedValueOnce([
      makeItem('a', 'questionnaire-response', {
        questionnaire: 'http://q/first',
        authored: '2024-01-02'
      })
    ]);

    const { result } = renderHook(() => useWaitingSubmissions());

    await waitFor(() => expect(result.current).toHaveLength(1));

    vi.mocked(listOwnedSubmissions).mockResolvedValueOnce([
      makeItem('a', 'questionnaire-response', {
        questionnaire: 'http://q/first',
        authored: '2024-01-02'
      }),
      makeItem('b', 'questionnaire-response', {
        questionnaire: 'http://q/second',
        authored: '2024-01-03'
      })
    ]);

    window.dispatchEvent(new Event('online'));

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current[1]).toEqual({
      questionnaire: 'http://q/second',
      authored: '2024-01-03'
    });
  });
});
