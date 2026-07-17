'use client';

import { FilterIcon } from '@/components/icons';
import PractitionerLocationCombobox from '@/components/shared/practitioner-location-combobox';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ComponentPropsWithoutRef } from 'react';
import { forwardRef, useState } from 'react';

export interface FilterState {
  status: 'all' | 'active' | 'inactive';
  locationId?: string;
}

interface LocationOption {
  id: string;
  name: string;
}

interface Props {
  readonly locations: readonly LocationOption[];
  readonly value: FilterState;
  readonly onChange: (state: FilterState) => void;
}

/** Filter icon button. Forwards props and ref for Radix asChild. */
export const FilterButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button>
>(function FilterButton(props, ref) {
  return (
    <Button
      ref={ref}
      variant='outline'
      className='flex h-[50px] w-[50px] items-center justify-center rounded-lg border-0 bg-[#F9F9F9]'
      {...props}
    >
      <FilterIcon
        width={20}
        height={20}
        className='min-h-[20px] min-w-[20px]'
        fill='#13c2c2'
      />
    </Button>
  );
});

/** Content inside the popover: status toggle group + location combobox. */
function FilterPopoverContent({
  locations,
  value,
  onStatusChange,
  onLocationSelect,
  onReset,
  activeCount
}: {
  readonly locations: readonly LocationOption[];
  readonly value: FilterState;
  readonly onStatusChange: (status: string) => void;
  readonly onLocationSelect: (id: string) => void;
  readonly onReset: () => void;
  readonly activeCount: number;
}) {
  return (
    <div className='space-y-4'>
      <div>
        <span className='mb-2 block text-sm font-medium'>Status</span>
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
        <span className='mb-2 block text-sm font-medium'>Location</span>
        <PractitionerLocationCombobox
          locations={locations}
          selectedId={value.locationId ?? null}
          onSelect={onLocationSelect}
        />
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
 * Renders only the filter button with popover.
 * Badges are rendered by the parent page to span full layout width.
 */
export default function PractitionerFilter({
  locations,
  value,
  onChange
}: Props) {
  const [open, setOpen] = useState(false);

  const activeCount =
    (value.status === 'all' ? 0 : 1) + (value.locationId ? 1 : 0);

  const handleStatusChange = (newStatus: string) => {
    if (newStatus.length > 0) {
      onChange({ ...value, status: newStatus as FilterState['status'] });
    }
  };

  const handleLocationSelect = (locId: string) => {
    onChange({ ...value, locationId: locId });
    setOpen(false);
  };

  const handleReset = () => {
    onChange({ status: 'all' });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterButton />
      </PopoverTrigger>
      <PopoverContent
        align='center'
        className='w-[90vw] p-4'
        data-testid='filter-popover-content'
      >
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
  );
}
