'use client';

import LocationCombobox from '@/components/shared/location-combobox';
import LocationHoursEditor from '@/components/shared/location-hours-editor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SwitchField } from '@/components/ui/switch-field';
import { DayOfWeek, TimeRange } from '@/types/availability';
import { IWilayahResponse } from '@/types/wilayah';

type LocationFormFieldsProps = {
  readonly status: 'active' | 'inactive';
  readonly name: string;
  readonly addressLine: string;
  readonly provinceCode: string;
  readonly cityCode: string;
  readonly districtCode: string;
  readonly longitude: string;
  readonly latitude: string;
  readonly listProvinces: readonly IWilayahResponse[];
  readonly listCities: readonly IWilayahResponse[];
  readonly listDistricts: readonly IWilayahResponse[];
  readonly provinceLoading: boolean;
  readonly cityLoading: boolean;
  readonly districtLoading: boolean;
  readonly hours: Record<DayOfWeek, TimeRange[]>;
  readonly onStatusChange: (status: 'active' | 'inactive') => void;
  readonly onNameChange: (name: string) => void;
  readonly onAddressLineChange: (line: string) => void;
  readonly onProvinceSelect: (option: IWilayahResponse) => void;
  readonly onCitySelect: (option: IWilayahResponse) => void;
  readonly onDistrictSelect: (option: IWilayahResponse) => void;
  readonly onLongitudeChange: (value: string) => void;
  readonly onLatitudeChange: (value: string) => void;
  readonly onAddTimeRange: (day: DayOfWeek) => void;
  readonly onUpdateTimeRange: (
    day: DayOfWeek,
    id: string,
    field: 'from' | 'to',
    value: string
  ) => void;
  readonly onDeleteTimeRange: (day: DayOfWeek, id: string) => void;
};

/**
 * Renders all Location form fields.
 *
 * Pure presentational component — no state management.
 * Consumed by AddLocationDrawer and EditLocationDrawer.
 */
export default function LocationFormFields({
  status,
  name,
  addressLine,
  provinceCode,
  cityCode,
  districtCode,
  longitude,
  latitude,
  listProvinces,
  listCities,
  listDistricts,
  provinceLoading,
  cityLoading,
  districtLoading,
  hours,
  onStatusChange,
  onNameChange,
  onAddressLineChange,
  onProvinceSelect,
  onCitySelect,
  onDistrictSelect,
  onLongitudeChange,
  onLatitudeChange,
  onAddTimeRange,
  onUpdateTimeRange,
  onDeleteTimeRange
}: LocationFormFieldsProps) {
  return (
    <div className='space-y-4'>
      <SwitchField
        checked={status === 'active'}
        onCheckedChange={(checked: boolean) =>
          onStatusChange(checked ? 'active' : 'inactive')
        }
        label='Open'
        offLabel='Close'
      />

      {/* Name */}
      <div>
        <Label htmlFor='loc-name'>Location Name</Label>
        <Input
          id='loc-name'
          type='text'
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder='Main Clinic'
          className='bg-white'
          aria-label='Location Name'
          maxLength={30}
        />
      </div>

      {/* Address line */}
      <div>
        <Label htmlFor='loc-address'>Address</Label>
        <Input
          id='loc-address'
          type='text'
          value={addressLine}
          onChange={e => onAddressLineChange(e.target.value)}
          placeholder='Jl. Example No. 1'
          className='bg-white'
          aria-label='Address'
        />
      </div>

      {/* Province / City / District cascade */}
      <LocationCombobox
        options={listProvinces}
        value={provinceCode}
        onSelect={onProvinceSelect}
        placeholder='Select Province'
        loading={provinceLoading}
      />

      {provinceCode && (
        <LocationCombobox
          options={listCities}
          value={cityCode}
          onSelect={onCitySelect}
          placeholder='Select City'
          loading={cityLoading}
        />
      )}

      {cityCode && (
        <LocationCombobox
          options={listDistricts}
          value={districtCode}
          onSelect={onDistrictSelect}
          placeholder='Select District'
          loading={districtLoading}
        />
      )}

      {/* Position */}
      <div className='flex gap-2'>
        <div className='flex-1'>
          <Label htmlFor='loc-longitude'>Longitude</Label>
          <Input
            id='loc-longitude'
            type='number'
            value={longitude}
            onChange={e => onLongitudeChange(e.target.value)}
            placeholder='106.846'
            className='bg-white'
            aria-label='Longitude'
            step='any'
          />
        </div>
        <div className='flex-1'>
          <Label htmlFor='loc-latitude'>Latitude</Label>
          <Input
            id='loc-latitude'
            type='number'
            value={latitude}
            onChange={e => onLatitudeChange(e.target.value)}
            placeholder='-6.305'
            className='bg-white'
            aria-label='Latitude'
            step='any'
          />
        </div>
      </div>

      {/* Hours of operation */}
      <div>
        <Label>Hours of Operation</Label>
        <LocationHoursEditor
          hours={hours}
          onAddTimeRange={onAddTimeRange}
          onUpdateTimeRange={onUpdateTimeRange}
          onDeleteTimeRange={onDeleteTimeRange}
        />
      </div>
    </div>
  );
}
