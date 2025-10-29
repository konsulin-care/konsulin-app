'use client';

import { enGB } from 'date-fns/locale';
import * as React from 'react';
import { DayPicker } from 'react-day-picker';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/*
  Temporary copy of the shared Calendar component, scoped for the
  Unavailability dialog feature. We intentionally duplicate and
  harden layout/styling here to avoid regressions in other views
  while issue #297 (weekday/date alignment) is being resolved.

  When the root Calendar is fixed, replace usages of this copy
  with the original Calendar and delete this file.
*/

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CalendarUnavailability({
  className,
  classNames,
  showOutsideDays = true,
  modifiersClassNames,
  ...props
}: CalendarProps) {
  const defaultClassNames = {
    months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
    month: 'space-y-4',
    caption: 'flex justify-center pt-1 relative items-center',
    caption_label: 'text-sm font-medium',
    nav: 'space-x-1 flex items-center',
    nav_button: cn(
      buttonVariants({ variant: 'outline' }),
      'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
    ),
    nav_button_previous: 'absolute left-1',
    nav_button_next: 'absolute right-1',
    table: 'table w-full table-fixed border-collapse',
    head_row: 'table-row',
    head_cell:
      'table-cell w-[14.285%] text-center text-muted-foreground text-[0.8rem] px-0',
    row: 'table-row',
    cell: 'table-cell w-[14.285%] text-center text-sm p-0 align-middle relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
    day: cn(
      buttonVariants({ variant: 'ghost' }),
      'h-9 w-9 p-0 font-normal aria-selected:opacity-100 mx-auto'
    ),
    day_range_end: 'day-range-end',
    day_selected:
      'bg-primary text-primary-foreground ring-2 ring-secondary font-semibold hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
    day_today: 'bg-accent text-accent-foreground border border-accent',
    day_outside:
      'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
    day_disabled: 'text-muted-foreground opacity-50',
    day_range_middle:
      'aria-selected:bg-accent aria-selected:text-accent-foreground',
    day_hidden: 'invisible'
  } as const;

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{ ...defaultClassNames, ...(classNames || {}) }}
      locale={enGB}
      modifiersClassNames={{
        selected:
          'bg-primary text-primary-foreground ring-2 ring-secondary font-semibold !bg-primary !text-primary-foreground',
        today: 'border border-accent',
        ...(modifiersClassNames || {})
      }}
      weekStartsOn={1}
      {...props}
    />
  );
}
CalendarUnavailability.displayName = 'CalendarUnavailability';

export { CalendarUnavailability };
