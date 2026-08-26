'use client';

import { CalendarBase } from '@/components/ui/calendar-base';
import { addDays, startOfDay } from 'date-fns';
import { useState } from 'react';

/** Date-of-birth calendar picker with future-date restriction. */
export default function DobCalendar({
  value,
  onChange
}: Readonly<{ value: Date | null; onChange: (date: Date) => void }>) {
  const [selected, setSelected] = useState(value);

  const today = startOfDay(new Date());
  const maxDate = addDays(today, -1);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(date);
    setSelected(date);
  };

  return (
    <div className='p-4'>
      <CalendarBase
        mode='single'
        selected={selected ?? undefined}
        onSelect={handleSelect}
        disabled={{ after: maxDate }}
        numberOfMonths={1}
      />
    </div>
  );
}
