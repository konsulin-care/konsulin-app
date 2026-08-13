import { renderHook } from '@testing-library/react';
import type { Patient, Person, Practitioner } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '@/context/auth/authContext';
import type { IStateUserInfo } from '@/context/auth/authTypes';
import type { ProfileResource } from '@/services/role-profiles';
import { useProfileData } from '../useProfileData';

const patientFixture: Patient = {
  resourceType: 'Patient',
  id: 'pat-1',
  active: true,
  name: [{ use: 'official', given: ['John', 'Magnificent'], family: 'Doe' }],
  gender: 'male',
  birthDate: '1990-03-12',
  telecom: [
    { system: 'email', value: 'john@konsulin.care' },
    { system: 'phone', value: '+628123456789' }
  ],
  address: [
    {
      use: 'home',
      line: ['Jl. Merdeka 12'],
      district: 'Kebayoran Baru',
      city: 'Jakarta Selatan',
      state: 'DKI Jakarta',
      postalCode: '12120',
      country: 'ID'
    }
  ],
  communication: [
    {
      language: {
        coding: [
          { system: 'urn:ietf:bcp:47', code: 'id', display: 'Indonesian' }
        ]
      }
    }
  ],
  photo: [{ url: 'https://cdn.example.com/photo.jpg' }]
};

const practitionerFixture: Practitioner = {
  resourceType: 'Practitioner',
  id: 'pra-1',
  active: true,
  name: [{ use: 'official', given: ['Jane'], family: 'Smith' }],
  gender: 'female',
  birthDate: '1985-07-01',
  telecom: [{ system: 'email', value: 'jane@konsulin.care' }],
  communication: [{ coding: [{ code: 'en', display: 'English' }] }]
};

const personFixture: Person = {
  resourceType: 'Person',
  id: 'clinic-1',
  active: true,
  name: [{ use: 'official', given: ['Alex'], family: 'Brown' }],
  gender: 'other',
  birthDate: '1978-11-20',
  telecom: [{ system: 'phone', value: '+62811112222333' }]
};

