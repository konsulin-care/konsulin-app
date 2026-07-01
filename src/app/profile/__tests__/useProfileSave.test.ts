/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useProfileSave } from '@/app/profile/hooks/useProfileSave';

import type { ICustomProfile } from '@/app/profile/edit-profile';
import type { Patient } from 'fhir/r4';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('@/services/profile', () => ({
  getProfileById: vi.fn(),
  modifyProfile: vi.fn()
}));

vi.mock('@/utils/helper', () => ({
  findIdentifierValue: vi.fn(),
  mergeNames: vi.fn()
}));

vi.mock('@/utils/profileCompleteness', () => ({
  isProfileCompleteFromFHIR: vi.fn()
}));

vi.mock('@/utils/validation', () => ({
  validateEmail: vi.fn()
}));

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn() }
}));

vi.mock('@/lib/indexeddb', () => ({
  dbSet: vi.fn(),
  STORES: { userProfile: 'user_profile' }
}));

vi.mock('supertokens-auth-react/recipe/session', () => ({
  getClaimValue: vi.fn()
}));

vi.mock('supertokens-web-js/recipe/userroles', () => ({
  UserRoleClaim: {}
}));

// ---------------------------------------------------------------------------
// Import mocked modules
// ---------------------------------------------------------------------------

import { dbSet, STORES } from '@/lib/indexeddb';
import { getProfileById, modifyProfile } from '@/services/profile';
import { findIdentifierValue, mergeNames } from '@/utils/helper';
import { isProfileCompleteFromFHIR } from '@/utils/profileCompleteness';
import { getClaimValue } from 'supertokens-auth-react/recipe/session';

const BASE_PROFILE: ICustomProfile = {
  fhirId: '',
  resourceType: null,
  active: false,
  birthDate: '',
  gender: 'unknown',
  photo: '',
  userId: '',
  firstName: '',
  lastName: '',
  addresses: [],
  cityCode: '',
  city: '',
  district: '',
  districtCode: '',
  provinceCode: '',
  province: '',
  postalCode: '',
  phone: '',
  email: ''
};

