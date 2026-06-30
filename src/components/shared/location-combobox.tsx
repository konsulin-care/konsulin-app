'use client';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { IWilayahResponse } from '@/types/wilayah';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';

type LocationComboboxProps = {
  options: IWilayahResponse[];
  value: string;
  onSelect: (option: IWilayahResponse) => void;
  placeholder: string;
  loading?: boolean;
};

/**
 * Reusable combobox for selecting Indonesia administrative regions.
 * Uses shadcn Popover + Command for type-to-filter search.
 * Displays formatted location names from the API.
 */
export default function LocationCombobox({
  options = [],
  value,
  onSelect,
  placeholder,
  loading
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(o => o.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={loading}
          className='h-[56px] w-full justify-between bg-white px-3 text-sm font-normal'
        >
          {loading ? (
            <span className='flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading...
            </span>
          ) : (
            <span
              className={cn(
                !selectedOption && 'text-muted-foreground',
                'truncate'
              )}
            >
              {selectedOption?.name ?? placeholder}
            </span>
          )}
          <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0'>
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map(option => (
                <CommandItem
                  key={option.code}
                  value={option.code}
                  onSelect={() => {
                    onSelect(option);
                    setOpen(false);
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
      </PopoverContent>
    </Popover>
  );
}
