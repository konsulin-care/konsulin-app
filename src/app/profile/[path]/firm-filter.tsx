import { FilterIcon } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useGetCities, useGetProvinces } from '@/services/api/cities';
import { IUseClinicParams } from '@/services/clinic';
import { IWilayahResponse } from '@/types/wilayah';
import { useState } from 'react';

export type IFirmFilter = {
  city: string;
  province_code: string;
};

export default function FirmFilter({ onChange }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [filter, setFilter] = useState<IUseClinicParams>({
    city: undefined,
    province_code: undefined
  });

  const isInitiaFilterState = !filter.city;

  const handleFilterChange = (label: string, value: any) => {
    setFilter(prevState => ({
      ...prevState,
      [label]: value
    }));
  };

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

  const renderDrawerContent = () => {
    return (
      <div className='flex flex-col'>
        <DrawerTitle className='mx-auto text-[20px] font-bold'>
          Filter & Sort
        </DrawerTitle>
        <div className='card mt-4 border-0 bg-[#F9F9F9]'>
          <div className='mb-4'>
            <div className='font-bold'>Location</div>
            <span className='text-muted-foreground text-xs opacity-50'>
              Please select a province first, then select a city.
            </span>
          </div>
          <div className='flex flex-wrap gap-[10px]'>
            <Select
              onValueChange={e => handleFilterChange('province_code', e)}
              value={filter.province_code}
            >
              <SelectTrigger className='w-full border-none'>
                <SelectValue placeholder='Select Province' />
              </SelectTrigger>
              <SelectContent>
                {listProvinces &&
                  listProvinces.length > 0 &&
                  !provinceLoading &&
                  listProvinces.map((item: IWilayahResponse) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {filter.province_code && (
              <Select
                value={filter.city}
                onValueChange={e => handleFilterChange('city', e)}
              >
                <SelectTrigger className='w-full border-none'>
                  <SelectValue placeholder='Select City' />
                </SelectTrigger>
                <SelectContent>
                  {listCities &&
                    !cityLoading &&
                    listCities.map((item: IWilayahResponse) => (
                      <SelectItem key={item.name} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

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
          className='mt-4 rounded-xl bg-secondary p-4 text-white'
          onClick={() => {
            setIsOpen(false);
            onChange(filter);
          }}
        >
          Terapkan Filter
        </Button>
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
