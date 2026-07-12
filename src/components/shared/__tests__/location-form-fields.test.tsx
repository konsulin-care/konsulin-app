import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock the expensive geometry/cascade dependencies
vi.mock('@/services/api/cities', () => ({
  useGetProvinces: () => ({ data: [], isLoading: false }),
  useGetCities: () => ({ data: [], isLoading: false }),
  useGetDistricts: () => ({ data: [], isLoading: false })
}));

import LocationFormFields from '@/components/shared/location-form-fields';
import { DayOfWeek, TimeRange } from '@/types/availability';
import { IWilayahResponse } from '@/types/wilayah';

function defaultHours(): Record<DayOfWeek, TimeRange[]> {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

describe('LocationFormFields image uploader', () => {
  it('renders LocationImageUploader as the first child', () => {
    render(
      <LocationFormFields
        status='active'
        name=''
        addressLine=''
        provinceCode=''
        cityCode=''
        districtCode=''
        longitude=''
        latitude=''
        listProvinces={[] as unknown as IWilayahResponse[]}
        listCities={[] as unknown as IWilayahResponse[]}
        listDistricts={[] as unknown as IWilayahResponse[]}
        provinceLoading={false}
        cityLoading={false}
        districtLoading={false}
        hours={defaultHours()}
        onStatusChange={vi.fn()}
        onNameChange={vi.fn()}
        onAddressLineChange={vi.fn()}
        onProvinceSelect={vi.fn()}
        onCitySelect={vi.fn()}
        onDistrictSelect={vi.fn()}
        onLongitudeChange={vi.fn()}
        onLatitudeChange={vi.fn()}
        onAddTimeRange={vi.fn()}
        onUpdateTimeRange={vi.fn()}
        onDeleteTimeRange={vi.fn()}
        imageUrl='https://example.com/image.webp'
        onImageUrlChange={vi.fn()}
      />
    );

    // The uploader preview img should exist
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

describe('LocationFormFields status toggle', () => {
  it('renders SwitchField for status instead of tab buttons', () => {
    render(
      <LocationFormFields
        status='active'
        name=''
        addressLine=''
        provinceCode=''
        cityCode=''
        districtCode=''
        longitude=''
        latitude=''
        listProvinces={[] as unknown as IWilayahResponse[]}
        listCities={[] as unknown as IWilayahResponse[]}
        listDistricts={[] as unknown as IWilayahResponse[]}
        provinceLoading={false}
        cityLoading={false}
        districtLoading={false}
        hours={defaultHours()}
        onStatusChange={vi.fn()}
        onNameChange={vi.fn()}
        onAddressLineChange={vi.fn()}
        onProvinceSelect={vi.fn()}
        onCitySelect={vi.fn()}
        onDistrictSelect={vi.fn()}
        onLongitudeChange={vi.fn()}
        onLatitudeChange={vi.fn()}
        onAddTimeRange={vi.fn()}
        onUpdateTimeRange={vi.fn()}
        onDeleteTimeRange={vi.fn()}
        imageUrl=''
        onImageUrlChange={vi.fn()}
      />
    );

    // Should render a switch with label "Open" (checked = active)
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeInTheDocument();
    expect(switchEl).toBeChecked();
    expect(screen.getByText('Open')).toBeInTheDocument();

    // Should NOT render the old tab buttons
    expect(screen.queryByText('Closed')).not.toBeInTheDocument();
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });

  it('shows offLabel when status is inactive', () => {
    render(
      <LocationFormFields
        status='inactive'
        name=''
        addressLine=''
        provinceCode=''
        cityCode=''
        districtCode=''
        longitude=''
        latitude=''
        listProvinces={[] as unknown as IWilayahResponse[]}
        listCities={[] as unknown as IWilayahResponse[]}
        listDistricts={[] as unknown as IWilayahResponse[]}
        provinceLoading={false}
        cityLoading={false}
        districtLoading={false}
        hours={defaultHours()}
        onStatusChange={vi.fn()}
        onNameChange={vi.fn()}
        onAddressLineChange={vi.fn()}
        onProvinceSelect={vi.fn()}
        onCitySelect={vi.fn()}
        onDistrictSelect={vi.fn()}
        onLongitudeChange={vi.fn()}
        onLatitudeChange={vi.fn()}
        onAddTimeRange={vi.fn()}
        onUpdateTimeRange={vi.fn()}
        onDeleteTimeRange={vi.fn()}
        imageUrl=''
        onImageUrlChange={vi.fn()}
      />
    );

    const switchEl = screen.getByRole('switch');
    expect(switchEl).not.toBeChecked();
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.queryByText('Open')).not.toBeInTheDocument();
  });
});
