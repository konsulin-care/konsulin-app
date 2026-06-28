import { render, screen, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../authContext';

// ---------------------------------------------------------------------------
// Mock SuperTokens
// ---------------------------------------------------------------------------
const mockUseSessionContext = vi.fn();
const mockGetClaimValue = vi.fn();

vi.mock('supertokens-auth-react/recipe/session', () => ({
  useSessionContext: () => mockUseSessionContext(), // eslint-disable-line @typescript-eslint/no-unsafe-return
  getClaimValue: () => mockGetClaimValue() // eslint-disable-line @typescript-eslint/no-unsafe-return
}));

vi.mock('supertokens-web-js/recipe/userroles', () => ({
  UserRoleClaim: 'user-role'
}));

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------
vi.mock('@/services/auth', () => ({
  getAuthCookieSession: vi.fn(),
  restoreAuthCookie: vi.fn()
}));

vi.mock('@/services/profile', () => ({
  getProfileByIdentifier: vi.fn()
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

vi.mock('@/utils/role-fhir', () => ({
  roleToFhirResource: vi.fn((role: string) => {
    switch (role) {
      case 'Practitioner': {
        return 'Practitioner';
      }
      case 'Clinic Admin': {
        return 'Person';
      }
      default: {
        return 'Patient';
      }
    }
  })
}));

vi.mock('@/utils/profileCompleteness', () => ({
  isProfileCompleteFromFHIR: vi.fn(() => true)
}));

vi.mock('@/utils/helper', () => ({
  mergeNames: vi.fn(() => 'Test User')
}));

// ---------------------------------------------------------------------------
// Import mocked modules
// ---------------------------------------------------------------------------
import { dbGet, dbSet, migrateLocalStorage } from '@/lib/indexeddb';
import { getAuthCookieSession, restoreAuthCookie } from '@/services/auth';
import { getProfileByIdentifier } from '@/services/profile';

// ---------------------------------------------------------------------------
// Test observer component
// ---------------------------------------------------------------------------
function AuthObserver() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid='auth-loading'>{String(auth.isLoading)}</div>
      <div data-testid='auth-authenticated'>
        {String(auth.state.isAuthenticated)}
      </div>
      <div data-testid='auth-role'>{auth.state.userInfo.role_name ?? ''}</div>
      <div data-testid='auth-userid'>{auth.state.userInfo.userId ?? ''}</div>
    </div>
  );
}

function renderWithAuthProvider() {
  return render(
    <AuthProvider>
      <AuthObserver />
    </AuthProvider>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setupFetchMock(response: {
  ok: boolean;
  status: number;
  body?: object;
}) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: () => Promise.resolve(response.body ?? {})
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  // Default: no SuperTokens session
  mockUseSessionContext.mockReturnValue({
    doesSessionExist: false,
    userId: undefined,
    accessTokenPayload: {}
  });
  mockGetClaimValue.mockResolvedValue(['Patient']);
  (migrateLocalStorage as ReturnType<typeof vi.fn>).mockResolvedValue(
    undefined // eslint-disable-line unicorn/no-useless-undefined
  );
  (dbGet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
});

// =========================================================================
// Fix 1: Stale-cookie deletion short-circuit
// =========================================================================
describe('Fix 1 - stale cookie deletion short-circuit', () => {
  it('does NOT redirect when stale cookie DELETE returns non-OK', async () => {
    // GIVEN: stale auth cookie exists but SuperTokens session is gone
    (getAuthCookieSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      role_name: 'Patient',
      email: 'test@example.com'
    });

    // AND: the DELETE request fails (404)
    globalThis.fetch = setupFetchMock({ ok: false, status: 404 });

    const initialHref = globalThis.location.href;

    // WHEN: the auth provider mounts
    renderWithAuthProvider();

    // THEN: the stale cookie DELETE was attempted
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/auth/cookie', {
        method: 'DELETE'
      });
    });

    // AND: location.href was NOT changed (redirect NOT attempted)
    expect(globalThis.location.href).toBe(initialHref);

    // AND: loading resolved to false (graceful degradation, not stuck)
    await waitFor(() => {
      const loading = screen.getByTestId('auth-loading');
      expect(loading.textContent).toBe('false');
    });
  });

  it('does NOT redirect when stale cookie DELETE request throws', async () => {
    // GIVEN: stale auth cookie exists
    (getAuthCookieSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      role_name: 'Patient',
      email: 'test@example.com'
    });

    // AND: the DELETE request throws (network error)
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const initialHref = globalThis.location.href;

    // WHEN: the auth provider mounts
    renderWithAuthProvider();

    // THEN: fetch was called (and threw)
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/auth/cookie', {
        method: 'DELETE'
      });
    });

    // AND: location.href was NOT changed
    expect(globalThis.location.href).toBe(initialHref);

    // AND: loading resolved
    await waitFor(() => {
      const loading = screen.getByTestId('auth-loading');
      expect(loading.textContent).toBe('false');
    });
  });
});

