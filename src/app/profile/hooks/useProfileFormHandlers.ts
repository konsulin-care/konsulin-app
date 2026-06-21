'use client';

import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import { DRAWER_STATE } from '@/constants/profile';
import { IWilayahResponse } from '@/types/wilayah';
import { validateInput } from '@/utils/validation';

import type { ICustomProfile } from '../edit-profile';

type UseProfileFormHandlersParams = {
  updateUser: ICustomProfile;
  isPhoneBasedUser: boolean;
  setUpdateUser: React.Dispatch<React.SetStateAction<ICustomProfile>>;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  setDrawerState: React.Dispatch<React.SetStateAction<string>>;
};

type UseProfileFormHandlersResult = {
  handleChangeInput: (label: string, value: string) => void;
  handlePhoneChange: (
    value: string,
    meta?: { country?: { dialCode?: string } }
  ) => void;
  handleDOBChange: (value: Date | null) => void;
  closeDrawer: () => void;
  handleGenderSelect: (value: { code: string }) => void;
  handleProvinceSelect: (value: IWilayahResponse) => void;
  handleCitySelect: (value: IWilayahResponse) => void;
  handleDistrictSelect: (value: IWilayahResponse) => void;
  handleUserPhoto: (value: string) => void;
  handleAddAddress: () => void;
  handleAddressChange: (index: number, value: string) => void;
  handleRemoveAddress: (index: number) => void;
  formatDate: (dateObject: string) => string;
};

/**
 * Hook providing all form field handler functions for the edit profile page.
 * Extracted to keep the main component file under the line limit.
 */
export function useProfileFormHandlers({
  updateUser,
  isPhoneBasedUser,
  setUpdateUser,
  setErrors,
  setDrawerState
}: UseProfileFormHandlersParams): UseProfileFormHandlersResult {
  /** Update a profile field and run validation for it. */
  const handleChangeInput = (label: string, value: string) => {
    setUpdateUser(prevState => ({ ...prevState, [label]: value }));
    const errorMessage = validateInput(label, value, isPhoneBasedUser);
    setErrors(prev => ({
      ...prev,
      [label]: errorMessage
    }));
  };

  /** Handle phone number input with country code prefix. */
  const handlePhoneChange = (
    value: string,
    meta?: { country?: { dialCode?: string } }
  ) => {
    const dialCode = meta?.country?.dialCode ? `+${meta.country.dialCode}` : '';
    let cleaned = (value || '').replace(/[^\d+]/g, '');

    if (cleaned.startsWith('0') && dialCode) {
      cleaned = `${dialCode}${cleaned.slice(1)}`;
    } else if (cleaned.startsWith('+') && dialCode) {
      // Already has + prefix
    } else if (dialCode) {
      cleaned = `${dialCode}${cleaned}`;
    }

    cleaned = cleaned.replace(/^(\++)/, '+');
    handleChangeInput('phone', cleaned);
  };

  /** Update birth date from date picker. */
  const handleDOBChange = (value: Date | null) => {
    const isValid = value !== null && !Number.isNaN(value.getTime());
    setUpdateUser(prevState => ({
      ...prevState,
      birthDate: isValid ? format(value, 'yyyy-MM-dd') : ''
    }));
    setDrawerState(DRAWER_STATE.NONE);
  };

  /** Close the currently open drawer. */
  const closeDrawer = () => {
    setDrawerState(DRAWER_STATE.NONE);
  };

  /** Set gender from gender selection drawer. */
  const handleGenderSelect = (value: { code: string }) => {
    setUpdateUser(prevState => ({
      ...prevState,
      gender: value.code as ICustomProfile['gender']
    }));
  };

  /** Set province and reset dependent city/district fields. */
  const handleProvinceSelect = (value: IWilayahResponse) => {
    setUpdateUser(prevState => ({
      ...prevState,
      provinceCode: value.code,
      province: value.name,
      cityCode: '',
      city: ''
    }));
  };

  /** Set city/district/province from city selection drawer. */
  const handleCitySelect = (value: IWilayahResponse) => {
    setUpdateUser(prevState => ({
      ...prevState,
      cityCode: value.code,
      city: value.name,
      district: '',
      districtCode: ''
    }));
  };

  /** Set district from the district selector. */
  const handleDistrictSelect = (value: IWilayahResponse) => {
    setUpdateUser(prevState => ({
      ...prevState,
      district: value.name,
      districtCode: value.code
    }));
  };

  /** Update user photo URL. */
  const handleUserPhoto = (value: string) => {
    setUpdateUser(prevState => ({
      ...prevState,
      photo: value
    }));
  };

  /** Add a new blank address field to the address list. */
  const handleAddAddress = () => {
    const newAddresses = Array.isArray(updateUser.addresses)
      ? [...updateUser.addresses, '']
      : [''];
    setUpdateUser(prev => ({ ...prev, addresses: newAddresses }));
  };

  /** Update address at the given index. */
  const handleAddressChange = (index: number, value: string) => {
    setUpdateUser(prevState => ({
      ...prevState,
      addresses: Array.isArray(prevState.addresses)
        ? prevState.addresses.map((addr, i) => (i === index ? value : addr))
        : [value]
    }));
  };

  /** Remove address at the given index. */
  const handleRemoveAddress = (index: number) => {
    setUpdateUser(prev => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index)
    }));
  };

  /** Format an ISO date string for display. */
  const formatDate = (dateObject: string) => {
    const date = new Date(dateObject);
    try {
      return format(date, 'dd MMM yyyy', { locale: id });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return {
    handleChangeInput,
    handlePhoneChange,
    handleDOBChange,
    closeDrawer,
    handleGenderSelect,
    handleProvinceSelect,
    handleCitySelect,
    handleDistrictSelect,
    handleUserPhoto,
    handleAddAddress,
    handleAddressChange,
    handleRemoveAddress,
    formatDate
  };
}
