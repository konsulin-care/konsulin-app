import { describe, expect, it } from 'vitest';

import { buildOtherRoleAvatars } from '@/components/role-avatar-popup-utils';
import type { RoleProfile } from '@/services/role-profiles';

describe('buildOtherRoleAvatars', () => {
  it('maps fetched profiles to avatars with photo and name-based initials', () => {
    const profiles: Record<string, RoleProfile | null> = {
      Practitioner: {
        name: 'Jane Doe',
        photoUrl: 'https://cdn.example.com/jane.jpg'
      },
      Patient: { name: 'John Doe', photoUrl: '' }
    };

    const avatars = buildOtherRoleAvatars(
      ['Patient', 'Practitioner'],
      'Patient',
      profiles
    );

    expect(avatars).toHaveLength(1);
    expect(avatars[0]).toMatchObject({
      role: 'Practitioner',
      photoUrl: 'https://cdn.example.com/jane.jpg',
      initials: 'JD'
    });
  });

  it('falls back to the role placeholder when the profile is missing', () => {
    const avatars = buildOtherRoleAvatars(
      ['Patient', 'Practitioner'],
      'Patient',
      { Practitioner: null, Patient: null }
    );

    expect(avatars).toHaveLength(1);
    expect(avatars[0]).toMatchObject({
      role: 'Practitioner',
      photoUrl: ''
    });
  });

  it('falls back to the role placeholder before profiles load', () => {
    let profiles: Record<string, RoleProfile | null> | undefined;
    const avatars = buildOtherRoleAvatars(
      ['Patient', 'Practitioner'],
      'Patient',
      profiles
    );

    expect(avatars).toHaveLength(1);
    expect(avatars[0]).toMatchObject({ role: 'Practitioner', photoUrl: '' });
  });

  it('excludes the current role from the list', () => {
    const profiles: Record<string, RoleProfile | null> = {
      Practitioner: {
        name: 'Jane Doe',
        photoUrl: 'https://cdn.example.com/jane.jpg'
      },
      Patient: {
        name: 'John Doe',
        photoUrl: 'https://cdn.example.com/john.jpg'
      }
    };

    const avatars = buildOtherRoleAvatars(
      ['Patient', 'Practitioner'],
      'Practitioner',
      profiles
    );

    expect(avatars.map(a => a.role)).toEqual(['Patient']);
    expect(avatars[0]?.photoUrl).toBe('https://cdn.example.com/john.jpg');
  });
});
