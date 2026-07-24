'use client';

import { CalendarBase } from '@/components/ui/calendar-base';
import { DateRange, Matcher } from 'react-day-picker';

type Props = {
  readonly selected: DateRange | undefined;
  readonly onSelect: (range: DateRange | undefined) => void;
  readonly disabled?: Matcher | Matcher[];
};

/**
 *
 */
export default function FilterCalendar({
  selected,
  onSelect,
  disabled
}: Props) {
  return (
    <CalendarBase
      mode='range'
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      className='w-full p-0'
    />
  );
}
