import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useProfileFormHandlers } from '@/app/profile/hooks/useProfileFormHandlers';
import { DRAWER_STATE } from '@/constants/profile';

import type { ICustomProfile } from '@/app/profile/edit-profile';

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
  email: '',
};

describe('useProfileFormHandlers', () => {
  const setUpdateUser = vi.fn();
  const setErrors = vi.fn();
  const setDrawerState = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleDOBChange', () => {
    it('sets birthDate to formatted date when value is a Date', () => {
      const { result } = renderHook(() =>
        useProfileFormHandlers({
          updateUser: BASE_PROFILE,
          isPhoneBasedUser: false,
          setUpdateUser,
          setErrors,
          setDrawerState,
        })
      );

      act(() => {
        result.current.handleDOBChange(new Date('2024-06-15'));
      });

      expect(setUpdateUser).toHaveBeenCalledOnce();
      const updater = setUpdateUser.mock.calls[0][0];
      const prevState = { ...BASE_PROFILE };
      const nextState = updater(prevState);
      expect(nextState.birthDate).toBe('2024-06-15');
      expect(setDrawerState).toHaveBeenCalledWith(DRAWER_STATE.NONE);
    });

    it('sets birthDate to empty string when value is null', () => {
      const { result } = renderHook(() =>
        useProfileFormHandlers({
          updateUser: BASE_PROFILE,
          isPhoneBasedUser: false,
          setUpdateUser,
          setErrors,
          setDrawerState,
        })
      );

      act(() => {
        result.current.handleDOBChange(null);
      });

      expect(setUpdateUser).toHaveBeenCalledOnce();
      const updater = setUpdateUser.mock.calls[0][0];
      const prevState = { ...BASE_PROFILE };
      const nextState = updater(prevState);
      expect(nextState.birthDate).toBe('');
      expect(setDrawerState).toHaveBeenCalledWith(DRAWER_STATE.NONE);
    });
  });
});
