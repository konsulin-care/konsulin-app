'use client';

import Combobox, { type ComboboxOption } from '@/components/shared/combobox';
import { QUICK_COMPLAINT_IDS } from '@/constants/recommendation-decision-tree';
import type { ChiefComplaint } from '@/types/recommendation-interview';
import { useMemo } from 'react';

const COMBOBOX_PLACEHOLDER = 'Select or search concern';

interface ChiefComplaintComboboxProps {
  /** Available chief complaints to search and select. */
  options: readonly ChiefComplaint[];
  /** Currently selected complaint, or null. */
  value: ChiefComplaint | null;
  /** Called when a complaint is selected. */
  onSelect: (complaint: ChiefComplaint) => void;
}

/** Map a complaint to a generic option; synonyms join the search text. */
const toComboboxOption = (complaint: ChiefComplaint): ComboboxOption => ({
  code: complaint.id,
  name: complaint.label,
  searchText: [complaint.label, ...complaint.synonyms].join(' ')
});

/**
 * Searchable combobox for chief-complaint selection.
 *
 * Wraps the generic responsive combobox: complaints map to `{code, name,
 * searchText}` options (synonyms keep EN/ID search working) and the quick
 * picks appear while the search input is empty. The trigger keeps a plain
 * button role to preserve the existing accessible tree.
 */
export function ChiefComplaintCombobox({
  options,
  value,
  onSelect
}: Readonly<ChiefComplaintComboboxProps>) {
  const comboboxOptions = useMemo(
    () => options.map(complaint => toComboboxOption(complaint)),
    [options]
  );
  const quickOptions = useMemo(() => {
    const byId = new Map(comboboxOptions.map(option => [option.code, option]));
    return QUICK_COMPLAINT_IDS.map(id => byId.get(id)).filter(
      (option): option is ComboboxOption => option !== undefined
    );
  }, [comboboxOptions]);

  return (
    <Combobox
      options={comboboxOptions}
      quickOptions={quickOptions}
      value={value?.id ?? ''}
      onSelect={(option: ComboboxOption) => {
        const complaint = options.find(item => item.id === option.code);
        if (complaint) onSelect(complaint);
      }}
      placeholder={COMBOBOX_PLACEHOLDER}
      searchPlaceholder='Search your concern (Indonesian or English)'
      emptyMessage='No matching concern found.'
      triggerRole='button'
    />
  );
}

export { COMBOBOX_PLACEHOLDER };
export default ChiefComplaintCombobox;
