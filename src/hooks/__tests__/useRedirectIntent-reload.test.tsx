import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn() })
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/services/anonymous-session', () => ({
  ensureAnonymousSession: vi.fn()
}));

vi.mock('@/services/auth', () => ({
  getAuthCookieSession: vi.fn(),
  fetchCSRFToken: vi.fn()
}));

vi.mock('@/utils/redirect-intent', () => ({
  getIntent: vi.fn(),
  getRedirectIntent: vi.fn(),
  clearIntent: vi.fn(),
  clearRedirectIntent: vi.fn(),
  hasPendingAssessmentClaimIntent: vi.fn(() => false),
  hasRecentGuestSubmission: vi.fn(() => false),
  clearGuestSubmission: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { assessmentDrafts: 'assessment_drafts' },
  dbGetAll: vi.fn(),
  dbDelete: vi.fn()
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

import type { IStateAuth } from '@/context/auth/authTypes';
import { dbGetAll } from '@/lib/indexeddb';
import { ensureAnonymousSession } from '@/services/anonymous-session';
import { getAPI } from '@/services/api';
import { getAuthCookieSession } from '@/services/auth';
import {
  clearGuestSubmission,
  getIntent,
  hasPendingAssessmentClaimIntent,
  hasRecentGuestSubmission
} from '@/utils/redirect-intent';
import type { AxiosInstance } from 'axios';
import { useRedirectIntent } from '../useRedirectIntent';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

function TestHarness({
  isLoading,
  authState
}: {
  isLoading: boolean;
  authState: Record<string, unknown>;
}) {
  useRedirectIntent({
    isLoading,
    authState: authState as unknown as IStateAuth
  });
  return null;
}

function renderHarness(authState: Record<string, unknown>) {
  return render(
    <QueryClientProvider client={queryClient}>
      <TestHarness isLoading={false} authState={authState} />
    </QueryClientProvider>
  );
}

/** Stubs the navigation timing entry type observed by the reload hook. */
function stubNavigationType(type: string) {
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
    { type }
  ] as unknown as PerformanceEntry[]);
}

describe('useRedirectIntent reload anonymous session', () => {
  const mockPatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('konsulin_initial_pathname', '/');

    vi.mocked(getIntent).mockReturnValue(null);
    vi.mocked(getAPI).mockResolvedValue({
      patch: mockPatch
    } as unknown as AxiosInstance);
    vi.mocked(getAuthCookieSession).mockResolvedValue({
      authenticated: true,
      role_name: 'Patient',
      roles: ['Patient']
    });
    vi.mocked(dbGetAll).mockResolvedValue([]);
    vi.mocked(hasPendingAssessmentClaimIntent).mockReturnValue(false);
    vi.mocked(hasRecentGuestSubmission).mockReturnValue(false);
    vi.mocked(ensureAnonymousSession).mockResolvedValue(undefined);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ authenticated: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    stubNavigationType('reload');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    ['a pending assessment claim intent', true, false],
    ['a recent guest submission', false, true]
  ])(
    'does not force a new anonymous session when there is %s',
    async (_label, pending, recent) => {
      vi.mocked(hasPendingAssessmentClaimIntent).mockReturnValue(pending);
      vi.mocked(hasRecentGuestSubmission).mockReturnValue(recent);

      renderHarness({ isAuthenticated: false });

      await vi.waitFor(() => {
        expect(hasPendingAssessmentClaimIntent).toHaveBeenCalled();
      });
      expect(ensureAnonymousSession).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('konsulin_reload_anonymous_done')).not.toBe(
        '1'
      );
    }
  );

  it('forces a new anonymous session once without a pending claim', async () => {
    renderHarness({ isAuthenticated: false });

    await vi.waitFor(() => {
      expect(ensureAnonymousSession).toHaveBeenCalledWith(true);
    });
    expect(ensureAnonymousSession).toHaveBeenCalledTimes(1);
  });

  it('clears the guest submission marker after a successful claim', async () => {
    stubNavigationType('navigate');
    vi.mocked(getIntent).mockReturnValue({
      kind: 'assessmentResult',
      payload: { path: '/record', qrId: 'qr-1' },
      createdAt: Date.now()
    });

    renderHarness({ isAuthenticated: true });

    await vi.waitFor(() => {
      expect(clearGuestSubmission).toHaveBeenCalled();
    });
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/v1/auth/anonymous/claim',
      null,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });
});
