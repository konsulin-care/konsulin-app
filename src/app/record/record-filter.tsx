/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import DatePresetFilter from '@/components/shared/date-preset-filter';
import FilterActions from '@/components/shared/filter-actions';
import FilterCalendar from '@/components/shared/filter-calendar';
import FilterDrawerTrigger from '@/components/shared/filter-drawer-trigger';
import { Button } from '@/components/ui/button';
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

export type IRecordParams = {
  page?: number;
  pageSize?: number;
  query?: string;
  start_date?: Date;
  end_date?: Date;
  type?: string;
  isUseCustomDate?: boolean;
};

/** Dropdown filter for record type. */
function ShowBySection({
  type,
  onTypeChange
}: Readonly<{ type?: string; onTypeChange: (value: string) => void }>) {
  return (
    <div className='card mt-4 border-0 bg-[#F9F9F9]'>
      <div className='mb-4 font-bold'>Show By</div>
      <Select value={type} onValueChange={onTypeChange}>
        <SelectTrigger className='w-full border-none'>
          <SelectValue placeholder='All' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='All'>All</SelectItem>
          <SelectItem value='Patient Note'>Journal</SelectItem>
          <SelectItem value='QuestionnaireResponse'>Assessment</SelectItem>
          <SelectItem value='Practitioner Note, SOAP Notes'>SOAP</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 *
 */
export default function RecordFilter({ onChange }) {
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
    !filter.type &&
    !filter.isUseCustomDate;

  const handleCustomFilterOpen = () => {
    handleFilterChange('start_date', today);
    handleFilterChange('end_date', addDays(today, 7));
    setIsUseCustomDate(true);
    handleFilterChange('isUseCustomDate', true);
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
      type: undefined
    });
    setIsUseCustomDate(false);
    handleFilterChange('isUseCustomDate', false);
  };

  const showBySection = (
    <ShowBySection
      type={filter.type}
      onTypeChange={(value: string) => handleFilterChange('type', value)}
    />
  );

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
            {showBySection}
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
      modal={isOpen}
    >
      <DrawerTrigger asChild>
        <FilterDrawerTrigger onClick={() => setIsOpen(true)} />
      </DrawerTrigger>
      <DrawerContent
        className='mx-auto max-w-screen-sm p-4'
        onInteractOutside={() => {
          setIsOpen(false);
          onChange(filter);
        }}
      >
        <div className='mt-4'>{renderDrawerContent()}</div>
      </DrawerContent>
    </Drawer>
  );
}
