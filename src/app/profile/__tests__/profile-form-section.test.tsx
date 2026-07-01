import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ProfileFormSection from '../profile-form-section';

import type { ICustomProfile } from '../edit-profile';

const BASE_PROFILE: ICustomProfile = {
  fhirId: 'pat-1',
  resourceType: 'Patient',
  active: true,
  birthDate: '1990-01-15',
  gender: 'male',
  photo: '',
  userId: 'user-1',
  firstName: 'John',
  lastName: 'Doe',
  addresses: ['Jl. Sudirman No. 1'],
  cityCode: '31',
  city: 'Jakarta',
  district: 'Central Jakarta',
  districtCode: '3171',
  provinceCode: '31',
  province: 'DKI Jakarta',
  postalCode: '10110',
  phone: '+628123456789',
  email: 'test@example.com'
};

describe('ProfileFormSection', () => {
  const defaultHandlers = {
    handleChangeInput: vi.fn(),
    handlePhoneChange: vi.fn(),
    handleProvinceSelect: vi.fn(),
    handleCitySelect: vi.fn(),
    handleDistrictSelect: vi.fn(),
    handleGenderSelect: vi.fn(),
    handleAddressChange: vi.fn(),
    handleRemoveAddress: vi.fn(),
    handleAddAddress: vi.fn(),
    formatDate: vi.fn().mockReturnValue('15 Jan 1990'),
    setDrawerState: vi.fn()
  };

  it('renders address input with stable key', () => {
    const { container } = render(
      <ProfileFormSection
        updateUser={BASE_PROFILE}
        errors={{}}
        listProvinces={[]}
        listCities={[]}
        listDistricts={[]}
        isPhoneBasedUser={false}
        provinceLoading={false}
        cityLoading={false}
        districtLoading={false}
        {...defaultHandlers}
      />
    );

    // Check that address input renders
    const addressInput = container.querySelector('input[name="addresses-0"]');
    expect(addressInput).not.toBeNull();
  });

  it('renders multiple address inputs for each address entry', () => {
    const profileWithMultiple = {
      ...BASE_PROFILE,
      addresses: ['Addr 1', 'Addr 2']
    };

    const { container } = render(
      <ProfileFormSection
        updateUser={profileWithMultiple}
        errors={{}}
        listProvinces={[]}
        listCities={[]}
        listDistricts={[]}
        isPhoneBasedUser={false}
        provinceLoading={false}
        cityLoading={false}
        districtLoading={false}
        {...defaultHandlers}
      />
    );

    const addressInputs = container.querySelectorAll(
      'input[name^="addresses-"]'
    );
    expect(addressInputs.length).toBe(2);
  });

  it('uses index as key — no crypto.randomUUID dependency', () => {
    // Verify the component source doesn't use crypto.randomUUID by checking
    // that re-rendering with same addresses doesn't cause full DOM replacement
    const profile = {
      ...BASE_PROFILE,
      addresses: ['Test Address']
    };

    const { container, rerender } = render(
      <ProfileFormSection
        updateUser={profile}
        errors={{}}
        listProvinces={[]}
        listCities={[]}
        listDistricts={[]}
        isPhoneBasedUser={false}
        provinceLoading={false}
        cityLoading={false}
        districtLoading={false}
        {...defaultHandlers}
      />
    );

    const firstInput = container.querySelector('input[name="addresses-0"]');
    const firstInputRef = firstInput; // capture reference

    // Re-render with same address (simulating a state update)
    rerender(
      <ProfileFormSection
        updateUser={{ ...profile, addresses: ['Test Address'] }}
        errors={{}}
        listProvinces={[]}
        listCities={[]}
        listDistricts={[]}
        isPhoneBasedUser={false}
        provinceLoading={false}
        cityLoading={false}
        districtLoading={false}
        {...defaultHandlers}
      />
    );

    const secondInput = container.querySelector('input[name="addresses-0"]');
    // With stable keys, the same DOM element should be reused
    expect(secondInput).toBe(firstInputRef);
  });
});
