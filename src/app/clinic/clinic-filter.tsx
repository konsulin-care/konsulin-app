import { FilterIcon } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { useState } from 'react';
const CONTENT_DEFAULT = 0;
const CONTENT_CUSTOM = 1;

const today = new Date();

const filterContentListDate = [
  {
    label: 'Today',
    value: {
      start: today,
      end: today
    }
  },
  {
    label: 'This Week',
    value: {
      start: addDays(startOfWeek(today), 1),
      end: addDays(endOfWeek(today), 1)
    }
  },
  {
    label: 'Next Week',
    value: {
      start: addDays(startOfWeek(today), 8),
      end: addDays(endOfWeek(today), 8)
    }
  }
];

const filterContentListTime = [
  {
    label: '07:00 - 10:00',
    value: {
      start: '07:00',
      end: '10:00'
    }
  },
  {
    label: '10:00 - 13:00',
    value: {
      start: '10:00',
      end: '13:00'
    }
  },
  {
    label: '13:00 - 16:00',
    value: {
      start: '13:00',
      end: '16:00'
    }
  },
  {
    label: '16:00 - 18:00',
    value: {
      start: '16:00',
      end: '18:00'
    }
  },
  {
    label: '18:00 - 22:00',
    value: {
      start: '18:00',
      end: '22:00'
    }
  }
];