describe('useProfileSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful mock responses
    vi.mocked(getProfileById).mockResolvedValue({
      id: 'patient-1',
      resourceType: 'Patient',
      name: [{ use: 'official', given: ['Old'], family: 'Name' }],
      identifier: [
        { system: 'https://login.konsulin.care/userid', value: 'user-1' },
        { system: 'https://login.konsulin.care/chatwoot-id', value: 'cw-123' }
      ],
      photo: [{ url: 'https://example.com/old-photo.jpg' }]
    } as unknown as Patient);

    vi.mocked(modifyProfile).mockResolvedValue({ chatwootId: 'cw-123' });
    vi.mocked(findIdentifierValue).mockReturnValue('cw-123');
    vi.mocked(mergeNames).mockReturnValue('John Doe');
    vi.mocked(isProfileCompleteFromFHIR).mockReturnValue(true);
    vi.mocked(getClaimValue).mockResolvedValue(['Patient']);

    // Mock fetch for CSRF token endpoint + auth cookie POST endpoint
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ token: 'csrf-123' }, { status: 200 })
        )
        .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('IndexedDB cache sync', () => {
    it('writes updated profile to IndexedDB after successful save', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue({
        id: 'patient-1',
        resourceType: 'Patient',
        name: [{ use: 'official', given: ['John'], family: 'Doe' }],
        telecom: [{ system: 'phone', value: '+628123456789' }],
        birthDate: '1990-01-01'
      } as Patient);

      const dispatchAuth = vi.fn();

      const { result } = renderHook(() =>
        useProfileSave({
          updateUser: {
            ...BASE_PROFILE,
            firstName: 'John',
            lastName: 'Doe',
            fhirId: 'patient-1',
            userId: 'user-1',
            phone: '+628123456789',
            birthDate: '1990-01-01',
            email: 'john@example.com'
          },
          fhirId: 'patient-1',
          fhirRole: 'Patient',
          authState: {
            userInfo: {
              userId: 'user-1',
              role_name: 'Patient',
              email: 'john@example.com',
              fullname: 'Old Name',
              fhirId: 'patient-1'
            }
          },
          resolvePhotoUrl: vi.fn().mockResolvedValue(''),
          isValidUrl: vi.fn().mockReturnValue(true),
          updateProfile: mockUpdateProfile,
          clearDraft: vi.fn(),
          dispatchAuth,
          queryClient: { invalidateQueries: vi.fn() },
          setDrawerState: vi.fn()
        })
      );

      await act(async () => {
        await result.current.handleEditSave();
      });

      // The IndexedDB cache should be updated with the saved profile
      expect(dbSet).toHaveBeenCalledWith(
        STORES.userProfile,
        expect.objectContaining({
          userId: 'user-1',
          fullname: 'John Doe',
          profile_complete: true,
          fhirId: 'patient-1',
          role_name: 'Patient',
          roles: ['Patient']
        })
      );

      // The data written to IndexedDB should match what was dispatched to auth
      expect(dispatchAuth).toHaveBeenCalledWith({
        type: 'auth-check',
        payload: expect.objectContaining({
          userId: 'user-1',
          fullname: 'John Doe',
          profile_complete: true,
          fhirId: 'patient-1',
          role_name: 'Patient',
          roles: ['Patient']
        })
      });
    });

    it('does not update IndexedDB when auth cookie POST fails', async () => {
      // Override fetch to fail on the cookie POST
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(
            Response.json(
              { token: 'csrf-123' },
              {
                status: 200
              }
            )
          )
          .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      );

      const mockUpdateProfile = vi.fn().mockResolvedValue({
        id: 'patient-1',
        resourceType: 'Patient',
        name: [{ use: 'official', given: ['John'], family: 'Doe' }]
      } as Patient);

      const { result } = renderHook(() =>
        useProfileSave({
          updateUser: {
            ...BASE_PROFILE,
            firstName: 'John',
            lastName: 'Doe',
            fhirId: 'patient-1',
            userId: 'user-1',
            phone: '+628123456789'
          },
          fhirId: 'patient-1',
          fhirRole: 'Patient',
          authState: {
            userInfo: {
              userId: 'user-1',
              role_name: 'Patient',
              fhirId: 'patient-1'
            }
          },
          resolvePhotoUrl: vi.fn().mockResolvedValue(''),
          isValidUrl: vi.fn().mockReturnValue(true),
          updateProfile: mockUpdateProfile,
          clearDraft: vi.fn(),
          dispatchAuth: vi.fn(),
          queryClient: { invalidateQueries: vi.fn() },
          setDrawerState: vi.fn()
        })
      );

      await act(async () => {
        await result.current.handleEditSave();
      });

      // dbSet should NOT be called when the cookie POST fails
      expect(dbSet).not.toHaveBeenCalled();
    });

    it('does not update IndexedDB when PUT to FHIR fails', async () => {
      const mockUpdateProfile = vi
        .fn()
        .mockRejectedValue(new Error('FHIR server error'));

      const { result } = renderHook(() =>
        useProfileSave({
          updateUser: {
            ...BASE_PROFILE,
            firstName: 'John',
            lastName: 'Doe',
            fhirId: 'patient-1',
            userId: 'user-1',
            phone: '+628123456789'
          },
          fhirId: 'patient-1',
          fhirRole: 'Patient',
          authState: {
            userInfo: {
              userId: 'user-1',
              role_name: 'Patient',
              fhirId: 'patient-1'
            }
          },
          resolvePhotoUrl: vi.fn().mockResolvedValue(''),
          isValidUrl: vi.fn().mockReturnValue(true),
          updateProfile: mockUpdateProfile,
          clearDraft: vi.fn(),
          dispatchAuth: vi.fn(),
          queryClient: { invalidateQueries: vi.fn() },
          setDrawerState: vi.fn()
        })
      );

      await act(async () => {
        await result.current.handleEditSave();
      });

      // dbSet should NOT be called when the FHIR update fails
      expect(dbSet).not.toHaveBeenCalled();
    });
  });
});