// =========================================================================
// Fix 2: fetchProfileAndLogin guard against ghost session
// =========================================================================
describe('Fix 2 - fetchProfileAndLogin fallback on early error', () => {
  beforeEach(() => {
    // GIVEN: an active SuperTokens session
    mockUseSessionContext.mockReturnValue({
      doesSessionExist: true,
      userId: 'user-1',
      accessTokenPayload: {}
    });
    mockGetClaimValue.mockResolvedValue(['Patient']);
    (restoreAuthCookie as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (dbGet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('dispatches fallback auth when resolveUserRoles throws', async () => {
    // GIVEN: getAuthCookieSession throws on the first call (inside resolveUserRoles)
    // and returns fallback data on the second call (inside fallbackProfileOnError)
    (getAuthCookieSession as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('IndexedDB read failure'))
      .mockResolvedValueOnce({
        authenticated: true,
        role_name: 'Practitioner',
        email: 'doc@example.com',
        fullname: 'Dr. Test',
        roles: ['Practitioner'],
        profile_picture: '',
        fhirId: 'fhir-123',
        profile_complete: true
      });

    // WHEN: the auth provider mounts
    renderWithAuthProvider();

    // THEN: loading resolves
    await waitFor(() => {
      const loading = screen.getByTestId('auth-loading');
      expect(loading.textContent).toBe('false');
    });

    // AND: fallback auth was dispatched (not ghost session)
    expect(screen.getByTestId('auth-authenticated').textContent).toBe('true');
    expect(screen.getByTestId('auth-role').textContent).toBe('Practitioner');
    expect(screen.getByTestId('auth-userid').textContent).toBe('user-1');
  });

  it('does NOT throw when dbGet fails (caught internally)', async () => {
    // GIVEN: resolveUserRoles succeeds
    (getAuthCookieSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      role_name: 'Patient',
      userId: 'user-1'
    });

    // AND: dbGet throws (simulating IndexedDB failure)
    (dbGet as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('IndexedDB unavailable')
    );

    // WHEN: the auth provider mounts
    renderWithAuthProvider();

    // THEN: no error propagates - auth state resolves
    await waitFor(() => {
      const loading = screen.getByTestId('auth-loading');
      expect(loading.textContent).toBe('false');
    });

    // AND: execution continued past the dbGet failure to API fetch
    // The initial default role (Patient) was used, so a fresh profile
    // was created/dispatched via fetchAndDispatchProfile
    expect(screen.getByTestId('auth-authenticated').textContent).toBe('true');
    // getProfileByIdentifier was called (skipped the dbGet cache)
    expect(getProfileByIdentifier).toHaveBeenCalled();
  });
});

// =========================================================================
// Fix 3: Source ordering - dependencies defined before their caller
// =========================================================================
describe('Fix 3 - function dependency ordering', () => {
  it('fetchProfileAndLogin is declared AFTER its callees (resolveUserRoles, fetchAndDispatchProfile, fallbackProfileOnError)', async () => {
    // GIVEN: the auth source file
    const src = await fs.promises.readFile(
      'src/context/auth/authContext.tsx',
      'utf8'
    );
    const lines = src.split('\n');

    // Find line numbers of each function declaration (1-indexed)
    const findLine = (name: string) =>
      lines.findIndex(l => l.trim().startsWith(`const ${name} =`)) + 1;

    const callerLine = findLine('fetchProfileAndLogin');
    const depLines = [
      ['resolveUserRoles', findLine('resolveUserRoles')],
      ['fetchAndDispatchProfile', findLine('fetchAndDispatchProfile')],
      ['fallbackProfileOnError', findLine('fallbackProfileOnError')]
    ];

    // THEN: all three callees must appear ABOVE the caller
    for (const [, line] of depLines) {
      expect(line).toBeLessThan(callerLine);
    }
  });
});

// =========================================================================
// Fix 4: Clinic admin managingOrganization stored as selected_clinic
// =========================================================================
describe('Fix 4 - clinic admin managingOrganization stored as selected_clinic', () => {
  const adminCookie = {
    authenticated: true,
    role_name: 'Clinic Admin',
    userId: 'admin-user-1'
  };

  beforeEach(() => {
    (getAuthCookieSession as ReturnType<typeof vi.fn>).mockReset();
    (restoreAuthCookie as ReturnType<typeof vi.fn>).mockReset();
    (getProfileByIdentifier as ReturnType<typeof vi.fn>).mockReset();
    mockUseSessionContext.mockReturnValue({
      doesSessionExist: true,
      userId: 'admin-user-1',
      accessTokenPayload: {}
    });
    mockGetClaimValue.mockResolvedValue(['Clinic Admin']);
    (restoreAuthCookie as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (dbGet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(adminCookie)
      });
  });

  const expectNoSelectedClinic = () => {
    const calls = (dbSet as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => c[0] === 'ui_preferences'
    );
    for (const c of calls)
      expect((c[1] as Record<string, unknown>)?.prefKey).not.toBe(
        'selected_clinic'
      );
  };

  it('stores managingOrganization reference as selected_clinic when Person has it', async () => {
    (getProfileByIdentifier as ReturnType<typeof vi.fn>).mockResolvedValue({
      resourceType: 'Person',
      id: 'person-123',
      managingOrganization: { reference: 'Organization/org-456' },
      telecom: [{ system: 'email', value: 'admin@clinic.com' }]
    });
    renderWithAuthProvider();
    await waitFor(() => {
      expect(dbSet).toHaveBeenCalledWith('ui_preferences', {
        ownerId: '',
        prefKey: 'selected_clinic',
        value: 'org-456'
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-role').textContent).toBe('Clinic Admin');
      expect(screen.getByTestId('auth-authenticated').textContent).toBe('true');
    });
  });

  it('does NOT store selected_clinic when Person has no managingOrganization', async () => {
    (getProfileByIdentifier as ReturnType<typeof vi.fn>).mockResolvedValue({
      resourceType: 'Person',
      id: 'person-123',
      telecom: [{ system: 'email', value: 'admin@clinic.com' }]
    });
    renderWithAuthProvider();
    await waitFor(() => {
      expect(screen.getByTestId('auth-authenticated').textContent).toBe('true');
    });
    expectNoSelectedClinic();
  });

  it('does NOT store selected_clinic for non-admin roles', async () => {
    mockGetClaimValue.mockResolvedValue(['Patient']);
    (getAuthCookieSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      role_name: 'Patient',
      userId: 'patient-1'
    });
    (getProfileByIdentifier as ReturnType<typeof vi.fn>).mockResolvedValue({
      resourceType: 'Patient',
      id: 'patient-123'
    });
    renderWithAuthProvider();
    await waitFor(() => {
      expect(screen.getByTestId('auth-authenticated').textContent).toBe('true');
    });
    expectNoSelectedClinic();
  });
});
