'use client';

import AppDrawer from '@/components/ui/app-drawer';
import { Button } from '@/components/ui/button';
import { CalendarBase } from '@/components/ui/calendar-base';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';

interface DatePickerButtonProps {
  /** Currently selected date, or undefined if none. */
  readonly value: Date | undefined;
  /** Called when the user picks a date. */
  readonly onChange: (date: Date) => void;
  /** Placeholder shown when no date is selected. */
  readonly placeholder?: string;
  /** Disables the trigger button. */
  readonly disabled?: boolean;
}

/**
 * A button that opens a bottom-sheet drawer containing a single-date calendar.
 *
 * Displays the selected date formatted as `dd MMM yyyy`, or a placeholder
 * when no date is selected. On mobile and desktop the calendar always opens
 * inside an `AppDrawer` for consistent UX across the app.
 */
export default function DatePickerButton({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled = false
}: DatePickerButtonProps) {
  const [open, setOpen] = useState(false);

  const displayText = value ? format(value, 'dd MMM yyyy') : placeholder;

  /** Apply the selected date and close the picker. */
  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(date);
    setOpen(false);
  };

  return (
    <>
      <Button
        type='button'
        variant='outline'
        disabled={disabled}
        onClick={() => {
          setOpen(true);
        }}
        className='h-[56px] w-full justify-between bg-white px-3 text-sm font-normal'
      >
        <span className={value ? '' : 'text-muted-foreground'}>
          {displayText}
        </span>
        <CalendarIcon className='ml-2 h-4 w-4 shrink-0 opacity-50' />
      </Button>
      <AppDrawer
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title='Select Date'
      >
        <CalendarBase mode='single' selected={value} onSelect={handleSelect} />
      </AppDrawer>
    </>
  );
}