export default function ClinicFilter({ onChange, type }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [whichContent, setWhichContent] = useState<
    typeof CONTENT_DEFAULT | typeof CONTENT_CUSTOM
  >(CONTENT_DEFAULT);
  const [isUseCustomDate, setIsUseCustomDate] = useState<boolean>(false);
  const [isUseCustomTime, setIsUseCustomTime] = useState<boolean>(false);
  const [filter, setFilter] = useState<IUseClinicParams>({
    start_date: undefined,
    end_date: undefined,
    start_time: undefined,
    end_time: undefined,
    city: undefined,
    province_code: undefined
  });

  const isInitiaFilterState =
    !filter.start_date &&
    !filter.end_date &&
    !filter.start_time &&
    !filter.end_time &&
    !filter.city;

  const handleCustomFilterOpen = () => {
    if (isInitiaFilterState) {
      handleFilterChange('start_time', '00:00');
      handleFilterChange('end_time', '23:59');
      handleFilterChange('start_date', today);
      handleFilterChange('end_date', addDays(today, 7));
      setIsUseCustomDate(true);
      setIsUseCustomTime(true);
    }

    setWhichContent(CONTENT_CUSTOM);
  };

  const handleFilterChange = (label: string, value: any) => {
    setFilter(prevState => ({
      ...prevState,
      [label]: value
    }));
  };

  const resetFilter = () => {
    setFilter({
      start_date: undefined,
      end_date: undefined,
      start_time: undefined,
      end_time: undefined,
      city: undefined,
      province_code: undefined
    });
  };

  const { data: listCities, isLoading: cityLoading } = useGetCities(
    Number(filter.province_code || 0)
  );
  const { data: listProvinces, isLoading: provinceLoading } = useGetProvinces();

  const renderDrawerContent = () => {
    switch (whichContent) {
      case CONTENT_DEFAULT:
        return (
          <div className='flex flex-col'>
            <DrawerTitle className='mx-auto text-[20px] font-bold'>
              Filter & Sort
            </DrawerTitle>
            {type === 'clinician' ? (
              <>
                <div className='card mt-4 border-0 bg-[#F9F9F9]'>
                  <div className='mb-4 font-bold'>Date</div>
                  <div className='flex flex-wrap gap-[10px]'>
                    {filterContentListDate.map(date => (
                      <Button
                        key={date.label}
                        onClick={() => {
                          handleFilterChange('start_date', date.value.start);
                          handleFilterChange('end_date', date.value.end);
                          setIsUseCustomDate(false);
                        }}
                        variant='outline'
                        className={cn(
                          'h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px]',
                          filter.start_date === date.value.start &&
                            filter.end_date === date.value.end
                            ? 'bg-secondary font-bold text-white hover:bg-secondary'
                            : 'bg-white font-normal'
                        )}
                      >
                        {date.label}
                      </Button>
                    ))}
                    <Button
                      variant='outline'
                      onClick={handleCustomFilterOpen}
                      className={cn(
                        'h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px]',
                        isUseCustomDate
                          ? 'bg-secondary font-bold text-white hover:bg-secondary'
                          : 'bg-white font-normal'
                      )}
                    >
                      Custom
                      {!isUseCustomDate ||
                      !filter.start_date ||
                      !filter.end_date
                        ? ''
                        : filter.start_date === filter.end_date
                          ? ` : ${format(filter.start_date, 'dd MMM yy')}`
                          : ` : ${format(filter.start_date, 'dd MMM yy')} - ${format(filter.end_date, 'dd MMM yy')}`}
                    </Button>
                  </div>
                </div>
                <div className='card mt-4 border-0 bg-[#F9F9F9]'>
                  <div className='mb-4 font-bold'>Session Time</div>
                  <div className='flex flex-wrap gap-[10px]'>
                    {filterContentListTime.map(time => (
                      <Button
                        variant='outline'
                        key={time.label}
                        onClick={() => {
                          setIsUseCustomTime(false);
                          handleFilterChange('start_time', time.value.start);
                          handleFilterChange('end_time', time.value.end);
                        }}
                        className={cn(
                          'h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px]',
                          filter.start_time === time.value.start &&
                            filter.end_time === time.value.end
                            ? 'bg-secondary font-bold text-white hover:bg-secondary'
                            : 'bg-white font-normal'
                        )}
                      >
                        {time.label}
                      </Button>
                    ))}
                    {isUseCustomTime &&
                      filter.start_time &&
                      filter.end_time && (
                        <Button
                          variant='outline'
                          onClick={handleCustomFilterOpen}
                          className={cn(
                            'h-[50px] w-min items-center justify-center rounded-lg border-0 bg-secondary p-4 text-[12px] font-bold text-white hover:bg-secondary'
                          )}
                        >
                          Custom : {`${filter.start_time} - ${filter.end_time}`}
                        </Button>
                      )}
                  </div>
                </div>
              </>
            ) : (
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
            )}

            {/**
             * Session Type temporary removed
             */}
            {/* <div className='card mt-4 border-0 bg-[#F9F9F9]'>
              <div className='mb-4 font-bold'>Session Type</div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  className={cn(
                    'h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px]',
                    filter.type === 'all'
                      ? 'bg-secondary font-bold text-white'
                      : 'bg-white'
                  )}
                  onClick={() => {
                    handleFilterChange('type', 'all')
                  }}
                >
                  All
                </Button>
                <Button
                  variant='outline'
                  className={cn(
                    'h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px]',
                    filter.type === 'online'
                      ? 'bg-secondary font-bold text-white'
                      : 'bg-white'
                  )}
                  onClick={() => {
                    handleFilterChange('type', 'online')
                  }}
                >
                  Online
                </Button>
                <Button
                  variant='outline'
                  className={cn(
                    'h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px]',
                    filter.type === 'offline'
                      ? 'bg-secondary font-bold text-white'
                      : 'bg-white'
                  )}
                  onClick={() => {
                    handleFilterChange('type', 'offline')
                  }}
                >
                  Offline
                </Button>
              </div>
            </div> */}
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
      case CONTENT_CUSTOM:
        return (
          <div className='flex flex-col'>
            <div className='mx-auto text-[20px] font-bold'>Filter & Sort</div>
            <div className='mt-4 flex w-full flex-col justify-center'>
              <Calendar
                mode='range'
                selected={{
                  from: filter.start_date,
                  to: filter.end_date
                }}
                onSelect={date => {
                  handleFilterChange('start_date', date?.from);
                  handleFilterChange(
                    'end_date',
                    date?.to ? date.to : date?.from
                  );
                  setIsUseCustomDate(true);
                }}
                disabled={{ before: today }}
                className='w-full p-0'
                classNames={{
                  month: 'space-y-8 w-full',
                  head_row: 'flex w-full',
                  head_cell:
                    'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] w-full',
                  cell: 'w-full h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                  day: cn(
                    buttonVariants({ variant: 'ghost' }),
                    'h-9 p-0 font-normal aria-selected:opacity-100 w-full'
                  ),
                  day_selected:
                    'bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground focus:bg-secondary focus:text-secondary-foreground',
                  day_today: 'bg-accent text-accent-foreground font-extrabold'
                }}
              />

              <div className='mt-8 flex gap-4'>
                <div className='grid w-full max-w-sm items-center gap-1.5'>
                  <Label htmlFor='start_time'>Start Time</Label>
                  <Input
                    onChange={e => {
                      handleFilterChange('start_time', e.target.value);
                      setIsUseCustomTime(true);
                    }}
                    value={filter.start_time}
                    id='start_time'
                    className='block p-4'
                    type='time'
                  />
                </div>
                <div className='grid w-full max-w-sm items-center gap-1.5'>
                  <Label htmlFor='end_time'>End Time</Label>
                  <Input
                    min={filter.start_time}
                    onChange={e => {
                      handleFilterChange('end_time', e.target.value);
                      setIsUseCustomTime(true);
                    }}
                    value={filter.end_time}
                    id='end_time'
                    className='block p-4'
                    type='time'
                  />
                </div>
              </div>
            </div>
            <Button
              type='button'
              onClick={() => setWhichContent(CONTENT_DEFAULT)}
              className='mt-4 rounded-xl bg-secondary text-white'
            >
              Kembali
            </Button>
          </div>
        );

      default:
        break;
    }
  };

  return (
    <Drawer
      onClose={() => {
        setWhichContent(CONTENT_DEFAULT);
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
