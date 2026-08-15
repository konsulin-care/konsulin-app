/* eslint-disable @typescript-eslint/no-unsafe-return,
    @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unused-vars */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../authContext';

// ---------------------------------------------------------------------------
// Mock SuperTokens
// ---------------------------------------------------------------------------
const mockUseSessionContext = vi.fn();
const mockGetClaimValue = vi.fn();

vi.mock('supertokens-auth-react/recipe/session', () => ({
  useSessionContext: () => mockUseSessionContext(),
  getClaimValue: () => mockGetClaimValue()
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

// fhirIdMap.ts imports from @/lib/indexeddb, so these mocks cover it
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
// Imports (mocked modules resolve to vi.fn() stubs)
// ---------------------------------------------------------------------------
import { dbGet, dbSet } from '@/lib/indexeddb';
import { getAuthCookieSession, restoreAuthCookie } from '@/services/auth';
import { fetchUserProfilesBundle } from '@/services/role-profiles';

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------
const mockGetAuthSession = getAuthCookieSession as ReturnType<typeof vi.fn>;
const mockRestoreCookie = restoreAuthCookie as ReturnType<typeof vi.fn>;
const mockFetchBundle = fetchUserProfilesBundle as ReturnType<typeof vi.fn>;
const mockDbGet = dbGet as ReturnType<typeof vi.fn>;
const mockDbSet = dbSet as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Observer component with fhirId
// ---------------------------------------------------------------------------
function AuthObserverWithFhirId() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid='auth-loading'>{String(auth.isLoading)}</div>
      <div data-testid='auth-authenticated'>
        {String(auth.state.isAuthenticated)}
      </div>
      <div data-testid='auth-role'>{auth.state.userInfo.role_name ?? ''}</div>
      <div data-testid='auth-userid'>{auth.state.userInfo.userId ?? ''}</div>
      <div data-testid='auth-fhirid'>{auth.state.userInfo.fhirId ?? ''}</div>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <AuthObserverWithFhirId />
    </AuthProvider>
  );
}

// ---------------------------------------------------------------------------
// Helper: find uiPreferences dbSet calls for the fhirId map
// ---------------------------------------------------------------------------
function findFhirIdMapDbSetCall(): Record<string, string> | null {
  for (const args of mockDbSet.mock.calls) {
    const [store, value] = args as [string, Record<string, unknown>];
    if (
      store === 'ui_preferences' &&
      typeof value.prefKey === 'string' &&
      (value.prefKey as string).startsWith('fhirId_map_')
    ) {
      return (value.value ?? {}) as Record<string, string>;
    }
  }
  return null;
}

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

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mockUseSessionContext.mockReturnValue({
    doesSessionExist: false,
    userId: undefined,
    accessTokenPayload: {}
  });
  mockGetClaimValue.mockResolvedValue(['Patient']);
  mockDbGet.mockResolvedValue(null);
});

