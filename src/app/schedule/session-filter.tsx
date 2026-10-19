/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import {
  CONTENT_CUSTOM,
  CONTENT_DEFAULT,
  filterContentListPastDate,
  filterContentListTime,
  filterContentListUpcomingDate,
  localizeDatePresets,
  today
} from '@/components/shared/date-filter-presets';
import DatePresetFilter from '@/components/shared/date-preset-filter';
import FilterActions from '@/components/shared/filter-actions';
import FilterCalendar from '@/components/shared/filter-calendar';
import FilterCustomTimeInputs from '@/components/shared/filter-custom-time-inputs';
import FilterDrawerTrigger from '@/components/shared/filter-drawer-trigger';
import AppDrawer from '@/components/ui/app-drawer';
import { Button } from '@/components/ui/button';
import { useDateFilter } from '@/hooks/useDateFilter';
import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';
import { IUseClinicParams } from '@/services/clinic';
import { addDays, format, subDays } from 'date-fns';
import { useEffect, useState } from 'react';

/**
 *
 */
export default function SessionFilter({ onChange, type, initialFilter }) {
  const t = useTranslations('common');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isUseCustomTime, setIsUseCustomTime] = useState<boolean>(false);
  const [filter, setFilter] = useState<IUseClinicParams>({
    start_date: undefined,
    end_date: undefined,
    start_time: undefined,
    end_time: undefined
  });

  const isInitiaFilterState =
    !filter.start_date &&
    !filter.end_date &&
    !filter.start_time &&
    !filter.end_time;

  /** Update a single session-filter field by key. */
  const handleFilterChange = (
    label: string,
    value: string | Date | undefined
  ) => {
    setFilter(prevState => ({
      ...prevState,
      [label]: value
    }));
  };

  /** Reset all session filter fields to undefined. */
  const resetFilter = () => {
    setFilter({
      start_date: undefined,
      end_date: undefined,
      start_time: undefined,
      end_time: undefined
    });
  };

  /** Apply a chosen date range to the session filter. */
  const handleDateChange = (start?: Date, end?: Date) => {
    handleFilterChange('start_date', start);
    handleFilterChange('end_date', end);
  };

  /** Seed default start/end date and time values for the custom pane. */
  const seedCustomDefaults = () => {
    handleFilterChange('start_time', '00:00');
    handleFilterChange('end_time', '23:59');

    if (type === 'past') {
      handleFilterChange('start_date', subDays(today, 7));
      handleFilterChange('end_date', today);
    } else {
      handleFilterChange('start_date', today);
      handleFilterChange('end_date', addDays(today, 7));
    }
    setIsUseCustomTime(true);
  };

  const {
    whichContent,
    isUseCustomDate,
    openDefaultPane,
    handleCustomOpen,
    handlePresetSelect,
    handleCalendarSelect,
    setIsUseCustomDate
  } = useDateFilter({
    isInitialState: isInitiaFilterState,
    onCustomOpenSeed: seedCustomDefaults,
    onPresetSelect: handleDateChange,
    onCalendarSelect: handleDateChange
  });

  useEffect(() => {
    if (initialFilter.start_date && initialFilter.end_date) {
      handleFilterChange('start_date', initialFilter.start_date);
      handleFilterChange('end_date', initialFilter.end_date);

      const allPresetDates = [
        ...filterContentListUpcomingDate,
        ...filterContentListPastDate
      ];

      /** Format a Date to yyyy-MM-dd for comparison. */
      const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');

      const matchedPreset = allPresetDates.some(preset => {
        return (
          formatDate(preset.value.start) ===
            formatDate(initialFilter.start_date) &&
          formatDate(preset.value.end) === formatDate(initialFilter.end_date)
        );
      });

      setIsUseCustomDate(!matchedPreset);
    }
  }, [initialFilter, setIsUseCustomDate]);

  const disabledDates =
    type === 'upcoming' ? { before: today } : { after: today };

  useEffect(() => {
    resetFilter();
    onChange({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const activePresets = localizeDatePresets(
    t,
    type === 'upcoming'
      ? filterContentListUpcomingDate
      : filterContentListPastDate
  );

  const timeFilterSection = (
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
            className={cn(
              'h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px]',
              filter.start_time === time.value.start &&
                filter.end_time === time.value.end
                ? 'bg-secondary hover:bg-secondary font-bold text-white'
                : 'bg-white font-normal'
            )}
          >
            {time.label}
          </Button>
        ))}
        {isUseCustomTime && filter.start_time && filter.end_time && (
          <Button
            variant='outline'
            onClick={handleCustomOpen}
            className={cn(
              'bg-secondary hover:bg-secondary h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px] font-bold text-white'
            )}
          >
            Custom : {`${filter.start_time} - ${filter.end_time}`}
          </Button>
        )}
      </div>
    </div>
  );

  /** Render default or custom date/time filter drawer content. */
  const renderDrawerContent = () => {
    switch (whichContent) {
      case CONTENT_DEFAULT: {
        return (
          <div className='flex flex-col'>
            <DatePresetFilter
              presets={activePresets}
              activeStart={filter.start_date}
              activeEnd={filter.end_date}
              isCustom={isUseCustomDate}
              onPresetSelect={handlePresetSelect}
              onCustomOpen={handleCustomOpen}
            />
            {timeFilterSection}
            <FilterActions
              showReset={!isInitiaFilterState}
              onReset={resetFilter}
            />
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
                disabled={disabledDates}
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
