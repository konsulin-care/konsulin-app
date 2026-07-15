'use client';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { IWilayahResponse } from '@/types/wilayah';
import { Check } from 'lucide-react';

interface LocationComboboxListProps {
  readonly options: readonly IWilayahResponse[];
  readonly value: string;
  readonly placeholder: string;
  readonly onSelect: (option: IWilayahResponse) => void;
  readonly onClose: () => void;
}

/** Command list for location combobox - extracted to reduce JSX nesting. */
export default function LocationComboboxList({
  options,
  value,
  placeholder,
  onSelect,
  onClose
}: LocationComboboxListProps) {
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
                onClose();
              }}
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4',
                  value === option.code ? 'opacity-100' : 'opacity-0'
                )}
              />
              {option.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