describe('useProfileData', () => {
  const mockUseAuth = vi.mocked(useAuth);
  const mockRefresh = vi.fn();

  type LooseRoleProfile = {
    name?: string;
    photoUrl?: string;
    resource?: ProfileResource;
  } | null;

  type LooseUserInfo = {
    role_name?: string;
    roles?: string[];
    roleProfiles?: Record<string, LooseRoleProfile>;
    cachedAt?: number;
    fullProfile?: ProfileResource;
  };

  function setupAuth(userInfo: LooseUserInfo) {
    mockRefresh.mockClear();
    mockUseAuth.mockReturnValue({
      isLoading: false,
      dispatch: vi.fn(),
      refreshProfiles: mockRefresh,
      state: {
        isAuthenticated: true,
        userInfo: {
          userId: 'u1',
          role_name: 'Patient',
          roles: ['Patient', 'Practitioner'],
          roleProfiles: {},
          cachedAt: Date.now(),
          ...userInfo
        } as IStateUserInfo
      }
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads the active profile from the cached roleProfiles (no fetch, no query)', () => {
    setupAuth({
      roleProfiles: {
        Patient: { name: 'John Doe', photoUrl: '', resource: patientFixture },
        Practitioner: {
          name: 'Jane Smith',
          photoUrl: '',
          resource: practitionerFixture
        }
      }
    });

    const { result } = renderHook(() =>
      useProfileData('u1', ['Patient', 'Practitioner'], 'Patient')
    );

    expect(result.current.resourceType).toBe('Patient');
    expect(result.current.profileData).toEqual(patientFixture);
  });

  it('collapses the FHIR name into identity display parts', () => {
    setupAuth({
      roleProfiles: {
        Patient: { name: 'John Doe', photoUrl: '', resource: patientFixture }
      }
    });

    const { result } = renderHook(() =>
      useProfileData('u1', ['Patient'], 'Patient')
    );

    expect(result.current.identity.displayName).toBe('John Magnificent Doe');
    expect(result.current.identity.given).toEqual(['John', 'Magnificent']);
    expect(result.current.identity.family).toBe('Doe');
    expect(result.current.identity.photoUrl).toBe(
      'https://cdn.example.com/photo.jpg'
    );
  });

  it('builds personal-info, contact and address sections for Patient', () => {
    setupAuth({
      roleProfiles: {
        Patient: { name: 'John Doe', photoUrl: '', resource: patientFixture }
      }
    });

    const { result } = renderHook(() =>
      useProfileData('u1', ['Patient'], 'Patient')
    );

    const ids = result.current.sections.map(s => s.id);
    expect(ids).toEqual(['personal-info', 'contact', 'address']);

    const personalInfo = result.current.sections[0];
    const rowKeys = personalInfo.rows.map(r => r.id);
    expect(rowKeys).toContain('gender');
    expect(rowKeys).toContain('birthDate');
    expect(rowKeys).toContain('language');
    expect(personalInfo.rows.find(r => r.id === 'language')?.value).toBe(
      'Indonesian'
    );
  });

  it('includes the language row for Practitioner and omits it for Person', () => {
    setupAuth({
      role_name: 'Practitioner',
      roleProfiles: {
        Practitioner: {
          name: 'Jane Smith',
          photoUrl: '',
          resource: practitionerFixture
        }
      }
    });

    const { result: practitionerResult } = renderHook(() =>
      useProfileData('u1', ['Practitioner'], 'Practitioner')
    );
    expect(
      practitionerResult.current.sections[0].rows.find(r => r.id === 'language')
        ?.value
    ).toBe('English');

    setupAuth({
      role_name: 'Clinic Admin',
      roleProfiles: {
        'Clinic Admin': {
          name: 'Alex Brown',
          photoUrl: '',
          resource: personFixture
        }
      }
    });

    const { result: personResult } = renderHook(() =>
      useProfileData('u1', ['Clinic Admin'], 'Clinic Admin')
    );
    expect(personResult.current.resourceType).toBe('Person');
    expect(personResult.current.sections[0].rows.map(r => r.id)).not.toContain(
      'language'
    );
  });

  it('exposes every role profile for the extension cards', () => {
    setupAuth({
      roleProfiles: {
        Patient: { name: 'John Doe', photoUrl: '', resource: patientFixture },
        Practitioner: {
          name: 'Jane Smith',
          photoUrl: '',
          resource: practitionerFixture
        }
      }
    });

    const { result } = renderHook(() =>
      useProfileData('u1', ['Patient', 'Practitioner'], 'Patient')
    );

    expect(result.current.roleProfiles?.Patient?.resource).toEqual(
      patientFixture
    );
    expect(result.current.roleProfiles?.Practitioner?.resource).toEqual(
      practitionerFixture
    );
  });

  it('falls back to fullProfile when the active role has no cached entry', () => {
    setupAuth({
      roleProfiles: {},
      fullProfile: patientFixture
    });

    const { result } = renderHook(() =>
      useProfileData('u1', ['Patient'], 'Patient')
    );

    expect(result.current.profileData).toEqual(patientFixture);
  });

  it('triggers refreshProfiles when the cache is stale', () => {
    setupAuth({
      cachedAt: Date.now() - 6 * 60 * 1000,
      roleProfiles: {
        Patient: { name: 'John Doe', photoUrl: '', resource: patientFixture }
      }
    });

    renderHook(() => useProfileData('u1', ['Patient'], 'Patient'));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('triggers refreshProfiles when cached resources are missing', () => {
    setupAuth({
      roleProfiles: {
        Patient: { name: 'John Doe', photoUrl: '' }
      }
    });

    renderHook(() => useProfileData('u1', ['Patient'], 'Patient'));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not trigger refreshProfiles for a fresh cache', () => {
    setupAuth({
      roleProfiles: {
        Patient: { name: 'John Doe', photoUrl: '', resource: patientFixture }
      }
    });

    renderHook(() => useProfileData('u1', ['Patient'], 'Patient'));

    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
