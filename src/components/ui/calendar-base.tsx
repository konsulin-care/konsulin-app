'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { DayPicker, type NavProps } from 'react-day-picker';
import 'react-day-picker/style.css';

import { cn } from '@/lib/utils';

export type CalendarBaseProps = React.ComponentProps<typeof DayPicker>;

const components = {
  Nav: ({ onPreviousClick, onNextClick }: NavProps) => (
    <div className='flex items-center space-x-1'>
      <button
        onClick={onPreviousClick}
        className='absolute left-1 h-7 w-7 p-0 opacity-50 hover:opacity-100 [&_svg]:h-4 [&_svg]:w-4'
        type='button'
      >
        <ChevronLeft />
      </button>
      <button
        onClick={onNextClick}
        className='absolute right-1 h-7 w-7 p-0 opacity-50 hover:opacity-100 [&_svg]:h-4 [&_svg]:w-4'
        type='button'
      >
        <ChevronRight />
      </button>
    </div>
  )
};

/**
 * Base calendar component wrapping react-day-picker v9.
 *
 * Uses the default CSS grid layout from `react-day-picker/style.css`.
 * Accepts all DayPicker props — `mode`, `selected`, `onSelect`, `disabled`,
 * `components`, `className`, `classNames`, etc.
 */
function CalendarBase({ className, ...props }: CalendarBaseProps) {
  return (
    <DayPicker
      className={cn('flex justify-center', className)}
      style={
        {
          '--rdp-accent-color': '#0ABDC3'
        } as React.CSSProperties
      }
      modifiersClassNames={{
        selected: 'bg-[#0ABDC3] text-[#ECEFF4] font-bold',
        today: 'font-extrabold'
      }}
      components={components}
      {...props}
    />
  );
}
CalendarBase.displayName = 'CalendarBase';

export { CalendarBase };
