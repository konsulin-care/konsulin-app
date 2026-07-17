/* eslint-disable max-lines */
/* reason: renderDrawerContent nests location, org, and date/time sections
   in one drawer body — extracting would over-scatter state */
import DatePresetFilter from '@/components/shared/date-preset-filter';
import FilterCalendar from '@/components/shared/filter-calendar';
import FilterCustomTimeInputs from '@/components/shared/filter-custom-time-inputs';
import FilterDrawerTrigger from '@/components/shared/filter-drawer-trigger';
import LocationCombobox from '@/components/shared/location-combobox';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { Roles } from '@/constants/roles';
import { useGetCities, useGetProvinces } from '@/services/api/cities';
import { IUseClinicParams } from '@/services/clinic';
import { useListActiveOrganizations } from '@/services/clinic-locations';

import { addDays, endOfWeek, startOfWeek } from 'date-fns';
import { useState } from 'react';

const CONTENT_DEFAULT = 0;
const CONTENT_CUSTOM = 1;

const today = new Date();

const filterContentListDate = [
  {
    label: 'Today',
    value: { start: today, end: today }
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
    value: { start: '07:00', end: '10:00' }
  },
  {
    label: '10:00 - 13:00',
    value: { start: '10:00', end: '13:00' }
  },
  {
    label: '13:00 - 16:00',
    value: { start: '13:00', end: '16:00' }
  },
  {
    label: '16:00 - 18:00',
    value: { start: '16:00', end: '18:00' }
  },
  {
    label: '18:00 - 22:00',
    value: { start: '18:00', end: '22:00' }
  }
];

/**
 * Role-aware clinic filter drawer.
 *
 * Patient/Guest:  Location section (province + city) + Organization section
 * Clinic Admin:   Location section (province + city only)
 * Practitioner:   Date/Time section only
 */
export default function ClinicFilter({
  onChange,
  type,
  role
}: Readonly<{
  onChange: (filter: IUseClinicParams) => void;
  type: string;
  role?: string;
}>) {
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
    province_code: undefined,
    organization: undefined,
    province: undefined
  });

  const isInitiaFilterState =
    !filter.start_date &&
    !filter.end_date &&
    !filter.start_time &&
    !filter.end_time &&
    !filter.city &&
    !filter.province &&
    !filter.organization;

  /** Update a single filter field by key. */
  const handleFilterChange = (
    label: string,
    value: string | Date | undefined
  ) => {
    setFilter(prevState => ({
      ...prevState,
      [label]: value
    }));
  };

  /** Reset all filter fields to undefined. */
  const resetFilter = () => {
    setFilter({
      start_date: undefined,
      end_date: undefined,
      start_time: undefined,
      end_time: undefined,
      city: undefined,
      province_code: undefined,
      organization: undefined,
      province: undefined
    });
  };

  /** Open the custom date/time filter pane. */
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

  const isPatientOrGuest = role === Roles.Patient || role === Roles.Guest;

  const { data: listCities, isLoading: cityLoading } = useGetCities(
    Number(filter.province_code || 0)
  );
  const { data: listProvinces, isLoading: provinceLoading } = useGetProvinces();
  const { data: organizations, isLoading: orgLoading } =
    useListActiveOrganizations({ enabled: isPatientOrGuest });

  /** Render location filter section (province + city). */
  const renderLocationSection = () => (
    <div className='card mt-4 border-0 bg-[#F9F9F9]'>
      <div className='mb-4'>
        <div className='font-bold'>Location</div>
        <span className='text-muted-foreground text-xs opacity-50'>
          Select a province first, then optionally select a city.
        </span>
      </div>
      <div className='flex flex-wrap gap-[10px]'>
        <LocationCombobox
          options={listProvinces ?? []}
          value={filter.province_code ?? ''}
          onSelect={option => {
            handleFilterChange('province_code', option.code);
            handleFilterChange('province', option.name);
          }}
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

  /** Render organization filter section (Patient/Guest only). */
  const renderOrganizationSection = () => (
    <div className='card mt-4 border-0 bg-[#F9F9F9]'>
      <div className='mb-4'>
        <div className='font-bold'>Organization</div>
        <span className='text-muted-foreground text-xs opacity-50'>
          Filter by a specific clinic organization.
        </span>
      </div>
      <div className='flex flex-wrap gap-[10px]'>
        <LocationCombobox
          options={organizations ?? []}
          value={filter.organization ?? ''}
          onSelect={option => handleFilterChange('organization', option.code)}
          placeholder='Select Organization'
          loading={orgLoading}
        />
      </div>
    </div>
  );

  /** Render default or custom date/time filter content. */
  const renderDrawerContent = () => {
    switch (whichContent) {
      case CONTENT_DEFAULT: {
        return (
          <div className='flex flex-col'>
            <DrawerTitle className='mx-auto text-[20px] font-bold'>
              Filter & Sort
            </DrawerTitle>
            <DrawerDescription />

            {type === 'practitioner' ? (
              <>
                <DatePresetFilter
                  presets={filterContentListDate}
                  activeStart={filter.start_date}
                  activeEnd={filter.end_date}
                  isCustom={isUseCustomDate}
                  onPresetSelect={(start, end) => {
                    handleFilterChange('start_date', start);
                    handleFilterChange('end_date', end);
                    setIsUseCustomDate(false);
                  }}
                  onCustomOpen={handleCustomFilterOpen}
                />
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
                        className='h-[50px] w-min items-center justify-center rounded-lg border-0 bg-white p-4 text-[12px] font-normal'
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
                          className='bg-secondary hover:bg-secondary h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px] font-bold text-white'
                        >
                          Custom : {`${filter.start_time} - ${filter.end_time}`}
                        </Button>
                      )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {renderLocationSection()}
                {isPatientOrGuest && renderOrganizationSection()}
              </>
            )}

            {!isInitiaFilterState && (
              <Button
                variant='outline'
                size='sm'
                className='mt-4 w-min border-0 text-[12px]'
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
              Apply Filter
            </Button>
          </div>
        );
      }
      case CONTENT_CUSTOM: {
        return (
          <div className='flex flex-col'>
            <div className='mx-auto text-[20px] font-bold'>Filter & Sort</div>
            <div className='mt-4 flex w-full flex-col justify-center'>
              <FilterCalendar
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
              />
              <FilterCustomTimeInputs
                startTime={filter.start_time || ''}
                endTime={filter.end_time || ''}
                onStartTimeChange={value => {
                  handleFilterChange('start_time', value);
                  setIsUseCustomTime(true);
                }}
                onEndTimeChange={value => {
                  handleFilterChange('end_time', value);
                  setIsUseCustomTime(true);
                }}
              />
            </div>
            <Button
              type='button'
              onClick={() => setWhichContent(CONTENT_DEFAULT)}
              className='bg-secondary mt-4 rounded-xl text-white'
            >
              Kembali
            </Button>
          </div>
        );
      }
      default: {
        return null;
      }
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
        <FilterDrawerTrigger onClick={() => setIsOpen(true)} />
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
