import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/redirect-intent', () => ({
  clearRedirectIntent: vi.fn(),
  getIntent: vi.fn(),
  getRedirectIntent: vi.fn(),
  hasPendingAssessmentClaimIntent: vi.fn()
}));

vi.mock('@/services/profile', () => ({
  getProfileByIdentifier: vi.fn()
}));

vi.mock('supertokens-auth-react/recipe/session', () => ({
  getClaimValue: vi.fn()
}));

vi.mock('supertokens-web-js/recipe/userroles', () => ({
  UserRoleClaim: 'user-role'
}));

import { hasPendingAssessmentClaimIntent } from '@/utils/redirect-intent';
import { resolveRole } from '../auth';

describe('resolveRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves Patient when a pending assessmentResult intent exists and roles include Patient', () => {
    vi.mocked(hasPendingAssessmentClaimIntent).mockReturnValue(true);

    expect(resolveRole(['Patient', 'Practitioner'])).toBe('Patient');
  });

  it('keeps the Practitioner default when no pending claim intent', () => {
    vi.mocked(hasPendingAssessmentClaimIntent).mockReturnValue(false);

    expect(resolveRole(['Patient', 'Practitioner'])).toBe('Practitioner');
  });

  it('keeps the Practitioner default when the user holds no Patient role', () => {
    vi.mocked(hasPendingAssessmentClaimIntent).mockReturnValue(true);

    expect(resolveRole(['Practitioner'])).toBe('Practitioner');
  });

  it('resolves Patient for single-role patients', () => {
    vi.mocked(hasPendingAssessmentClaimIntent).mockReturnValue(false);

    expect(resolveRole(['Patient'])).toBe('Patient');
  });
});
