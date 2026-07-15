'use client';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { IWilayahResponse } from '@/types/wilayah';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import LocationComboboxList from './location-combobox/command-list';

type LocationComboboxProps = {
  readonly options: readonly IWilayahResponse[];
  readonly value: string;
  readonly onSelect: (option: IWilayahResponse) => void;
  readonly placeholder: string;
  readonly loading?: boolean;
};

/**
 * Trigger button content for location combobox.
 * Handles loading spinner vs. selected option display.
 */
function LocationComboboxTrigger({
  loading,
  selectedOption,
  placeholder,
  open
}: Readonly<{
  loading?: boolean;
  selectedOption: IWilayahResponse | undefined;
  placeholder: string;
  open: boolean;
}>) {
  return (
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
          className={cn(!selectedOption && 'text-muted-foreground', 'truncate')}
        >
          {selectedOption?.name ?? placeholder}
        </span>
      )}
      <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
    </Button>
  );
}

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
        <LocationComboboxTrigger
          loading={loading}
          selectedOption={selectedOption}
          placeholder={placeholder}
          open={open}
        />
      </PopoverTrigger>
      <PopoverContent className='w-[var(--radix-popover-trigger-width)] overflow-hidden p-0'>
        <LocationComboboxList
          options={options}
          value={value}
          placeholder={placeholder}
          onSelect={onSelect}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
