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
import type { IWilayahResponse } from '@/types/wilayah';
import { Check } from 'lucide-react';

interface LocationComboboxListProps {
  readonly multiple?: boolean;
  readonly options: readonly IWilayahResponse[];
  readonly value: string | string[];
  readonly placeholder: string;
  readonly onSelect: (option: IWilayahResponse) => void;
  readonly onClose: () => void;
}

/**
 * Command list for location combobox.
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

  return (
    <Command>
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {options.map(option => (
            <CommandItem
              key={option.code}
              value={option.name}
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
      </CommandList>
    </Command>
  );
}
