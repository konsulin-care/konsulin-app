import DatePresetFilter from '@/components/shared/date-preset-filter';
import FilterActions from '@/components/shared/filter-actions';
import FilterCalendar from '@/components/shared/filter-calendar';
import FilterDrawerTrigger from '@/components/shared/filter-drawer-trigger';
import type { ComboboxOption } from '@/components/shared/location-combobox';
import LocationCombobox from '@/components/shared/location-combobox';
import AppDrawer from '@/components/ui/app-drawer';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n';
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
    labelKey: 'today',
    value: {
      start: today,
      end: today
    }
  },
  {
    labelKey: 'this_week',
    value: {
      start: addDays(startOfWeek(today), 1),
      end: addDays(endOfWeek(today), 1)
    }
  },
  {
    labelKey: 'this_month',
    value: {
      start: startOfMonth(today),
      end: endOfMonth(today)
    }
  }
];

/** Record type options for the multi-select combobox. */
const RECORD_TYPE_OPTIONS: { code: string; nameKey: string }[] = [
  { code: 'QuestionnaireResponse', nameKey: 'record.record_type.assessment' },
  { code: 'PractitionerNote', nameKey: 'record.record_type.practitioner_note' },
  { code: 'SOAP Notes', nameKey: 'record.record_type.soap' },
  { code: 'PatientNote', nameKey: 'record.record_type.self_journal' },
  { code: 'Condition', nameKey: 'record.record_type.condition' },
  { code: 'Encounter', nameKey: 'record.record_type.encounter' }
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
  const t = useTranslations('common');
  const dateOptions = filterContentListDate.map(preset => ({
    label: t(preset.labelKey),
    value: preset.value
  }));
  const recordTypeOptions: ComboboxOption[] = RECORD_TYPE_OPTIONS.map(
    option => ({ code: option.code, name: t(option.nameKey) })
  );
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
            <DatePresetFilter
              presets={dateOptions}
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
              <div className='mb-4 font-bold'>{t('record.show_by')}</div>
              <LocationCombobox
                multiple
                options={recordTypeOptions}
                value={filter.type ?? []}
                onSelect={(codes: string[]) =>
                  handleFilterChange('type', codes)
                }
                placeholder={t('record.all_types')}
              />
            </div>

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
        setWhichContent(CONTENT_DEFAULT);
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
