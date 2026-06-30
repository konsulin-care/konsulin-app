/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { FilterIcon } from '@/components/icons';
import LocationCombobox from '@/components/shared/location-combobox';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useGetCities, useGetProvinces } from '@/services/api/cities';
import { IUseClinicParams } from '@/services/clinic';

import { useState } from 'react';

export type IFirmFilter = {
  city: string;
  province_code: string;
};

/**
 *
 */
export default function FirmFilter({ onChange }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [filter, setFilter] = useState<IUseClinicParams>({
    city: undefined,
    province_code: undefined
  });

  const isInitiaFilterState = !filter.city;

  /** Update a single filter field value. */
  const handleFilterChange = (label: string, value: string | undefined) => {
    setFilter(prevState => ({
      ...prevState,
      [label]: value
    }));
  };

  /** Reset all filter selections to initial state. */
  const resetFilter = () => {
    setFilter({
      city: undefined,
      province_code: undefined
    });
  };

  const { data: listCities, isLoading: cityLoading } = useGetCities(
    Number(filter.province_code || 0)
  );
  const { data: listProvinces, isLoading: provinceLoading } = useGetProvinces();

  const locationContent = (
    <div className='card mt-4 border-0 bg-[#F9F9F9]'>
      <div className='mb-4'>
        <div className='font-bold'>Location</div>
        <span className='text-muted-foreground text-xs opacity-50'>
          Please select a province first, then select a city.
        </span>
      </div>
      <div className='flex flex-wrap gap-[10px]'>
        <LocationCombobox
          options={listProvinces ?? []}
          value={filter.province_code ?? ''}
          onSelect={option => handleFilterChange('province_code', option.code)}
          placeholder='Select Province'
          loading={provinceLoading}
        />

        {filter.province_code && (
          <LocationCombobox
            options={listCities ?? []}
            value={filter.city ?? ''}
            onSelect={option => handleFilterChange('city', option.name)}
            placeholder='Select City'
            loading={cityLoading}
          />
        )}
      </div>
    </div>
  );

  const filterActions = (
    <>
      {!isInitiaFilterState && (
        <Button
          variant='outline'
          size='sm'
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'mt-4 w-min border-0 text-[12px]'
          )}
          onClick={resetFilter}
        >
          Reset Filter
        </Button>
      )}
      <Button
        className='bg-secondary mt-4 rounded-xl p-4 text-white'
        onClick={() => {
          setIsOpen(false);
          onChange(filter);
        }}
      >
        Terapkan Filter
      </Button>
    </>
  );

  /** Render the drawer body with location filter and actions. */
  const renderDrawerContent = () => {
    return (
      <div className='flex flex-col'>
        <DrawerTitle className='mx-auto text-[20px] font-bold'>
          Filter & Sort
        </DrawerTitle>
        {locationContent}
        {filterActions}
      </div>
    );
  };

  return (
    <Drawer
      onClose={() => {
        setIsOpen(false);
      }}
      open={isOpen}
    >
      <DrawerTrigger asChild>
        <Button
          onClick={() => setIsOpen(true)}
          variant='outline'
          className={cn(
            'flex h-[50px] w-[50px] items-center justify-center rounded-lg border-0 bg-[#F9F9F9]'
          )}
        >
          <FilterIcon
            width={20}
            height={20}
            className='min-h-[20px] min-w-[20px]'
            fill='#13c2c2'
          />
        </Button>
      </DrawerTrigger>
      <DrawerContent
        className='mx-auto max-w-screen-sm p-4'
        onInteractOutside={() => {
          onChange(filter);
          setIsOpen(false);
        }}
      >
        <DrawerDescription />
        <div className='mt-4'>{renderDrawerContent()}</div>
      </DrawerContent>
    </Drawer>
  );
}
