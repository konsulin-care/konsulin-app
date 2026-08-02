import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import { useRedirectIntent } from '../useRedirectIntent';

function TestHarness({
  isLoading,
  authState
}: {
  isLoading: boolean;
  authState: Record<string, unknown>;
}) {
  useRedirectIntent({ isLoading, authState });
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

function renderHarness(authState: Record<string, unknown>) {
  return render(
    <QueryClientProvider client={queryClient}>
      <TestHarness isLoading={false} authState={authState} />
    </QueryClientProvider>
  );
}

describe('useRedirectIntent research invalidation', () => {
  const mockPush = vi.fn();
  const mockPatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn()
    } as never);

    vi.mocked(getIntent).mockReturnValue(null);
    vi.mocked(getAPI).mockResolvedValue({
      patch: mockPatch
    });
    vi.mocked(dbGetAll).mockResolvedValue([]);
    vi.mocked(getAuthCookieSession).mockResolvedValue({
      authenticated: true,
      role_name: 'Patient',
      roles: ['Patient']
    });
  });

  it('invalidates research queries after a successful anonymous claim', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(getIntent).mockReturnValue({
      kind: 'assessmentResult',
      payload: { path: '/record', qrId: 'qr-1' },
      createdAt: Date.now()
    });

    renderHarness({ isAuthenticated: true });

    await vi.waitFor(() => {
      expect(mockPatch).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['research'] });
    });
    expect(clearIntent).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/record');
  });
});
