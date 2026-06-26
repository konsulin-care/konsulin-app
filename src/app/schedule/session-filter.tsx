/* eslint-disable max-lines, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import DatePresetFilter from '@/components/shared/date-preset-filter';
import FilterActions from '@/components/shared/filter-actions';
import FilterCalendar from '@/components/shared/filter-calendar';
import FilterCustomTimeInputs from '@/components/shared/filter-custom-time-inputs';
import FilterDrawerTrigger from '@/components/shared/filter-drawer-trigger';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { IUseClinicParams } from '@/services/clinic';
import {
  addDays,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks
} from 'date-fns';
import { useEffect, useState } from 'react';
const CONTENT_DEFAULT = 0;
const CONTENT_CUSTOM = 1;

const today = new Date();

const filterContentListUpcomingDate = [
  {
    label: 'Today',
    value: {
      start: startOfDay(today),
      end: endOfDay(today)
    }
  },
  {
    label: 'This Week',
    value: {
      start: startOfWeek(today, { weekStartsOn: 1 }),
      end: endOfWeek(today, { weekStartsOn: 1 })
    }
  },
  {
    label: 'Next Week',
    value: {
      start: startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }),
      end: endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })
    }
  }
];

const filterContentListPastDate = [
  {
    label: 'Today',
    value: {
      start: startOfDay(today),
      end: endOfDay(today)
    }
  },
  {
    label: 'Past Week',
    value: {
      start: startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }),
      end: endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })
    }
  },
  {
    label: 'Past Month',
    value: {
      start: startOfMonth(subMonths(today, 1)),
      end: endOfMonth(subMonths(today, 1))
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

/**
 *
 */
export default function SessionFilter({ onChange, type, initialFilter }) {
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
  }, [initialFilter]);

  /** Open custom date/time filter with default start/end values. */
  const handleCustomFilterOpen = () => {
    if (isInitiaFilterState) {
      handleFilterChange('start_time', '00:00');
      handleFilterChange('end_time', '23:59');

      if (type === 'past') {
        handleFilterChange('start_date', subDays(today, 7));
        handleFilterChange('end_date', today);
      } else {
        handleFilterChange('start_date', today);
        handleFilterChange('end_date', addDays(today, 7));
      }
      setIsUseCustomDate(true);
      setIsUseCustomTime(true);
    }

    setWhichContent(CONTENT_CUSTOM);
  };

  const disabledDates =
    type === 'upcoming' ? { before: today } : { after: today };

  useEffect(() => {
    resetFilter();
    onChange({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const activePresets =
    type === 'upcoming'
      ? filterContentListUpcomingDate
      : filterContentListPastDate;

  const timeFilterSection = (
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
            onClick={handleCustomFilterOpen}
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

  /** Renders the filter drawer content based on current selection. */
  /** Render default or custom date/time filter drawer content. */
  const renderDrawerContent = () => {
    switch (whichContent) {
      case CONTENT_DEFAULT: {
        return (
          <div className='flex flex-col'>
            <DrawerTitle className='mx-auto text-[20px] font-bold'>
              Filter & Sort
            </DrawerTitle>
            <DatePresetFilter
              presets={activePresets}
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
            {timeFilterSection}
            <FilterActions
              showReset={!isInitiaFilterState}
              onReset={resetFilter}
              onApply={() => {
                setIsOpen(false);
                onChange(filter);
              }}
            />
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
