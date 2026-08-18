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
import type { ChiefComplaint } from '@/types/recommendation-interview';
import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

const COMBOBOX_PLACEHOLDER = 'Select or search concern';

interface ChiefComplaintComboboxProps {
  /** Available chief complaints to search and select. */
  options: readonly ChiefComplaint[];
  /** Currently selected complaint, or null. */
  value: ChiefComplaint | null;
  /** Called when a complaint is selected. */
  onSelect: (complaint: ChiefComplaint) => void;
}

/**
 * Searchable combobox for chief-complaint selection.
 *
 * Filters against both label and synonyms (English + Indonesian).
 * Follows the LocationCombobox / cmdk pattern used app-wide.
 */
export function ChiefComplaintCombobox({
  options,
  value,
  onSelect
}: Readonly<ChiefComplaintComboboxProps>) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (complaint: ChiefComplaint) => {
      onSelect(complaint);
      setOpen(false);
    },
    [onSelect]
  );

  const sorted = useMemo(
    () =>
      [...options]
        .filter(Boolean)
        .toSorted((a, b) => a.label.localeCompare(b.label)),
    [options]
  );

  return (
    <div className='flex flex-col gap-3'>
      <ComplaintPopover
        open={open}
        onOpenChange={setOpen}
        options={sorted}
        value={value}
        onSelect={handleSelect}
      />
      <QuickSelectionChips chips={sorted} onSelect={onSelect} />
    </div>
  );
}

/** Popover containing the command list for complaint search. */
function ComplaintPopover({
  open,
  onOpenChange,
  options,
  value,
  onSelect
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: readonly ChiefComplaint[];
  value: ChiefComplaint | null;
  onSelect: (complaint: ChiefComplaint) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          className='h-[56px] w-full justify-between bg-white px-3 text-sm font-normal'
        >
          <span className={cn(!value && 'text-muted-foreground', 'truncate')}>
            {value?.label ?? COMBOBOX_PLACEHOLDER}
          </span>
          <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[var(--radix-popover-trigger-width)] overflow-hidden p-0'>
        <Command
          filter={(cmdValue, search) =>
            cmdValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder='Search your concern (Indonesian or English)' />
          <CommandList>
            <CommandEmpty>No matching concern found.</CommandEmpty>
            <CommandGroup>
              {options.map(complaint => (
                <CommandItem
                  key={complaint.id}
                  value={`${complaint.label} ${complaint.synonyms.join(' ')}`}
                  onSelect={() => onSelect(complaint)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value?.id === complaint.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {complaint.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Quick selection chip row below the combobox. */
function QuickSelectionChips({
  chips,
  onSelect
}: {
  chips: readonly ChiefComplaint[];
  onSelect: (complaint: ChiefComplaint) => void;
}) {
  return (
    <div>
      <p className='mb-2 text-xs font-semibold text-gray-500'>
        Quick Selection
      </p>
      <div className='flex flex-wrap gap-2'>
        {chips.map(complaint => (
          <button
            key={complaint.id}
            type='button'
            onClick={() => onSelect(complaint)}
            className='rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-[var(--secondary)] hover:text-[var(--secondary)]'
          >
            {complaint.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { COMBOBOX_PLACEHOLDER };
export default ChiefComplaintCombobox;
