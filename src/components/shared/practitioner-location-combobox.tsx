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
import { ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';

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
 * Dropdown list of location options.
 * Extracted to keep JSX nesting depth ≤ 4 (avoids react/jsx-max-depth violation).
 */
function LocationList({
  locations,
  onSelect,
  setOpen
}: {
  readonly locations: readonly PractitionerLocationOption[];
  readonly onSelect: (id: string | null) => void;
  readonly setOpen: (open: boolean) => void;
}) {
  return (
    <CommandList>
      <CommandEmpty>No locations found</CommandEmpty>
      <CommandGroup>
        {locations.map(loc => (
          <CommandItem
            key={loc.id}
            value={loc.id}
            onSelect={() => {
              onSelect(loc.id);
              setOpen(false);
            }}
          >
            {loc.name}
          </CommandItem>
        ))}
      </CommandGroup>
    </CommandList>
  );
}

/**
 * Combobox for selecting a FHIR Location (practitioner assignment).
 * Uses shadcn Popover + Command for type-to-filter search.
 * Expects Location objects with { id, name } shape from FHIR.
 */
export default function PractitionerLocationCombobox({
  locations = [],
  selectedId,
  onSelect,
  placeholder = 'Select location...',
  loading = false
}: PractitionerLocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedLocation = locations.find(l => l.id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={loading}
          className={cn(
            'h-[56px] w-full justify-between bg-white px-3 text-sm font-normal',
            loading && 'cursor-wait'
          )}
        >
          {loading ? (
            <span className='flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading...
            </span>
          ) : (
            <span
              className={cn(
                !selectedLocation && 'text-muted-foreground',
                'truncate'
              )}
            >
              {selectedLocation?.name ?? placeholder}
            </span>
          )}
          <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-[var(--radix-popover-trigger-width)] overflow-hidden p-0'
        data-testid='location-combobox-popover-content'
      >
        <Command>
          <CommandInput placeholder={placeholder} />
          <LocationList
            locations={locations}
            onSelect={onSelect}
            setOpen={setOpen}
          />
        </Command>
      </PopoverContent>
    </Popover>
  );
}
