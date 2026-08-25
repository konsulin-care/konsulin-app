'use client';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import LocationComboboxList from './location-combobox/command-list';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape accepted by the combobox: at minimum a code and a display name. */
export type ComboboxOption = {
  code: string;
  name: string;
  /** Optional group heading rendered as a cmdk group label. */
  group?: string;
  /** Optional text added to the item filter value (e.g. code + classification). */
  searchText?: string;
};

type BaseProps = {
  readonly options: readonly ComboboxOption[];
  readonly placeholder: string;
  readonly loading?: boolean;
};

type SingleSelectProps = BaseProps & {
  readonly multiple?: false;
  readonly value: string;
  readonly onSelect: (option: ComboboxOption) => void;
};

type MultiSelectProps = BaseProps & {
  readonly multiple: true;
  readonly value: string[];
  readonly onSelect: (codes: string[]) => void;
};

export type LocationComboboxProps = SingleSelectProps | MultiSelectProps;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Reusable combobox with single and multi-select modes.
 *
 * Single-select (default):
 *   `value` is a string, `onSelect` receives the selected option.
 *
 * Multi-select (`multiple={true}`):
 *   `value` is a string[], `onSelect` receives the updated array.
 *   Renders checkboxes, does **not** close the popover on toggle.
 *
 * Uses shadcn Popover + Command for type-to-filter search.
 */
export default function LocationCombobox(props: LocationComboboxProps) {
  const { multiple = false, options = [], placeholder, loading } = props;
  const [open, setOpen] = useState(false);

  // ---- Resolve values based on mode ----
  const singleValue = multiple ? '' : (props as SingleSelectProps).value;
  const multiValue = multiple ? (props as MultiSelectProps).value : [];

  const selectedOptions = options.filter(o =>
    multiple ? multiValue.includes(o.code) : o.code === singleValue
  );
  const triggerText =
    selectedOptions.length > 0
      ? selectedOptions.map(o => o.name).join(', ')
      : placeholder;

  /** Handle item selection: toggle in multi mode, replace in single mode. */
  const handleSelect = (option: ComboboxOption) => {
    if (multiple) {
      const multiOnSelect = (props as MultiSelectProps).onSelect;
      const next = multiValue.includes(option.code)
        ? multiValue.filter(c => c !== option.code)
        : [...multiValue, option.code];
      multiOnSelect(next);
      // Popover stays open in multi-select mode
    } else {
      const singleOnSelect = (props as SingleSelectProps).onSelect;
      singleOnSelect(option);
      setOpen(false);
    }
  };

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
                selectedOptions.length === 0 && 'text-muted-foreground',
                'truncate'
              )}
            >
              {triggerText}
            </span>
          )}
          <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[var(--radix-popover-trigger-width)] overflow-hidden p-0'>
        <LocationComboboxList
          multiple={multiple}
          options={options}
          value={multiple ? multiValue : singleValue}
          placeholder={placeholder}
          onSelect={handleSelect}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
