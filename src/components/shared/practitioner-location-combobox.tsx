'use client';

import Combobox, { type ComboboxOption } from '@/components/shared/combobox';
import { useMemo } from 'react';

export interface PractitionerLocationOption {
  readonly id: string;
  readonly name: string;
}

interface PractitionerLocationComboboxProps {
  readonly locations: readonly PractitionerLocationOption[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly placeholder?: string;
  readonly loading?: boolean;
}

/**
 * Combobox for selecting a FHIR Location (practitioner assignment).
 *
 * Delegates to the generic responsive combobox: `{id, name}` locations map to
 * `{code, name}` options and the original default-export API is preserved.
 * Renders a popover on `min-width: 640px` and a bottom sheet below.
 */
export default function PractitionerLocationCombobox({
  locations = [],
  selectedId,
  onSelect,
  placeholder = 'Select location...',
  loading = false
}: Readonly<PractitionerLocationComboboxProps>) {
  const options = useMemo(
    (): ComboboxOption[] =>
      locations.map(location => ({
        code: location.id,
        name: location.name
      })),
    [locations]
  );

  return (
    <Combobox
      options={options}
      value={selectedId ?? ''}
      itemFilterValue={(option: ComboboxOption) => option.code}
      onSelect={(option: ComboboxOption) => {
        onSelect(option.code);
      }}
      placeholder={placeholder}
      loading={loading}
      emptyMessage='No locations found'
      contentTestId='location-combobox-popover-content'
    />
  );
}
