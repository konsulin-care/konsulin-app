import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

// Mock the expensive geometry/cascade dependencies
vi.mock('@/services/api/cities', () => ({
  useGetProvinces: () => ({ data: [], isLoading: false }),
  useGetCities: () => ({ data: [], isLoading: false }),
  useGetDistricts: () => ({ data: [], isLoading: false })
}));

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn((namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      common: {
        'location.open': 'Open',
        'location.close': 'Close',
        'location.name': 'Location Name',
        'location.name_placeholder': 'Main Clinic',
        'location.address': 'Address',
        'location.longitude': 'Longitude',
        'location.latitude': 'Latitude',
        'location.select_province': 'Select Province',
        'location.select_city': 'Select City',
        'location.select_district': 'Select District',
        'location.add_time': 'Add Time',
        'location.no_hours': 'No hours set for this day',
        'location.image_alt': 'Location preview',
        'location.address_placeholder': 'Street address'
      }
    };
    return translations[namespace]?.[key] ?? key;
  })
}));

import LocationFormFields from '@/components/shared/location-form-fields';
import type { DayOfWeek, TimeRange } from '@/types/availability';

function defaultHours(): Record<DayOfWeek, TimeRange[]> {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

/**
 * Render LocationFormFields with empty-form defaults.
 *
 * @param overrides - Props to replace on top of the default render.
 * @returns The RTL render result.
 */
function renderLocationFormFields(
  overrides: Partial<ComponentProps<typeof LocationFormFields>> = {}
) {
  return render(
    <LocationFormFields
      status='active'
      name=''
      addressLine=''
      provinceCode=''
      cityCode=''
      districtCode=''
      longitude=''
      latitude=''
      listProvinces={[]}
      listCities={[]}
      listDistricts={[]}
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
      {...overrides}
    />
  );
}

describe('LocationFormFields image uploader', () => {
  it('renders LocationImageUploader as the first child', () => {
    renderLocationFormFields({
      imageUrl: 'https://example.com/image.webp'
    });

    // The uploader preview img should exist with a translated alt
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'Location preview');
  });
});

describe('LocationFormFields status toggle', () => {
  it('renders SwitchField for status instead of tab buttons', () => {
    renderLocationFormFields();

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
    renderLocationFormFields({ status: 'inactive' });

    const switchEl = screen.getByRole('switch');
    expect(switchEl).not.toBeChecked();
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.queryByText('Open')).not.toBeInTheDocument();
  });
});

describe('LocationFormFields address placeholder', () => {
  it('uses the translated address placeholder', () => {
    renderLocationFormFields();

    expect(screen.getByPlaceholderText('Street address')).toBeInTheDocument();
  });
});
