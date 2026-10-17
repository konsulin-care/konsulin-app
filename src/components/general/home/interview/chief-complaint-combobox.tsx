'use client';

import Combobox, { type ComboboxOption } from '@/components/shared/combobox';
import { QUICK_COMPLAINT_IDS } from '@/constants/recommendation-decision-tree';
import { useTranslations } from '@/i18n';
import type { ChiefComplaint } from '@/types/recommendation-interview';
import { useMemo } from 'react';

/** Message key for the trigger placeholder (namespace `interview`). */
const COMBOBOX_PLACEHOLDER = 'select_concern';

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
  const t = useTranslations('interview');
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
    // No itemFilterValue override; whitespace issue does not apply
    <Combobox
      options={comboboxOptions}
      quickOptions={quickOptions}
      value={value?.id ?? ''}
      onSelect={(option: ComboboxOption) => {
        const complaint = options.find(item => item.id === option.code);
        if (complaint) onSelect(complaint);
      }}
      placeholder={t(COMBOBOX_PLACEHOLDER)}
      searchPlaceholder={t('search_placeholder')}
      emptyMessage={t('combobox_empty')}
      triggerRole='button'
    />
  );
}

export { COMBOBOX_PLACEHOLDER };
export default ChiefComplaintCombobox;
