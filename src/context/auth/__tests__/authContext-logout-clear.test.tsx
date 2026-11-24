import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../authContext';

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush })
}));

const mockUseSessionContext = vi.fn();
const mockGetClaimValue = vi.fn();
const mockAttemptRefreshingSession = vi.fn();

vi.mock('supertokens-auth-react/recipe/session', () => ({
  useSessionContext: () => mockUseSessionContext(), // eslint-disable-line @typescript-eslint/no-unsafe-return
  getClaimValue: () => mockGetClaimValue(), // eslint-disable-line @typescript-eslint/no-unsafe-return
  attemptRefreshingSession: () => mockAttemptRefreshingSession() // eslint-disable-line @typescript-eslint/no-unsafe-return
}));

vi.mock('supertokens-web-js/recipe/userroles', () => ({
  UserRoleClaim: 'user-role'
}));

vi.mock('@/services/auth', () => ({
  getAuthCookieSession: vi.fn(),
  restoreAuthCookie: vi.fn(),
  syncActiveRoleWithCookie: vi.fn()
}));

vi.mock('@/services/role-profiles', () => ({
  fetchUserProfilesBundle: vi.fn()
}));

vi.mock('@/services/anonymous-session', () => ({
  ensureAnonymousSession: vi.fn()
}));

vi.mock('@/services/api', () => ({
  setCurrentUserId: vi.fn(),
  getCurrentUserId: vi.fn(() => null)
}));

vi.mock('@/lib/indexeddb', () => ({
  dbGet: vi.fn(),
  dbSet: vi.fn(),
  migrateLocalStorage: vi.fn(),
  STORES: {
    guestSessions: 'guest_sessions',
    assessmentDrafts: 'assessment_drafts',
    soapDrafts: 'soap_drafts',
    serviceRequests: 'service_requests',
    tempBooking: 'temp_booking',
    uiPreferences: 'ui_preferences',
    navigationState: 'navigation_state',
    userProfile: 'user_profile'
  }
}));

vi.mock('@/lib/query-persistence/clear', () => ({
  clearQueryCache: vi.fn()
}));

vi.mock('@/utils/role-fhir', () => ({
  roleToFhirResource: vi.fn(() => 'Patient')
}));

vi.mock('@/utils/profileCompleteness', () => ({
  isProfileCompleteFromFHIR: vi.fn(() => true)
}));

vi.mock('@/utils/helper', () => ({
  mergeNames: vi.fn(() => 'Test User')
}));

import { migrateLocalStorage } from '@/lib/indexeddb';
import { clearQueryCache } from '@/lib/query-persistence/clear';
import { ensureAnonymousSession } from '@/services/anonymous-session';
import { getAuthCookieSession } from '@/services/auth';

const mockGetAuthSession = getAuthCookieSession as ReturnType<typeof vi.fn>;
const mockMigrate = migrateLocalStorage as ReturnType<typeof vi.fn>;
const mockEnsureAnonymous = ensureAnonymousSession as ReturnType<typeof vi.fn>;
const mockClearQueryCache = clearQueryCache as ReturnType<typeof vi.fn>;

/** Renders the auth provider and exposes the loading flag. */
function AuthObserver() {
  const auth = useAuth();
  return <div data-testid='auth-loading'>{String(auth.isLoading)}</div>;
}

/** Renders the auth provider with the loading observer. */
function renderWithAuthProvider() {
  return render(
    <AuthProvider>
      <AuthObserver />
    </AuthProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mockUseSessionContext.mockReturnValue({
    doesSessionExist: false,
    userId: undefined,
    accessTokenPayload: {}
  });
  mockGetClaimValue.mockResolvedValue([]);
  mockMigrate.mockResolvedValue(undefined); // eslint-disable-line unicorn/no-useless-undefined
  mockAttemptRefreshingSession.mockResolvedValue(true);
  mockEnsureAnonymous.mockResolvedValue(true);
  mockClearQueryCache.mockResolvedValue(undefined); // eslint-disable-line unicorn/no-useless-undefined
});

describe('automatic logout clears the query cache', () => {
  it('clears the query cache when no session exists', async () => {
    mockGetAuthSession.mockResolvedValue({ authenticated: false });

    renderWithAuthProvider();

    await waitFor(() => {
      expect(mockClearQueryCache).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    });
  });

  it('clears the query cache when a stale cookie cannot be deleted', async () => {
    mockGetAuthSession.mockResolvedValue({
      authenticated: true,
      role_name: 'Patient'
    });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    }) as unknown as typeof fetch;

    renderWithAuthProvider();

    await waitFor(() => {
      expect(mockClearQueryCache).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    });
  });

  it('does not break auth state when clearing the query cache rejects', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockGetAuthSession.mockResolvedValue({ authenticated: false });
    mockClearQueryCache.mockRejectedValue(new Error('IndexedDB unavailable'));

    renderWithAuthProvider();

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Auth: failed to clear query cache on logout',
        expect.any(Error)
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    });

    consoleError.mockRestore();
  });
});
