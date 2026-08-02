/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies before imports
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
  clearRedirectIntent: vi.fn()
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

import { dbGetAll } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import { getAuthCookieSession } from '@/services/auth';
import { clearIntent, getIntent } from '@/utils/redirect-intent';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useRedirectIntent } from '../useRedirectIntent';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

function HarnessInner({
  isLoading,
  authState
}: {
  isLoading: boolean;
  authState: Record<string, unknown>;
}) {
  useRedirectIntent({ isLoading, authState });
  return null;
}

function TestHarness({
  isLoading,
  authState
}: {
  isLoading: boolean;
  authState: Record<string, unknown>;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <HarnessInner isLoading={isLoading} authState={authState} />
    </QueryClientProvider>
  );
}

describe('useRedirectIntent cancellation handling', () => {
  const mockPush = vi.fn();
  const mockPatch = vi.fn();
  const mockCanceledError = { name: 'CanceledError', code: 'ERR_CANCELED' };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn()
    } as any);

    vi.mocked(getIntent).mockReturnValue(null);
    vi.mocked(getAPI).mockResolvedValue({
      patch: mockPatch
    });
    vi.mocked(dbGetAll).mockResolvedValue([]);
    vi.mocked(getAuthCookieSession).mockResolvedValue({
      authenticated: true,
      role_name: 'Patient',
      roles: ['Patient', 'Practitioner']
    });
  });

  it('treats a canceled claim as benign — no toast, no clearIntent, no console.error', async () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => void 0);
    vi.mocked(getIntent).mockReturnValue({
      kind: 'assessmentResult',
      payload: { path: '/record', qrId: 'qr-123' },
      createdAt: Date.now()
    });
    mockPatch.mockRejectedValue(mockCanceledError);

    render(
      <TestHarness isLoading={false} authState={{ isAuthenticated: true }} />
    );

    await vi.waitFor(() => {
      expect(mockPatch).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      expect(toast.error).not.toHaveBeenCalled();
      expect(clearIntent).not.toHaveBeenCalled();
    });
    const restoreIntentLogs = errorSpy.mock.calls.filter(call =>
      String(call[0]).includes('Failed to restore intent')
    );
    expect(restoreIntentLogs).toHaveLength(0);
  });

  it('still reports real claim failures with a toast and clears the intent', async () => {
    mockPatch.mockRejectedValue(new Error('claim failed: 500'));
    vi.mocked(getIntent).mockReturnValue({
      kind: 'assessmentResult',
      payload: { path: '/record', qrId: 'qr-123' },
      createdAt: Date.now()
    });

    render(
      <TestHarness isLoading={false} authState={{ isAuthenticated: true }} />
    );

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(clearIntent).toHaveBeenCalled();
  });

  it('re-processes the intent when the effect re-runs after a canceled claim', async () => {
    vi.mocked(getIntent).mockReturnValue({
      kind: 'assessmentResult',
      payload: { path: '/record', qrId: 'qr-123' },
      createdAt: Date.now()
    });

    let rejectClaim: (err: unknown) => void;
    const pendingCancel = new Promise<never>((_resolve, reject) => {
      rejectClaim = reject;
    });
    mockPatch
      .mockReturnValueOnce(pendingCancel)
      .mockResolvedValueOnce({ data: { claimed: true, count: 0 } });

    const { rerender } = render(
      <TestHarness isLoading={false} authState={{ isAuthenticated: true }} />
    );

    await vi.waitFor(() => {
      expect(mockPatch).toHaveBeenCalledTimes(1);
    });

    // Changing userInfo re-runs the effect; cleanup aborts the in-flight claim.
    rerender(
      <TestHarness
        isLoading={false}
        authState={{ isAuthenticated: true, userInfo: { id: 'user-2' } }}
      />
    );
    rejectClaim(mockCanceledError);

    // The re-run must re-attempt the claim and complete it.
    await vi.waitFor(() => {
      expect(mockPatch).toHaveBeenCalledTimes(2);
    });
    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
    expect(mockPush).toHaveBeenCalledWith('/record');
    expect(clearIntent).toHaveBeenCalled();
  });
});
