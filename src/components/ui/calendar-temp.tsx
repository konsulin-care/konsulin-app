'use client';

/**
 * TEMPORARY Calendar wrapper.
 *
 * This component intentionally exists alongside the original `@/components/ui/calendar`
 * to minimize blast radius while we migrate and stabilize the calendar UX.
 * Do NOT delete the original calendar; other parts of the app may still depend on it.
 *
 * Once the new behavior is confirmed stable, we can consolidate and remove this file.
 */
import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar(props: CalendarProps) {
  return (
    <DayPicker
      {...props}
      className={`${props.className || ''} flex justify-center`}
      style={
        {
          ...props.style,
          ['--rdp-accent-color' as any]: '#0ABDC3'
        } as React.CSSProperties
      }
      modifiersClassNames={{
        selected: 'bg-[#0ABDC3] text-[#ECEFF4] font-bold',
        today: '#ECEFF4',
        selectedToday: 'text-[#ECEFF4]'
      }}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
