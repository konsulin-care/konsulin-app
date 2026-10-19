import {
  CONTENT_CUSTOM,
  CONTENT_DEFAULT,
  filterContentListClinicDate,
  filterContentListTime,
  localizeDatePresets,
  today
} from '@/components/shared/date-filter-presets';
import DatePresetFilter from '@/components/shared/date-preset-filter';
import FilterCalendar from '@/components/shared/filter-calendar';
import FilterCustomTimeInputs from '@/components/shared/filter-custom-time-inputs';
import FilterDrawerTrigger from '@/components/shared/filter-drawer-trigger';
import LocationCombobox, {
  type ComboboxOption
} from '@/components/shared/location-combobox';
import AppDrawer from '@/components/ui/app-drawer';
import { Button } from '@/components/ui/button';
import { Roles } from '@/constants/roles';
import { useDateFilter } from '@/hooks/useDateFilter';
import { useTranslations } from '@/i18n';
import { useGetCities, useGetProvinces } from '@/services/api/cities';
import { IUseClinicParams } from '@/services/clinic';
import { useListActiveOrganizations } from '@/services/clinic-locations';

import { addDays } from 'date-fns';
import { useState } from 'react';

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
  const t = useTranslations('common');
  const datePresets = localizeDatePresets(t, filterContentListClinicDate);
  const [isOpen, setIsOpen] = useState<boolean>(false);
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

  /** Apply a chosen date range to the clinic filter. */
  const handleDateChange = (start?: Date, end?: Date) => {
    handleFilterChange('start_date', start);
    handleFilterChange('end_date', end);
  };

  /** Seed default start/end date and time values for the custom pane. */
  const seedCustomDefaults = () => {
    handleFilterChange('start_time', '00:00');
    handleFilterChange('end_time', '23:59');
    handleFilterChange('start_date', today);
    handleFilterChange('end_date', addDays(today, 7));
    setIsUseCustomTime(true);
  };

  const {
    whichContent,
    isUseCustomDate,
    openDefaultPane,
    handleCustomOpen,
    handlePresetSelect,
    handleCalendarSelect
  } = useDateFilter({
    isInitialState: isInitiaFilterState,
    onCustomOpenSeed: seedCustomDefaults,
    onPresetSelect: handleDateChange,
    onCalendarSelect: handleDateChange
  });

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
        <div className='font-bold'>{t('clinic.location')}</div>
        <span className='text-muted-foreground text-xs opacity-50'>
          {t('clinic.location_hint')}
        </span>
      </div>
      <div className='flex flex-wrap gap-[10px]'>
        <LocationCombobox
          options={listProvinces ?? []}
          value={filter.province_code ?? ''}
          onSelect={(option: ComboboxOption) => {
            handleFilterChange('province_code', option.code);
            handleFilterChange('province', option.name);
          }}
          placeholder={t('clinic.select_province')}
          loading={provinceLoading}
        />
        {filter.province_code && (
          <LocationCombobox
            options={listCities ?? []}
            value={filter.city ?? ''}
            onSelect={(option: ComboboxOption) =>
              handleFilterChange('city', option.name)
            }
            placeholder={t('clinic.select_city')}
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
        <div className='font-bold'>{t('clinic.organization')}</div>
        <span className='text-muted-foreground text-xs opacity-50'>
          {t('clinic.organization_hint')}
        </span>
      </div>
      <div className='flex flex-wrap gap-[10px]'>
        <LocationCombobox
          options={organizations ?? []}
          value={filter.organization ?? ''}
          onSelect={(option: ComboboxOption) =>
            handleFilterChange('organization', option.code)
          }
          placeholder={t('clinic.select_organization')}
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
            {type === 'practitioner' ? (
              <>
                <DatePresetFilter
                  presets={datePresets}
                  activeStart={filter.start_date}
                  activeEnd={filter.end_date}
                  isCustom={isUseCustomDate}
                  onPresetSelect={handlePresetSelect}
                  onCustomOpen={handleCustomOpen}
                />
                <div className='card mt-4 border-0 bg-[#F9F9F9]'>
                  <div className='mb-4 font-bold'>{t('session_time')}</div>
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
                          onClick={handleCustomOpen}
                          className='bg-secondary hover:bg-secondary h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px] font-bold text-white'
                        >
                          {t('custom_range', {
                            range: `${filter.start_time} - ${filter.end_time}`
                          })}
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
                {t('reset_filter')}
              </Button>
            )}
          </div>
        );
      }
      case CONTENT_CUSTOM: {
        return (
          <div className='flex flex-col'>
            <div className='mt-4 flex w-full flex-col justify-center'>
              <FilterCalendar
                selected={{
                  from: filter.start_date,
                  to: filter.end_date
                }}
                onSelect={handleCalendarSelect}
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
              onClick={openDefaultPane}
              className='bg-secondary mt-4 rounded-xl text-white'
            >
              {t('back')}
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
    <AppDrawer
      open={isOpen}
      onClose={() => {
        openDefaultPane();
        setIsOpen(false);
      }}
      trigger={<FilterDrawerTrigger onClick={() => setIsOpen(true)} />}
      title={t('filter_title')}
      ctaLabel={t('apply_filter')}
      onCtaClick={() => {
        setIsOpen(false);
        onChange(filter);
      }}
    >
      {renderDrawerContent()}
    </AppDrawer>
  );
}
