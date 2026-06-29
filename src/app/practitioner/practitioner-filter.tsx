'use client';

import { FilterIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ComponentPropsWithoutRef } from 'react';
import { useState } from 'react';

export interface FilterState {
  status: 'all' | 'active' | 'inactive';
  locationId?: string;
}

interface LocationOption {
  id: string;
  name: string;
}

interface Props {
  locations: LocationOption[];
  value: FilterState;
  onChange: (state: FilterState) => void;
}

/** Badge positioned absolute top-right on the filter button. */
function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#13c2c2] text-[10px] font-bold text-white'>
      {count}
    </span>
  );
}

/** Filter icon button with optional count badge. Forwards props for Radix asChild. */
export function FilterButton({
  count,
  ...props
}: { count: number } & ComponentPropsWithoutRef<typeof Button>) {
  return (
    <Button
      variant='outline'
      className='relative flex h-[50px] w-[50px] items-center justify-center rounded-lg border-0 bg-[#F9F9F9]'
      {...props}
    >
      <FilterIcon
        width={20}
        height={20}
        className='min-h-[20px] min-w-[20px]'
        fill='#13c2c2'
      />
      <CountBadge count={count} />
    </Button>
  );
}

/** Renders a location list using Command combobox. */
function LocationCombobox({
  locations,
  onSelect
}: {
  locations: LocationOption[];
  onSelect: (id: string) => void;
}) {
  return (
    <Command>
      <CommandInput placeholder='Select location...' />
      <CommandList>
        <CommandEmpty>No locations found</CommandEmpty>
        <CommandGroup>
          {locations.map(loc => (
            <CommandItem key={loc.id} value={loc.id} onSelect={onSelect}>
              {loc.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

/** Content inside the popover: status toggle group + location combobox. */
function FilterPopoverContent({
  locations,
  value,
  onStatusChange,
  onLocationSelect,
  onReset,
  activeCount
}: {
  locations: LocationOption[];
  value: FilterState;
  onStatusChange: (status: string) => void;
  onLocationSelect: (id: string) => void;
  onReset: () => void;
  activeCount: number;
}) {
  return (
    <div className='space-y-4'>
      <div>
        <label className='mb-2 block text-sm font-medium'>Status</label>
        <ToggleGroup
          type='single'
          value={value.status === 'all' ? '' : value.status}
          onValueChange={onStatusChange}
          variant='outline'
          className='justify-start'
        >
          <ToggleGroupItem value='all'>All</ToggleGroupItem>
          <ToggleGroupItem value='active'>Active</ToggleGroupItem>
          <ToggleGroupItem value='inactive'>Inactive</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>Location</label>
        <LocationCombobox locations={locations} onSelect={onLocationSelect} />
      </div>

      {activeCount > 0 && (
        <Button
          variant='ghost'
          size='sm'
          className='w-full text-xs'
          onClick={onReset}
        >
          Reset filters
        </Button>
      )}
    </div>
  );
}

/**
 * Practitioner filter — popover with status toggles and location combobox.
 * Renders a filter button with active-count badge and dismissible chips
 * for applied filters.
 */
export default function PractitionerFilter({
  locations,
  value,
  onChange
}: Props) {
  const [open, setOpen] = useState(false);

  const activeCount =
    (value.status === 'all' ? 0 : 1) + (value.locationId ? 1 : 0);

  const locationName =
    locations.find(l => l.id === value.locationId)?.name ?? 'Unknown location';

  const handleStatusChange = (newStatus: string) => {
    if (newStatus.length > 0) {
      onChange({ ...value, status: newStatus as FilterState['status'] });
    }
  };

  const handleLocationSelect = (locId: string) => {
    onChange({ ...value, locationId: locId });
    setOpen(false);
  };

  const dismissStatus = () => {
    onChange({ ...value, status: 'all' });
  };

  const dismissLocation = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { locationId, ...rest } = value;
    onChange(rest as FilterState);
  };

  const handleReset = () => {
    onChange({ status: 'all' });
    setOpen(false);
  };

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <FilterButton count={activeCount} />
          </PopoverTrigger>
          <PopoverContent align='start' className='w-72 p-4'>
            <FilterPopoverContent
              locations={locations}
              value={value}
              onStatusChange={handleStatusChange}
              onLocationSelect={handleLocationSelect}
              onReset={handleReset}
              activeCount={activeCount}
            />
          </PopoverContent>
        </Popover>

        {value.status !== 'all' && (
          <Badge
            className='cursor-pointer gap-1 px-3 py-1 text-xs'
            onClick={dismissStatus}
          >
            {value.status === 'active' ? 'Active' : 'Inactive'} ×
          </Badge>
        )}
        {value.locationId && (
          <Badge
            className='cursor-pointer gap-1 px-3 py-1 text-xs'
            onClick={dismissLocation}
          >
            {locationName} ×
          </Badge>
        )}
      </div>
    </div>
  );
}
