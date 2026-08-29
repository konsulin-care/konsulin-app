import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/redirect-intent', () => ({
  clearIntent: vi.fn(),
  clearRedirectIntent: vi.fn(),
  getIntent: vi.fn(),
  getRedirectIntent: vi.fn(),
  hasPendingAssessmentClaimIntent: vi.fn(),
  saveIntent: vi.fn()
}));

vi.mock('supertokens-auth-react/recipe/session', () => ({
  useSessionContext: vi.fn(),
  getClaimValue: vi.fn()
}));

vi.mock('supertokens-web-js/recipe/userroles', () => ({
  UserRoleClaim: 'user-role'
}));

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
  STORES: {}
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

import { hasPendingAssessmentClaimIntent } from '@/utils/redirect-intent';
import { resolveActiveRole } from '../authContext';

describe('resolveActiveRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves Patient when a pending claim intent exists and roles include Patient', () => {
    vi.mocked(hasPendingAssessmentClaimIntent).mockReturnValue(true);

    expect(resolveActiveRole(undefined, ['Patient', 'Practitioner'])).toBe(
      'Patient'
    );
  });

  it('keeps the cookie role when provided', () => {
    vi.mocked(hasPendingAssessmentClaimIntent).mockReturnValue(true);

    expect(resolveActiveRole('Practitioner', ['Patient', 'Practitioner'])).toBe(
      'Practitioner'
    );
  });

  it('keeps the Practitioner default when no pending claim intent', () => {
    vi.mocked(hasPendingAssessmentClaimIntent).mockReturnValue(false);

    expect(resolveActiveRole(undefined, ['Patient', 'Practitioner'])).toBe(
      'Practitioner'
    );
  });

  it('resolves Patient for patient-only roles', () => {
    vi.mocked(hasPendingAssessmentClaimIntent).mockReturnValue(false);

    expect(resolveActiveRole(undefined, ['Patient'])).toBe('Patient');
  });
});
