import LocationFormFields from '@/components/shared/location-form-fields';
import type { DayOfWeek, TimeRange } from '@/types/availability';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { vi } from 'vitest';

/**
 * Empty hours map for every day of the week.
 *
 * @returns Record keyed 0-6 with empty TimeRange arrays.
 */
export function defaultHours(): Record<DayOfWeek, TimeRange[]> {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

/**
 * Render LocationFormFields with empty-form defaults.
 *
 * @param overrides - Props to replace on top of the default render.
 * @returns The RTL render result.
 */
export function renderLocationFormFields(
  overrides: Partial<ComponentProps<typeof LocationFormFields>> = {}
): RenderResult {
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
