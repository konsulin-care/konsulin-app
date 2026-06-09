'use client';

import { buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
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
    <Calendar
      mode='range'
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
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
  );
}
