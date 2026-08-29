'use client';

import LocationCombobox from '@/components/shared/location-combobox';
import AppDrawer from '@/components/ui/app-drawer';
import {
  useGetCities,
  useGetDistricts,
  useGetProvinces
} from '@/services/api/cities';
import type { IWilayahResponse } from '@/types/wilayah';
import type { FhirResourceType } from '@/utils/role-fhir';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useProfileSectionSave } from './hooks/useProfileSectionSave';
import { mergeAddress } from './section-merge';

type Props = {
  /** Whether the drawer is open. */
  open: boolean;
  /** Closes the drawer; also called after a successful save. */
  onClose: () => void;
  /** The active role's FHIR resource id. */
  fhirId: string;
  /** The FHIR resource type backing the active role. */
  resourceType: FhirResourceType;
  /** Current address lines. */
  line: string[];
  /** Current district name. */
  district: string;
  /** Current city name. */
  city: string;
  /** Current province name. */
  province: string;
  /** Current postal code. */
  postalCode: string;
};

type LineRow = { id: number; value: string };

/** Labeled field wrapper used by every address field. */
function Field({
  label,
  children
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className='space-y-2'>
      <p className='text-xs font-semibold text-[#2C2F35]'>{label}</p>
      {children}
    </div>
  );
}

/** Street lines editor: repeatable rows with add/remove. */
function StreetLinesField({
  lines,
  onLineChange,
  onAddLine,
  onRemoveLine
}: Readonly<{
  lines: LineRow[];
  onLineChange: (id: number, value: string) => void;
  onAddLine: () => void;
  onRemoveLine: (id: number) => void;
}>) {
  return (
    <div className='space-y-2'>
      <p className='text-xs font-semibold text-[#2C2F35]'>Street</p>
      {lines.map(row => (
        <div key={row.id} className='flex items-center gap-2'>
          <input
            value={row.value}
            onChange={event => {
              onLineChange(row.id, event.target.value);
            }}
            data-testid={`line-${row.id}`}
            placeholder='Street address'
            className='w-full rounded-xl border border-[#E3E3E3] px-3 py-2.5 text-sm outline-none focus:border-[#13C2C2]'
          />
          {lines.length > 1 && (
            <button
              type='button'
              onClick={() => {
                onRemoveLine(row.id);
              }}
              data-testid={`remove-line-${row.id}`}
              aria-label='Remove address line'
              className='text-secondary shrink-0 cursor-pointer'
            >
              <Trash2 className='h-4 w-4' />
            </button>
          )}
        </div>
      ))}
      <button
        type='button'
        onClick={onAddLine}
        data-testid='add-line'
        className='text-secondary flex cursor-pointer items-center gap-1 text-xs font-semibold'
      >
        <Plus className='h-4 w-4' />
        Add address line
      </button>
    </div>
  );
}

/**
 * Address drawer: street lines plus the province/city/district cascade.
 * Saves atomically via the generic section save hook.
 */
