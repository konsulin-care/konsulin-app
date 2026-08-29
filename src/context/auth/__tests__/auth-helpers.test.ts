import { hasPendingAssessmentClaimIntent } from '@/utils/redirect-intent';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/redirect-intent', () => ({
  hasPendingAssessmentClaimIntent: vi.fn().mockReturnValue(false)
}));

import {
  extractPhotoUrl,
  isCacheUsable,
  resolveActiveRole,
  roleProfilesCarryResources
} from '../auth-helpers';

describe('extractPhotoUrl', () => {
  it('extracts photo URL from profile', () => {
    const profile = { photo: [{ url: 'https://example.com/photo.jpg' }] };
    expect(extractPhotoUrl(profile as never)).toBe(
      'https://example.com/photo.jpg'
    );
  });

  it('returns empty string for null profile', () => {
    expect(extractPhotoUrl(null)).toBe('');
  });
});

describe('roleProfilesCarryResources', () => {
  it('returns true when all non-null profiles have resource', () => {
    const profiles = {
      Patient: {
        resource: { resourceType: 'Patient' as const, id: 'p-1' },
        name: 'Test',
        photoUrl: ''
      },
      Practitioner: null
    };
    expect(roleProfilesCarryResources(profiles as never)).toBe(true);
  });

  it('returns false when a profile is missing resource', () => {
    const profiles = {
      Patient: { name: 'Test', photoUrl: '' },
      Practitioner: null
    };
    expect(roleProfilesCarryResources(profiles as never)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(roleProfilesCarryResources(undefined)).toBe(false);
  });
});

describe('isCacheUsable', () => {
  it('returns false for null cache', () => {
    expect(isCacheUsable(null, ['Patient'])).toBe(false);
  });

  it('returns false for cache without identity data', () => {
    expect(
      isCacheUsable({ fullname: '', fhirId: '' } as never, ['Patient'])
    ).toBe(false);
  });

  it('returns true for single-role user with valid cache', () => {
    const cached = {
      fullname: 'John',
      fhirId: 'p-1',
      roleProfiles: { Patient: null }
    } as never;
    expect(isCacheUsable(cached, ['Patient'])).toBe(true);
  });
});

describe('resolveActiveRole', () => {
  it('returns cookie role when present', () => {
    expect(resolveActiveRole('Practitioner', ['Patient'])).toBe('Practitioner');
  });

  it('returns Patient for guest with assessment claim', () => {
    vi.mocked(hasPendingAssessmentClaimIntent).mockReturnValue(true);
    expect(resolveActiveRole(undefined, ['Patient'])).toBe('Patient');
    vi.mocked(hasPendingAssessmentClaimIntent).mockReturnValue(false);
  });

  it('returns Practitioner when in roles', () => {
    expect(resolveActiveRole(undefined, ['Practitioner', 'Patient'])).toBe(
      'Practitioner'
    );
  });

  it('returns Patient as fallback', () => {
    expect(resolveActiveRole(undefined, undefined)).toBe('Patient');
  });
});