// =========================================================================
// Test: fetchAndDispatchProfile stores fhirId per role
// =========================================================================
describe('fhirId per-role storage', () => {
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
      userId: 'multi-role-user',
      fhirId: 'stale-practitioner-id',
      email: 'test@example.com',
      fullname: 'Test User',
      profile_picture: '',
      roles: ['Patient', 'Practitioner'],
      profile_complete: false
    });
  });

  it('stores fhirId for the current role after a successful profile fetch', async () => {
    // GIVEN: no cached profile (cache miss)
    mockDbGet.mockResolvedValue(null);

    // AND: API returns a Patient profile
    mockFetchBundle.mockResolvedValue({
      activeProfile: {
        resourceType: 'Patient',
        id: 'correct-patient-id',
        name: [{ use: 'official', given: ['Test'], family: 'User' }]
      },
      roleProfiles: {}
    });

    globalThis.fetch = setupFetchMock({ ok: true, status: 200 });

    // WHEN: auth provider mounts
    renderWithProvider();

    // THEN: auth state has the correct fhirId
    await waitFor(() => {
      expect(screen.getByTestId('auth-fhirid').textContent).toBe(
        'correct-patient-id'
      );
    });

    // AND: fhirId is stored per-role in uiPreferences
    const map = findFhirIdMapDbSetCall();
    expect(map).not.toBeNull();
    expect(map?.Patient).toBe('correct-patient-id');
  });

  it('stores fhirId as empty when no profile is found for the role', async () => {
    // GIVEN: no cached profile, API returns null
    mockDbGet.mockResolvedValue(null);
    mockFetchBundle.mockResolvedValue({
      activeProfile: null,
      roleProfiles: { Patient: null }
    });

    globalThis.fetch = setupFetchMock({ ok: true, status: 200 });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('auth-fhirid').textContent).toBe('');
    });

    const map = findFhirIdMapDbSetCall();
    expect(map).not.toBeNull();
    expect(map?.Patient).toBe('');

    // AND: the empty profile is never persisted to the userProfile cache
    const userProfileWrites = mockDbSet.mock.calls.filter(
      (call: unknown[]) => call[0] === 'user_profile'
    );
    expect(userProfileWrites).toHaveLength(0);
  });
});

// =========================================================================
// Test: Fallback uses stored fhirId per-role mapping
// =========================================================================
describe('fallback uses stored fhirId per-role mapping', () => {
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
      userId: 'multi-role-user',
      fhirId: 'stale-practitioner-id',
      email: 'test@example.com',
      fullname: 'Test User',
      profile_picture: '',
      roles: ['Patient', 'Practitioner'],
      profile_complete: false
    });
  });

  it('uses stored Patient fhirId from map when API fetch fails', async () => {
    // GIVEN: no cached profile (cache miss)
    mockDbGet.mockResolvedValue(null);
    // AND: API fetch fails

    // Make dbGet return a stored fhirId map when queried for uiPreferences
    // The real fhirIdMap.getFhirIdForRole calls dbGet(['', 'fhirId_map_...'])
    // We need the SECOND dbGet call to return the map (first is userProfile cache check)
    mockDbGet.mockImplementation((storeOrKey: unknown, key?: unknown) => {
      // userProfile cache check: storeName='user_profile', key='multi-role-user'
      if (storeOrKey === 'user_profile') return null;
      // uiPreferences lookup for fhirId map
      if (storeOrKey === 'ui_preferences') {
        return {
          value: { Patient: 'correct-patient-id' }
        };
      }
      return null;
    });

    mockFetchBundle.mockRejectedValue(new Error('API unavailable'));

    globalThis.fetch = setupFetchMock({ ok: true, status: 200 });

    // WHEN: auth provider mounts
    renderWithProvider();

    // THEN: fallback dispatches auth with stored Patient fhirId, not stale cookie
    await waitFor(() => {
      const fhirId = screen.getByTestId('auth-fhirid');
      expect(fhirId.textContent).toBe('correct-patient-id');
    });

    expect(screen.getByTestId('auth-role').textContent).toBe('Patient');
  });

  it('falls back to auth cookie fhirId when no stored map entry exists', async () => {
    // GIVEN: no cached profile
    mockDbGet.mockResolvedValue(null);

    // AND: stored map exists but doesn't have Patient entry
    mockDbGet.mockImplementation((storeOrKey: unknown, key?: unknown) => {
      if (storeOrKey === 'user_profile') return null;
      if (storeOrKey === 'ui_preferences') {
        return {
          value: { Practitioner: 'practitioner-id' }
        };
      }
      return null;
    });

    // AND: API fetch fails
    mockFetchBundle.mockRejectedValue(new Error('API unavailable'));

    globalThis.fetch = setupFetchMock({ ok: true, status: 200 });

    renderWithProvider();

    // THEN: falls back to auth cookie fhirId
    await waitFor(() => {
      const fhirId = screen.getByTestId('auth-fhirid');
      expect(fhirId.textContent).toBe('stale-practitioner-id');
    });

    expect(screen.getByTestId('auth-role').textContent).toBe('Patient');
  });
});
