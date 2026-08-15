/* eslint-disable max-lines */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../authContext';

// ---------------------------------------------------------------------------
// Mock SuperTokens
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------
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

vi.mock('@/utils/role-fhir', () => ({
  roleToFhirResource: vi.fn((role: string) => {
    switch (role) {
      case 'Practitioner': {
        return 'Practitioner';
      }
      case 'Clinic Admin':
      case 'Researcher': {
        return 'Practitioner';
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
import {
  getAuthCookieSession,
  restoreAuthCookie,
  syncActiveRoleWithCookie
} from '@/services/auth';
import { fetchUserProfilesBundle } from '@/services/role-profiles';

// ---------------------------------------------------------------------------
// Type helpers — avoid repeating `as ReturnType<typeof vi.fn>`
// ---------------------------------------------------------------------------
const mockGetAuthSession = getAuthCookieSession as ReturnType<typeof vi.fn>;
const mockRestoreCookie = restoreAuthCookie as ReturnType<typeof vi.fn>;
const mockSyncActiveRole = syncActiveRoleWithCookie as ReturnType<typeof vi.fn>;
const mockFetchBundle = fetchUserProfilesBundle as ReturnType<typeof vi.fn>;
const mockDbGet = dbGet as ReturnType<typeof vi.fn>;
const mockDbSet = dbSet as ReturnType<typeof vi.fn>;
const mockMigrate = migrateLocalStorage as ReturnType<typeof vi.fn>;

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
  mockMigrate.mockResolvedValue(undefined); // eslint-disable-line unicorn/no-useless-undefined
  mockDbGet.mockResolvedValue(null);
  mockAttemptRefreshingSession.mockResolvedValue(true);
});

// =========================================================================
// Fix 1: Stale-cookie deletion short-circuit
// =========================================================================
describe('Fix 1 - stale cookie deletion short-circuit', () => {
  it('does NOT redirect when stale cookie DELETE returns non-OK', async () => {
    // GIVEN: stale auth cookie exists but SuperTokens session is gone
    mockGetAuthSession.mockResolvedValue({
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
    mockGetAuthSession.mockResolvedValue({
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
    mockRestoreCookie.mockResolvedValue(true);
    mockDbGet.mockResolvedValue(null);
  });

  it('dispatches fallback auth when resolveUserRoles throws', async () => {
    // GIVEN: getAuthCookieSession throws on the first call (inside resolveUserRoles)
    // and returns fallback data on the second call (inside fallbackProfileOnError)
    mockGetAuthSession
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
    mockGetAuthSession.mockResolvedValue({
      authenticated: true,
      role_name: 'Patient',
      userId: 'user-1'
    });

    // AND: dbGet throws (simulating IndexedDB failure)
    mockDbGet.mockRejectedValue(new Error('IndexedDB unavailable'));

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
    // fetchUserProfilesBundle was called (skipped the dbGet cache)
    expect(fetchUserProfilesBundle).toHaveBeenCalled();
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
// Task 2: renew the access token before the auth-cookie restore POST
// =========================================================================
describe('Task 2 - refresh before auth-cookie restore', () => {
  beforeEach(() => {
    // GIVEN: an active SuperTokens session with an expired auth cookie
    mockUseSessionContext.mockReturnValue({
      doesSessionExist: true,
      userId: 'user-1',
      accessTokenPayload: {}
    });
    mockGetClaimValue.mockResolvedValue(['Patient']);
    mockGetAuthSession.mockResolvedValue({ authenticated: false });
    mockRestoreCookie.mockResolvedValue(true);
    mockFetchBundle.mockResolvedValue({
      activeProfile: null,
      roleProfiles: { Patient: null }
    });
  });

  it('renews the access token BEFORE restoring the auth cookie', async () => {
    // GIVEN: the refresh is pending until we resolve it
    // Assigned synchronously inside the Promise executor before any await, so it is always set
    let resolveRefresh!: (value: boolean) => void;
    mockAttemptRefreshingSession.mockReturnValue(
      new Promise<boolean>(resolve => {
        resolveRefresh = resolve;
      })
    );

    // WHEN: the auth provider mounts
    renderWithAuthProvider();

    // THEN: the refresh attempt starts, but restore has NOT run yet
    await waitFor(() => {
      expect(mockAttemptRefreshingSession).toHaveBeenCalled();
    });
    expect(mockRestoreCookie).not.toHaveBeenCalled();

    // WHEN: the refresh completes
    resolveRefresh(true);

    // THEN: the restore POST runs after the renewal and the user is logged in
    await waitFor(() => {
      expect(mockRestoreCookie).toHaveBeenCalled();
    });
    expect(screen.getByTestId('auth-authenticated').textContent).toBe('true');
  });

  it('falls through to restore when the refresh attempt throws', async () => {
    // GIVEN: the refresh attempt fails with a network/API error
    mockAttemptRefreshingSession.mockRejectedValue(new Error('refresh failed'));

    // WHEN: the auth provider mounts
    renderWithAuthProvider();

    // THEN: the restore POST is still attempted and loading resolves
    await waitFor(() => {
      expect(mockRestoreCookie).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    });
  });

  it('falls through to restore when the refresh attempt returns false', async () => {
    // GIVEN: the refresh attempt reports no session renewal
    mockAttemptRefreshingSession.mockResolvedValue(false);

    // WHEN: the auth provider mounts
    renderWithAuthProvider();

    // THEN: the restore POST is still attempted and loading resolves
    await waitFor(() => {
      expect(mockRestoreCookie).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    });
  });
});

// =========================================================================
// Task 4: heal a divergent active-role claim on bootstrap
// =========================================================================
describe('Task 4 - sync active role with cookie on bootstrap', () => {
  beforeEach(() => {
    // GIVEN: an active SuperTokens session with a restored auth cookie
    mockUseSessionContext.mockReturnValue({
      doesSessionExist: true,
      userId: 'user-1',
      accessTokenPayload: {}
    });
    mockGetClaimValue.mockResolvedValue(['Patient']);
    mockRestoreCookie.mockResolvedValue(true);
    mockDbGet.mockResolvedValue(null);
    mockSyncActiveRole.mockResolvedValue(true);
    mockFetchBundle.mockResolvedValue({
      activeProfile: null,
      roleProfiles: { Patient: null }
    });
  });

  it('awaits the active-role sync before fetching the profile', async () => {
    // GIVEN: the sync is pending until we resolve it
    let resolveSync!: (value: boolean) => void;
    mockSyncActiveRole.mockReturnValue(
      new Promise<boolean>(resolve => {
        resolveSync = resolve;
      })
    );

    // WHEN: the auth provider mounts
    renderWithAuthProvider();

    // THEN: the sync starts, but the profile fetch has NOT run yet
    await waitFor(() => {
      expect(mockSyncActiveRole).toHaveBeenCalled();
    });
    expect(mockFetchBundle).not.toHaveBeenCalled();

    // WHEN: the sync completes
    resolveSync(true);

    // THEN: the profile fetch runs and loading resolves
    await waitFor(() => {
      expect(mockFetchBundle).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    });
  });

  it('continues bootstrap when the sync reports no drift', async () => {
    mockSyncActiveRole.mockResolvedValue(false);

    renderWithAuthProvider();

    await waitFor(() => {
      expect(mockFetchBundle).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    });
  });

  it('continues bootstrap when the sync throws', async () => {
    mockSyncActiveRole.mockRejectedValue(new Error('sync failure'));

    renderWithAuthProvider();

    await waitFor(() => {
      expect(mockFetchBundle).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    });
  });
});

// =========================================================================
// Fix 4: Clinic admin managingOrganization stored as clinic_organization
// =========================================================================
describe('Fix 4 - clinic admin managingOrganization stored as clinic_organization', () => {
  beforeEach(() => {
    mockUseSessionContext.mockReturnValue({
      doesSessionExist: true,
      userId: 'admin-user-1',
      accessTokenPayload: {}
    });
    mockGetClaimValue.mockResolvedValue(['Clinic Admin']);
    mockGetAuthSession.mockResolvedValue({
      authenticated: true,
      role_name: 'Clinic Admin',
      userId: 'admin-user-1'
    });
    mockRestoreCookie.mockResolvedValue(true);
  });

  const expectNoClinicOrganization = () =>
    expect(
      mockDbSet.mock.calls
        .filter((c: unknown[]) => c[0] === 'ui_preferences')
        .find(
          (c: unknown[]) =>
            (c[1] as Record<string, unknown>)?.prefKey === 'clinic_organization'
        )
    ).toBeUndefined();

  it('stores clinic_organization from the role profile organizationId when the PractitionerRole carries it', async () => {
    mockFetchBundle.mockResolvedValue({
      activeProfile: {
        resourceType: 'Practitioner',
        id: 'prac-123',
        telecom: [{ system: 'email', value: 'admin@clinic.com' }]
      },
      roleProfiles: {
        'Clinic Admin': {
          name: 'Admin User',
          photoUrl: '',
          resource: { resourceType: 'Practitioner', id: 'prac-123' },
          organizationId: 'org-456'
        }
      }
    });
    renderWithAuthProvider();
    await waitFor(() => {
      expect(dbSet).toHaveBeenCalledWith('ui_preferences', {
        ownerId: '',
        prefKey: 'clinic_organization',
        value: 'org-456'
      });
      const stored = mockDbSet.mock.calls
        .filter((c: unknown[]) => c[0] === 'user_profile')
        .find(
          (c: unknown[]) =>
            (c[1] as Record<string, unknown>)?.userId === 'admin-user-1'
        );
      expect(stored).toBeDefined();
      expect((stored?.[1] as Record<string, unknown>)?.organizationId).toBe(
        'org-456'
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-role').textContent).toBe('Clinic Admin');
      expect(screen.getByTestId('auth-authenticated').textContent).toBe('true');
    });
  });

  it('does NOT store clinic_organization when the role profile has no organizationId', async () => {
    mockFetchBundle.mockResolvedValue({
      activeProfile: {
        resourceType: 'Practitioner',
        id: 'prac-123',
        telecom: [{ system: 'email', value: 'admin@clinic.com' }]
      },
      roleProfiles: {
        'Clinic Admin': {
          name: 'Admin User',
          photoUrl: '',
          resource: { resourceType: 'Practitioner', id: 'prac-123' }
        }
      }
    });
    renderWithAuthProvider();
    await waitFor(() =>
      expect(screen.getByTestId('auth-authenticated').textContent).toBe('true')
    );
    expectNoClinicOrganization();
  });

  it('does NOT store clinic_organization for non-admin roles', async () => {
    mockGetClaimValue.mockResolvedValue(['Patient']);
    mockGetAuthSession.mockResolvedValue({
      authenticated: true,
      role_name: 'Patient',
      userId: 'patient-1'
    });
    mockFetchBundle.mockResolvedValue({
      activeProfile: {
        resourceType: 'Patient',
        id: 'patient-123'
      },
      roleProfiles: {}
    });
    renderWithAuthProvider();
    await waitFor(() =>
      expect(screen.getByTestId('auth-authenticated').textContent).toBe('true')
    );
    expectNoClinicOrganization();
  });

  it('stores clinic_organization from cached organizationId when cache is hit', async () => {
    mockDbGet.mockResolvedValue({
      userId: 'admin-user-1',
      role_name: 'Clinic Admin',
      organizationId: 'org-456',
      email: 'admin@clinic.com',
      fullname: 'Admin User',
      profile_complete: true
    });
    mockGetClaimValue.mockResolvedValue(['Clinic Admin']);
    renderWithAuthProvider();
    await waitFor(() =>
      expect(dbSet).toHaveBeenCalledWith('ui_preferences', {
        ownerId: '',
        prefKey: 'clinic_organization',
        value: 'org-456'
      })
    );
    expect(fetchUserProfilesBundle).not.toHaveBeenCalled();
  });

  it('skips cache and fetches fresh when clinic admin cache lacks organizationId', async () => {
    mockDbGet.mockResolvedValue({
      userId: 'admin-user-1',
      role_name: 'Clinic Admin',
      email: 'admin@clinic.com',
      fullname: 'Admin User',
      profile_complete: true
    });
    mockFetchBundle.mockResolvedValue({
      activeProfile: {
        resourceType: 'Practitioner',
        id: 'prac-123'
      },
      roleProfiles: {
        'Clinic Admin': {
          name: 'Admin User',
          photoUrl: '',
          resource: { resourceType: 'Practitioner', id: 'prac-123' },
          organizationId: 'org-789'
        }
      }
    });
    mockGetClaimValue.mockResolvedValue(['Clinic Admin']);
    renderWithAuthProvider();
    await waitFor(() => expect(fetchUserProfilesBundle).toHaveBeenCalled());
    await waitFor(() =>
      expect(dbSet).toHaveBeenCalledWith('ui_preferences', {
        ownerId: '',
        prefKey: 'clinic_organization',
        value: 'org-789'
      })
    );
  });

  it('rejects a stale Person cache for Clinic Admin and refetches from the API', async () => {
    mockDbGet.mockResolvedValue({
      userId: 'admin-user-1',
      role_name: 'Clinic Admin',
      fullname: 'Old Admin',
      email: 'admin@clinic.com',
      fhirId: 'person-123',
      organizationId: 'org-stale',
      profile_complete: true,
      roleProfiles: {
        'Clinic Admin': {
          name: 'Old Admin',
          photoUrl: '',
          resource: { resourceType: 'Person', id: 'person-123' }
        }
      }
    });
    mockFetchBundle.mockResolvedValue({
      activeProfile: {
        resourceType: 'Practitioner',
        id: 'prac-123'
      },
      roleProfiles: {
        'Clinic Admin': {
          name: 'New Admin',
          photoUrl: '',
          resource: { resourceType: 'Practitioner', id: 'prac-123' },
          organizationId: 'org-456'
        }
      }
    });
    mockGetClaimValue.mockResolvedValue(['Clinic Admin']);
    renderWithAuthProvider();
    await waitFor(() => expect(fetchUserProfilesBundle).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByTestId('auth-authenticated').textContent).toBe('true');
    });
  });

  it('uses cached profile for non-admin roles without extra fetch', async () => {
    mockUseSessionContext.mockReturnValue({
      doesSessionExist: true,
      userId: 'patient-1',
      accessTokenPayload: {}
    });
    mockDbGet.mockResolvedValue({
      userId: 'patient-1',
      role_name: 'Patient',
      email: 'patient@test.com',
      fullname: 'Test Patient',
      profile_complete: true
    });
    mockGetClaimValue.mockResolvedValue(['Patient']);
    mockGetAuthSession.mockResolvedValue({
      authenticated: true,
      role_name: 'Patient',
      userId: 'patient-1'
    });
    renderWithAuthProvider();
    await waitFor(() =>
      expect(screen.getByTestId('auth-authenticated').textContent).toBe('true')
    );
    expect(fetchUserProfilesBundle).not.toHaveBeenCalled();
    expectNoClinicOrganization();
  });
});

// =========================================================================
// Task: profile cache carries full resources + refreshProfiles
// =========================================================================
describe('profile cache carries full resources and staleness', () => {
  beforeEach(() => {
    mockUseSessionContext.mockReturnValue({
      doesSessionExist: true,
      userId: 'multi-role-user',
      accessTokenPayload: {}
    });
    mockGetClaimValue.mockResolvedValue(['Patient', 'Practitioner']);
    mockRestoreCookie.mockResolvedValue(true);
    mockGetAuthSession.mockResolvedValue({
      authenticated: true,
      role_name: 'Patient',
      userId: 'multi-role-user'
    });
    mockFetchBundle.mockResolvedValue({
      activeProfile: {
        resourceType: 'Patient',
        id: 'pat-1',
        name: [{ use: 'official', given: ['Test'], family: 'User' }]
      },
      roleProfiles: {
        Patient: {
          name: 'Test User',
          photoUrl: '',
          resource: {
            resourceType: 'Patient',
            id: 'pat-1',
            name: [{ use: 'official', given: ['Test'], family: 'User' }]
          }
        },
        Practitioner: {
          name: 'Test User',
          photoUrl: '',
          resource: { resourceType: 'Practitioner', id: 'prac-1' }
        }
      }
    });
  });

  it('serves a cached multi-role payload whose roleProfiles carry resources', async () => {
    // GIVEN: cache has a full resource per role
    mockDbGet.mockResolvedValue({
      userId: 'multi-role-user',
      role_name: 'Patient',
      roles: ['Patient', 'Practitioner'],
      fullname: 'Test User',
      email: 'test@example.com',
      fhirId: 'pat-1',
      profile_complete: true,
      roleProfiles: {
        Patient: {
          name: 'Test User',
          photoUrl: '',
          resource: { resourceType: 'Patient', id: 'pat-1' }
        },
        Practitioner: {
          name: 'Test User',
          photoUrl: '',
          resource: { resourceType: 'Practitioner', id: 'prac-1' }
        }
      }
    });

    renderWithAuthProvider();

    await waitFor(() =>
      expect(screen.getByTestId('auth-authenticated').textContent).toBe('true')
    );
    expect(fetchUserProfilesBundle).not.toHaveBeenCalled();
  });

  it('rejects a pre-refactor multi-role cache without resources and refetches', async () => {
    // GIVEN: cache still uses the old shape (name/photoUrl only)
    mockDbGet.mockResolvedValue({
      userId: 'multi-role-user',
      role_name: 'Patient',
      roles: ['Patient', 'Practitioner'],
      fullname: 'Test User',
      email: 'test@example.com',
      fhirId: 'pat-1',
      profile_complete: true,
      roleProfiles: {
        Patient: { name: 'Test User', photoUrl: '' },
        Practitioner: { name: 'Test User', photoUrl: '' }
      }
    });

    renderWithAuthProvider();

    await waitFor(() => expect(fetchUserProfilesBundle).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId('auth-authenticated').textContent).toBe('true')
    );
  });

  it('dispatches and persists a fresh cachedAt on login', async () => {
    mockDbGet.mockResolvedValue(null);
    renderWithAuthProvider();

    await waitFor(() =>
      expect(screen.getByTestId('auth-authenticated').textContent).toBe('true')
    );

    const stored = mockDbSet.mock.calls
      .filter((call: unknown[]) => call[0] === 'user_profile')
      .find(
        (call: unknown[]) =>
          (call[1] as Record<string, unknown>)?.userId === 'multi-role-user'
      );
    expect(stored).toBeDefined();
    expect(typeof (stored?.[1] as Record<string, unknown>)?.cachedAt).toBe(
      'number'
    );
  });

  it('refreshProfiles re-fetches, dispatches updated roleProfiles and persists', async () => {
    mockDbGet.mockResolvedValue(null);
    mockFetchBundle
      .mockResolvedValueOnce({
        activeProfile: {
          resourceType: 'Patient',
          id: 'pat-1',
          name: [{ use: 'official', given: ['Old'], family: 'Name' }]
        },
        roleProfiles: {
          Patient: {
            name: 'Old Name',
            photoUrl: '',
            resource: {
              resourceType: 'Patient',
              id: 'pat-1',
              name: [{ use: 'official', given: ['Old'], family: 'Name' }]
            }
          },
          Practitioner: {
            name: 'Old Name',
            photoUrl: '',
            resource: { resourceType: 'Practitioner', id: 'prac-1' }
          }
        }
      })
      .mockResolvedValueOnce({
        activeProfile: {
          resourceType: 'Patient',
          id: 'pat-1',
          name: [{ use: 'official', given: ['New'], family: 'Name' }]
        },
        roleProfiles: {
          Patient: {
            name: 'New Name',
            photoUrl: '',
            resource: {
              resourceType: 'Patient',
              id: 'pat-1',
              name: [{ use: 'official', given: ['New'], family: 'Name' }]
            }
          },
          Practitioner: {
            name: 'New Name',
            photoUrl: '',
            resource: { resourceType: 'Practitioner', id: 'prac-1' }
          }
        }
      });

    function RefreshObserver() {
      const auth = useAuth();
      return (
        <div>
          <div data-testid='refresh-name'>
            {auth.state.userInfo.roleProfiles?.Patient?.name ?? ''}
          </div>
          <button
            type='button'
            onClick={() => {
              void auth.refreshProfiles();
            }}
          >
            refresh
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <RefreshObserver />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(fetchUserProfilesBundle).toHaveBeenCalledTimes(1)
    );
    expect(screen.getByTestId('refresh-name').textContent).toBe('Old Name');

    fireEvent.click(screen.getByText('refresh'));

    await waitFor(() =>
      expect(fetchUserProfilesBundle).toHaveBeenCalledTimes(2)
    );
    await waitFor(() =>
      expect(screen.getByTestId('refresh-name').textContent).toBe('New Name')
    );

    const stored = mockDbSet.mock.calls
      .filter((call: unknown[]) => call[0] === 'user_profile')
      .filter(
        (call: unknown[]) =>
          (call[1] as Record<string, unknown>)?.userId === 'multi-role-user'
      );
    const last = stored.at(-1)?.[1] as Record<string, unknown>;
    expect(typeof last.cachedAt).toBe('number');
    expect(
      (last.roleProfiles as Record<string, unknown>).Patient
    ).toMatchObject({ name: 'New Name' });
  });
});

// =========================================================================
// Fix 5: Empty profile cache is never served (self-healing)
// =========================================================================
describe('Fix 5 - empty profile cache is never served', () => {
  beforeEach(() => {
    mockUseSessionContext.mockReturnValue({
      doesSessionExist: true,
      userId: 'patient-1',
      accessTokenPayload: {}
    });
    mockGetClaimValue.mockResolvedValue(['Patient']);
    mockGetAuthSession.mockResolvedValue({
      authenticated: true,
      role_name: 'Patient',
      userId: 'patient-1'
    });
    mockRestoreCookie.mockResolvedValue(true);
  });

  it('refetches from the API when the cached profile has no identity data', async () => {
    // GIVEN: a poisoned cache from a previously failed fetch (empty identity)
    mockDbGet.mockResolvedValue({
      userId: 'patient-1',
      role_name: 'Patient',
      email: '',
      fullname: '',
      fhirId: '',
      profile_complete: false
    });
    mockFetchBundle.mockResolvedValue({
      activeProfile: {
        resourceType: 'Patient',
        id: 'patient-123',
        name: [{ use: 'official', given: ['Test'], family: 'Patient' }]
      },
      roleProfiles: {}
    });

    renderWithAuthProvider();

    // THEN: the empty cache is rejected and the profile is fetched fresh
    await waitFor(() => expect(fetchUserProfilesBundle).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId('auth-authenticated').textContent).toBe('true')
    );
  });
});

// =========================================================================
// SonarQube S6481: provider value must be memoized
// =========================================================================
describe('Fix 6 - provider value keeps a stable reference', () => {
  const capturedRefs: unknown[] = [];

  function ValueObserver() {
    const auth = useAuth();
    capturedRefs.push(auth);
    return (
      <div data-testid='auth-authenticated'>
        {String(auth.state.isAuthenticated)}
      </div>
    );
  }

  function RenderProbe() {
    const [, setTick] = useState(0);
    return (
      <div>
        <button
          type='button'
          data-testid='rerender'
          onClick={() => setTick(tick => tick + 1)}
        >
          rerender
        </button>
        <AuthProvider>
          <ValueObserver />
        </AuthProvider>
      </div>
    );
  }

  beforeEach(() => {
    capturedRefs.length = 0;
    mockUseSessionContext.mockReturnValue({
      doesSessionExist: true,
      userId: 'user-1',
      accessTokenPayload: {}
    });
    mockGetClaimValue.mockResolvedValue(['Patient']);
    mockRestoreCookie.mockResolvedValue(true);
    mockGetAuthSession.mockResolvedValue({
      authenticated: true,
      role_name: 'Patient',
      userId: 'user-1'
    });
    mockDbGet.mockResolvedValue({
      userId: 'user-1',
      role_name: 'Patient',
      email: 'test@example.com',
      fullname: 'Test User',
      profile_complete: true
    });
  });

  it('reuses the same context object when the provider re-renders with unchanged deps', async () => {
    // WHEN: the provider mounts and the session bootstrap settles
    render(<RenderProbe />);
    await waitFor(() =>
      expect(screen.getByTestId('auth-authenticated').textContent).toBe('true')
    );
    const settledRef = capturedRefs.at(-1);

    // WHEN: the provider's parent re-renders (no context deps changed)
    const rendersBefore = capturedRefs.length;
    fireEvent.click(screen.getByTestId('rerender'));
    await waitFor(() =>
      expect(capturedRefs.length).toBeGreaterThan(rendersBefore)
    );

    // THEN: consumers keep the same context object reference
    expect(capturedRefs.at(-1)).toBe(settledRef);
  });
});
