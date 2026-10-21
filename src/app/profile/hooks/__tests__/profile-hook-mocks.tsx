import { vi } from 'vitest';

/**
 * Shared translation table for the profile hook tests. Keys used by both
 * useProfileSectionSave and useProfilePhotoSave live here so both test files
 * consume one i18n mock factory.
 */
export const profileHookTranslations: Record<string, string> = {
  profile_updated: 'Profile updated',
  profile_update_failed: 'Failed updating profile',
  photo_updated: 'Profile photo updated',
  photo_update_failed: 'Failed updating the profile picture',
  photo_update_missing_account:
    'Failed to update profile photo: profile account is not linked yet'
};

/**
 * Factory for the `@/i18n` mock. Consumed via dynamic import inside
 * `vi.mock('@/i18n', async () => (await import('./profile-hook-mocks')).i18nMockFactory())`
 * because vi.mock factories cannot reference top-level imports.
 *
 * @returns The mocked `@/i18n` module shape.
 */
export function i18nMockFactory() {
  return {
    useTranslations: vi.fn(() => (key: string) => {
      return profileHookTranslations[key] ?? key;
    })
  };
}

/**
 * Factory for the `@/services/profile` mock.
 *
 * @returns The mocked profile service module shape.
 */
export function profileServiceMockFactory() {
  return {
    getProfileById: vi.fn(),
    modifyProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    useUpdateProfile: vi.fn()
  };
}

/**
 * Factory for the `@/services/api/fhir-bundle` mock.
 *
 * @returns The mocked FHIR bundle service module shape.
 */
export function fhirBundleMockFactory() {
  return { submitFhirBundle: vi.fn() };
}

/**
 * Factory for the `@/context/auth/authContext` mock.
 *
 * @returns The mocked auth context module shape.
 */
export function authContextMockFactory() {
  return { useAuth: vi.fn() };
}

/**
 * Factory for the `supertokens-auth-react/recipe/session` mock.
 *
 * @returns The mocked session module shape.
 */
export function sessionMockFactory() {
  return { getClaimValue: vi.fn() };
}

/**
 * Factory for the `supertokens-web-js/recipe/userroles` mock.
 *
 * @returns The mocked userroles module shape.
 */
export function userRolesMockFactory() {
  return { UserRoleClaim: 'user-role' };
}

/**
 * Factory for the `@/lib/indexeddb` mock.
 *
 * @returns The mocked indexeddb module shape.
 */
export function indexeddbMockFactory() {
  return {
    STORES: { userProfile: 'user_profile' },
    dbSet: vi.fn()
  };
}

/**
 * Factory for the `react-toastify` mock.
 *
 * @returns The mocked toast module shape.
 */
export function toastMockFactory() {
  return { toast: { success: vi.fn(), error: vi.fn() } };
}

/**
 * Factory for the `@/utils/profileCompleteness` mock (useProfileSectionSave).
 *
 * @returns The mocked profile completeness module shape.
 */
export function profileCompletenessMockFactory() {
  return { isProfileCompleteFromFHIR: vi.fn(() => true) };
}

/**
 * Factory for the `@/utils/image-processing` mock (useProfilePhotoSave).
 *
 * @returns The mocked image processing module shape.
 */
export function imageProcessingMockFactory() {
  return { processImageForAvatar: vi.fn() };
}
