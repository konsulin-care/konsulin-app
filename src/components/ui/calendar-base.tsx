'use client';

import { type ComponentProps, type CSSProperties } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

import { cn } from '@/lib/utils';

export type CalendarBaseProps = ComponentProps<typeof DayPicker>;

/**
 * Base calendar component wrapping react-day-picker v9.
 *
 * Uses the default CSS grid layout from `react-day-picker/style.css` with
 * `navLayout="around"` to render navigation buttons on either side of the
 * month caption (centered between chevrons).
 * Accepts all DayPicker props — `mode`, `selected`, `onSelect`, `disabled`,
 * `components`, `className`, `classNames`, etc.
 */
function CalendarBase({ className, ...props }: CalendarBaseProps) {
  return (
    <DayPicker
      className={cn('flex justify-center', className)}
      style={
        {
          '--rdp-accent-color': 'var(--color-turquoise-deep)',
          '--rdp-accent-background-color': 'var(--color-turquoise-tint)'
        } as CSSProperties
      }
      navLayout='around'
      modifiersClassNames={{
        selected: 'bg-accent text-accent-foreground font-bold',
        today: 'font-extrabold'
      }}
      {...props}
    />
  );
}
CalendarBase.displayName = 'CalendarBase';

export { CalendarBase };
