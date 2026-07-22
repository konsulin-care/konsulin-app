import DatePresetFilter from '@/components/shared/date-preset-filter';
import FilterActions from '@/components/shared/filter-actions';
import FilterCalendar from '@/components/shared/filter-calendar';
import FilterDrawerTrigger from '@/components/shared/filter-drawer-trigger';
import type { ComboboxOption } from '@/components/shared/location-combobox';
import LocationCombobox from '@/components/shared/location-combobox';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek
} from 'date-fns';
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
    label: 'This Month',
    value: {
      start: startOfMonth(today),
      end: endOfMonth(today)
    }
  }
];

/** Record type options for the multi-select combobox. */
const RECORD_TYPE_OPTIONS: ComboboxOption[] = [
  { code: 'QuestionnaireResponse', name: 'Assessment' },
  { code: 'PractitionerNote', name: 'Practitioner Note' },
  { code: 'SOAP Notes', name: 'SOAP' },
  { code: 'PatientNote', name: 'Self Journal' },
  { code: 'Condition', name: 'Condition' },
  { code: 'Encounter', name: 'Encounter' }
];

export type IRecordParams = {
  page?: number;
  pageSize?: number;
  query?: string;
  start_date?: Date;
  end_date?: Date;
  /** Selected record type codes. Empty / undefined = show all. */
  type?: string[];
  isUseCustomDate?: boolean;
};

/**
 * Record filter drawer with date presets and multi-select record types.
 */
export default function RecordFilter({
  onChange
}: Readonly<{
  onChange: (filter: IRecordParams) => void;
}>) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [whichContent, setWhichContent] = useState<
    typeof CONTENT_DEFAULT | typeof CONTENT_CUSTOM
  >(CONTENT_DEFAULT);
  const [isUseCustomDate, setIsUseCustomDate] = useState<boolean>(false);
  const [filter, setFilter] = useState<IRecordParams>({
    start_date: undefined,
    end_date: undefined,
    type: undefined
  });

  const isInitiaFilterState =
    !filter.start_date &&
    !filter.end_date &&
    (!filter.type || filter.type.length === 0) &&
    !filter.isUseCustomDate;

  /** Update a single record-filter field by key. */
  const handleFilterChange = (
    label: string,
    value: string | string[] | Date | boolean | undefined
  ) => {
    setFilter(prevState => ({
      ...prevState,
      [label]: value
    }));
  };

  /** Reset all filter fields and custom date mode. */
  const resetFilter = () => {
    setFilter({
      start_date: undefined,
      end_date: undefined,
      type: undefined
    });
    setIsUseCustomDate(false);
    handleFilterChange('isUseCustomDate', false);
  };

  /** Open custom date picker with default 7-day range. */
  const handleCustomFilterOpen = () => {
    handleFilterChange('start_date', today);
    handleFilterChange('end_date', addDays(today, 7));
    setIsUseCustomDate(true);
    handleFilterChange('isUseCustomDate', true);
    setWhichContent(CONTENT_CUSTOM);
  };

  /** Render default filter content or custom calendar filter based on whichContent. */
  const renderDrawerContent = () => {
    switch (whichContent) {
      case CONTENT_DEFAULT: {
        return (
          <div className='flex flex-col'>
            <DrawerTitle>
              <div className='mx-auto text-[20px] font-bold'>Filter & Sort</div>
            </DrawerTitle>

            <DrawerDescription />
            <DatePresetFilter
              presets={filterContentListDate}
              activeStart={filter.start_date}
              activeEnd={filter.end_date}
              isCustom={isUseCustomDate}
              onPresetSelect={(start, end) => {
                handleFilterChange('start_date', start);
                handleFilterChange('end_date', end);
                handleFilterChange('isUseCustomDate', false);
                setIsUseCustomDate(false);
              }}
              onCustomOpen={handleCustomFilterOpen}
            />

            {/* Multi-select record types */}
            <div className='card mt-4 border-0 bg-[#F9F9F9]'>
              <div className='mb-4 font-bold'>Show By</div>
              <LocationCombobox
                multiple
                options={RECORD_TYPE_OPTIONS}
                value={filter.type ?? []}
                onSelect={(codes: string[]) =>
                  handleFilterChange('type', codes)
                }
                placeholder='All types'
              />
            </div>

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
            <DrawerTitle>
              <div className='mx-auto text-[20px] font-bold'>Filter & Sort</div>
            </DrawerTitle>

            <DrawerDescription />
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
      modal
    >
      <DrawerTrigger asChild>
        <FilterDrawerTrigger onClick={() => setIsOpen(true)} />
      </DrawerTrigger>
      <DrawerContent className='mx-auto max-w-screen-sm p-4'>
        <div className='mt-4'>{renderDrawerContent()}</div>
      </DrawerContent>
    </Drawer>
  );
}