export default function AddressEditDrawer({
  open,
  onClose,
  fhirId,
  resourceType,
  line,
  district,
  city,
  province,
  postalCode
}: Readonly<Props>) {
  const [lines, setLines] = useState<LineRow[]>([{ id: 0, value: '' }]);
  const nextLineId = useRef(1);
  const [districtValue, setDistrictValue] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [cityValue, setCityValue] = useState('');
  const [provinceValue, setProvinceValue] = useState('');
  const [postalValue, setPostalValue] = useState('');
  const [provinceCode, setProvinceCode] = useState('');
  const [cityCode, setCityCode] = useState('');
  const { isSaving, saveSection } = useProfileSectionSave();

  const { data: listProvinces } = useGetProvinces();
  const { data: listCities } = useGetCities(Number(provinceCode));
  const { data: listDistricts } = useGetDistricts(Number(cityCode));

  useEffect(() => {
    if (open) {
      const initial = line.length > 0 ? line : [''];
      setLines(initial.map((value, index) => ({ id: index, value })));
      nextLineId.current = initial.length;
      setDistrictValue(district);
      setDistrictCode('');
      setCityValue(city);
      setProvinceValue(province);
      setPostalValue(postalCode);
      setProvinceCode('');
      setCityCode('');
    }
  }, [open, line, district, city, province, postalCode]);

  /** Match the stored province name to its code once the list loads. */
  useEffect(() => {
    if (!open || provinceCode || !listProvinces?.length) return;
    const matched = listProvinces.find(p => p.name === provinceValue);
    if (matched) setProvinceCode(matched.code);
  }, [open, provinceCode, listProvinces, provinceValue]);

  /** Match the stored city name to its code once the list loads. */
  useEffect(() => {
    if (!open || cityCode || !listCities?.length) return;
    const matched = listCities.find(c => c.name === cityValue);
    if (matched) setCityCode(matched.code);
  }, [open, cityCode, listCities, cityValue]);

  /** Match the stored district name to its code once the list loads. */
  useEffect(() => {
    if (!open || districtCode || !listDistricts?.length) return;
    const matched = listDistricts.find(d => d.name === districtValue);
    if (matched) setDistrictCode(matched.code);
  }, [open, districtCode, listDistricts, districtValue]);

  /** Update one address line. */
  const handleLineChange = (id: number, value: string) => {
    setLines(prev =>
      prev.map(row => (row.id === id ? { ...row, value } : row))
    );
  };

  /** Append a blank address line. */
  const handleAddLine = () => {
    setLines(prev => [...prev, { id: nextLineId.current++, value: '' }]);
  };

  /** Remove an address line. */
  const handleRemoveLine = (id: number) => {
    setLines(prev => prev.filter(row => row.id !== id));
  };

  /** Select a province and reset dependent city/district fields. */
  const handleProvinceSelect = (value: IWilayahResponse) => {
    setProvinceCode(value.code);
    setProvinceValue(value.name);
    setCityCode('');
    setCityValue('');
    setDistrictValue('');
  };

  /** Select a city and reset the dependent district field. */
  const handleCitySelect = (value: IWilayahResponse) => {
    setCityCode(value.code);
    setCityValue(value.name);
    setDistrictValue('');
    setDistrictCode('');
  };

  /** Save the address into the resource. */
  const handleSave = () => {
    // skipcq: JS-0098 - fire-and-forget save; errors handled inside the hook
    void saveSection({
      fhirId,
      resourceType,
      merge: latest =>
        mergeAddress(latest, {
          line: lines.map(row => row.value),
          district: districtValue,
          city: cityValue,
          province: provinceValue,
          postalCode: postalValue
        }),
      onSuccess: onClose
    });
  };

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title='Address'
      description='Street, district, city and province.'
      ctaLabel='Save'
      ctaDisabled={isSaving}
      ctaLoading={isSaving}
      onCtaClick={handleSave}
    >
      <div className='space-y-5 px-4 pb-4'>
        <StreetLinesField
          lines={lines}
          onLineChange={handleLineChange}
          onAddLine={handleAddLine}
          onRemoveLine={handleRemoveLine}
        />

        <LocationCombobox
          options={listProvinces ?? []}
          value={provinceCode}
          onSelect={handleProvinceSelect}
          placeholder='Select province'
        />

        {provinceCode && (
          <LocationCombobox
            options={listCities ?? []}
            value={cityCode}
            onSelect={handleCitySelect}
            placeholder='Select city'
          />
        )}

        {cityCode && (
          <LocationCombobox
            options={listDistricts ?? []}
            value={districtCode}
            onSelect={(option: { code: string; name: string }) => {
              setDistrictCode(option.code);
              setDistrictValue(option.name);
            }}
            placeholder='Select district'
          />
        )}

        <Field label='Postal Code'>
          <input
            value={postalValue}
            onChange={event => {
              setPostalValue(event.target.value);
            }}
            data-testid='postal-input'
            placeholder='Postal code'
            className='w-full rounded-xl border border-[#E3E3E3] px-3 py-2.5 text-sm outline-none focus:border-[#13C2C2]'
          />
        </Field>
      </div>
    </AppDrawer>
  );
}
