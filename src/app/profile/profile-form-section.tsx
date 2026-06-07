'use client';

import Input from '@/components/general/input';
import DropdownProfile from '@/components/profile/dropdown-profile';
import { DRAWER_STATE, genderList } from '@/constants/profile';
import { IWilayahResponse } from '@/types/wilayah';
import { X } from 'lucide-react';
import Image from 'next/image';
import { PhoneInput } from 'react-international-phone';
import type { ICustomProfile } from './edit-profile';

type ProfileFormSectionProps = {
  updateUser: ICustomProfile;
  errors: Record<string, string>;
  listProvinces: IWilayahResponse[];
  listCities: IWilayahResponse[];
  listDistricts: IWilayahResponse[];
  isPhoneBasedUser: boolean;
  provinceLoading: boolean;
  cityLoading: boolean;
  districtLoading: boolean;
  handleChangeInput: (label: string, value: string) => void;
  handlePhoneChange: (
    value: string,
    meta?: { country?: { dialCode?: string } }
  ) => void;
  handleProvinceSelect: (value: IWilayahResponse) => void;
  handleCitySelect: (value: IWilayahResponse) => void;
  handleDistrictSelect: (value: IWilayahResponse) => void;
  handleGenderSelect: (value: { code: string }) => void;
  handleAddressChange: (index: number, value: string) => void;
  handleRemoveAddress: (index: number) => void;
  handleAddAddress: () => void;
  formatDate: (dateObject: string) => string;
  setDrawerState: (state: string) => void;
};

export default function ProfileFormSection({
  updateUser,
  errors,
  listProvinces,
  listCities,
  listDistricts,
  isPhoneBasedUser,
  provinceLoading,
  cityLoading,
  districtLoading,
  handleChangeInput,
  handlePhoneChange,
  handleProvinceSelect,
  handleCitySelect,
  handleDistrictSelect,
  handleGenderSelect,
  handleAddressChange,
  handleRemoveAddress,
  handleAddAddress,
  formatDate,
  setDrawerState
}: Readonly<ProfileFormSectionProps>) {
  return (
    <div className='flex flex-grow flex-col space-y-4'>
      <Input
        width={24}
        height={24}
        prefixIcon={'/icons/user-edit.svg'}
        placeholder='First Name'
        name='firstName'
        id='firstName'
        type='text'
        value={updateUser.firstName}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          handleChangeInput('firstName', event.target.value)
        }
        opacity={false}
        outline={false}
        className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
      />
      {errors.firstName && (
        <p className='px-4 text-xs text-red-500'>{errors.firstName}</p>
      )}
      <Input
        width={24}
        height={24}
        prefixIcon={'/icons/user-edit.svg'}
        placeholder='Last Name'
        name='lastName'
        id='lastName'
        type='text'
        value={updateUser.lastName}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          handleChangeInput('lastName', event.target.value)
        }
        opacity={false}
        outline={false}
        className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
      />
      {errors.lastName && (
        <p className='px-4 text-xs text-red-500'>{errors.lastName}</p>
      )}
      <Input
        width={24}
        height={24}
        prefixIcon={'/icons/email.svg'}
        placeholder='address@domain.tld'
        name='email'
        id='email'
        type='email'
        value={updateUser.email}
        readOnly={!isPhoneBasedUser}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          handleChangeInput('email', event.target.value)
        }
        opacity={false}
        outline={false}
        className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
      />
      {errors.email && (
        <p className='px-4 text-xs text-red-500'>{errors.email}</p>
      )}
      <div
        className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
        onClick={() => setDrawerState(DRAWER_STATE.DOB)}
      >
        <Image
          src='/icons/calendar-edit.png'
          alt='calendar-icon'
          width={24}
          height={24}
        />
        <div className='flex flex-grow justify-start text-sm'>
          {updateUser.birthDate
            ? formatDate(updateUser.birthDate)
            : 'Date of Birth'}
        </div>
      </div>
      <div className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'>
        <PhoneInput
          defaultCountry='id'
          value={updateUser.phone}
          onChange={handlePhoneChange}
          placeholder='WhatsApp Number'
          className='flex-1'
          disabled={isPhoneBasedUser}
          inputStyle={{
            width: '100%',
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            fontWeight: 'normal',
            color: '#2C2F35',
            ...(isPhoneBasedUser && { cursor: 'not-allowed', opacity: 0.6 })
          }}
        />
      </div>
      {errors.phone && (
        <p className='px-4 text-xs text-red-500'>{errors.phone}</p>
      )}
      <DropdownProfile
        options={genderList}
        value={updateUser.gender}
        onSelect={handleGenderSelect}
        placeholder='Input your gender'
      />
      {errors.gender && (
        <p className='p-4 text-xs text-red-500'>{errors.gender}</p>
      )}
      <DropdownProfile
        options={listProvinces}
        value={updateUser.provinceCode}
        onSelect={handleProvinceSelect}
        placeholder='Province'
        loading={provinceLoading}
      />
      {errors.province && (
        <p className='p-4 text-xs text-red-500'>{errors.province}</p>
      )}
      {(updateUser.provinceCode || updateUser.city) && (
        <>
          <DropdownProfile
            options={listCities}
            value={updateUser.cityCode}
            onSelect={handleCitySelect}
            placeholder='City'
            labelPlaceholder={updateUser.city}
            loading={cityLoading}
          />
          {errors.city && (
            <p className='p-4 text-xs text-red-500'>{errors.city}</p>
          )}
        </>
      )}
      {(updateUser.cityCode || updateUser.district) && (
        <>
          <DropdownProfile
            options={listDistricts}
            value={updateUser.districtCode}
            onSelect={handleDistrictSelect}
            placeholder='District'
            labelPlaceholder={updateUser.district}
            loading={districtLoading}
          />
          {errors.district && (
            <p className='p-4 text-xs text-red-500'>{errors.district}</p>
          )}
        </>
      )}
      {updateUser.addresses?.map((addr: string, index: number) => (
        <div key={index} className='mb-2 flex items-center gap-2'>
          <Input
            width={24}
            height={24}
            prefixIcon={'/icons/location.svg'}
            placeholder='Address'
            name={`addresses-${index}`}
            id={`addresses-${index}`}
            type='text'
            value={addr}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              handleAddressChange(index, event.target.value)
            }
            opacity={false}
            outline={false}
            className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
          />
          <button
            type='button'
            onClick={() => handleRemoveAddress(index)}
            className='px-2 text-sm text-red-500'
          >
            <X />
          </button>
        </div>
      ))}
      <div className='my-4 flex justify-center'>
        <p
          className='cursor-pointer text-center text-sm font-normal'
          onClick={handleAddAddress}
        >
          + Add New Address
        </p>
      </div>
      <div className='flex w-full flex-grow flex-col justify-between space-x-2'>
        <div className='flex-1'>
          <Input
            width={24}
            height={24}
            prefixIcon={'/icons/location.svg'}
            placeholder='Postal Code'
            name='postalCode'
            id='postalCode'
            type='text'
            value={updateUser.postalCode}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              const onlyNumbers = event.target.value.replace(/\D/g, '');
              handleChangeInput('postalCode', onlyNumbers);
            }}
            opacity={false}
            outline={false}
            className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
          />
          {errors.postalCode && (
            <p className='px-4 text-xs text-red-500'>{errors.postalCode}</p>
          )}
        </div>
      </div>
    </div>
  );
}
