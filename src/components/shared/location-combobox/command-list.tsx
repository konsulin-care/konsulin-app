'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { ComboboxOption } from '../location-combobox';

interface LocationComboboxListProps {
  readonly multiple?: boolean;
  readonly options: readonly ComboboxOption[];
  readonly value: string | string[];
  readonly placeholder: string;
  readonly onSelect: (option: ComboboxOption) => void;
  readonly onClose: () => void;
}

/**
 * Command list for location combobox.
 *
 * Options with a `group` render under a cmdk group heading. The filter value
 * of an item is `searchText ?? name`, so codes/classifications become
 * searchable when a consumer provides them.
 *
 * In single-select mode (default): renders a Check icon, closes on select.
 * In multi-select mode (`multiple={true}`): renders a Checkbox, stays open.
 */
export default function LocationComboboxList({
  multiple = false,
  options,
  value,
  placeholder,
  onSelect,
  onClose
}: LocationComboboxListProps) {
  /** Check if an option is selected (works for both string and string[] value). */
  const isSelected = (code: string): boolean =>
    multiple ? (value as string[]).includes(code) : (value as string) === code;

  /** Group options by heading, preserving input order; ungrouped share ''. */
  const groupedOptions = (): Map<string, ComboboxOption[]> => {
    const groups = new Map<string, ComboboxOption[]>();
    for (const option of options) {
      const key = option.group ?? '';
      const list = groups.get(key);
      if (list) list.push(option);
      else groups.set(key, [option]);
    }
    return groups;
  };

  return (
    <Command>
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {[...groupedOptions()].map(([group, groupOptions]) => (
          <CommandGroup key={group || 'ungrouped'} heading={group || undefined}>
            {groupOptions.map(option => (
              <CommandItem
                key={option.code}
                value={option.searchText ?? option.name}
                onSelect={() => {
                  onSelect(option);
                  if (!multiple) onClose();
                }}
              >
                {multiple ? (
                  <Checkbox
                    checked={isSelected(option.code)}
                    className='mr-2 h-4 w-4'
                  />
                ) : (
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      isSelected(option.code) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                )}
                {option.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}
