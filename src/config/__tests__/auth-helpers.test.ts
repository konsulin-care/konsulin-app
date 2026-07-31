import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/redirect-intent', () => ({
  getRedirectIntent: vi.fn(),
  getIntent: vi.fn(),
  clearRedirectIntent: vi.fn(),
  hasPendingAssessmentClaimIntent: vi.fn()
}));

vi.mock('@/utils/redirect-guard', () => ({
  extractSafeRedirectPath: vi.fn((search: string) => search)
}));

vi.mock('@/services/profile', () => ({
  createProfile: vi.fn(),
  getProfileByIdentifier: vi.fn()
}));

vi.mock('@/utils/role-fhir', () => ({
  roleToFhirResource: vi.fn()
}));

vi.mock('@/utils/helper', () => ({
  mergeNames: vi.fn()
}));

import {
  clearRedirectIntent,
  getIntent,
  getRedirectIntent
} from '@/utils/redirect-intent';
import { resolvePostLoginRedirect } from '../auth-helpers';

describe('resolvePostLoginRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRedirectIntent).mockReturnValue(null);
  });

  it('redirects to the homepage when a pending assessmentResult claim intent exists', () => {
    vi.mocked(getIntent).mockReturnValue({
      kind: 'assessmentResult',
      payload: { path: '/record', qrId: 'qr-123' },
      createdAt: Date.now()
    });

    expect(resolvePostLoginRedirect()).toBe('/');
    expect(clearRedirectIntent).toHaveBeenCalled();
  });

  it('keeps the payload path for journal intents', () => {
    vi.mocked(getIntent).mockReturnValue({
      kind: 'journal',
      payload: { path: '/journal' },
      createdAt: Date.now()
    });

    expect(resolvePostLoginRedirect()).toBe('/journal');
    expect(clearRedirectIntent).toHaveBeenCalled();
  });
});
