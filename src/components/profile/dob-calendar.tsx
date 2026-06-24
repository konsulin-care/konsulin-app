/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { addDays } from 'date-fns';
import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import styles from './dob-calendar.module.css';

/**
 *
 */
export default function DobCalendar({
  value,
  onChange
}: Readonly<{ value: Date | null; onChange: (date: Date) => void }>) {
  const [selectedDate, setSelectedDate] = useState(value);

  const handleDateChange = (date: any) => {
    onChange(date);
    setSelectedDate(date);
  };

  const tileDisabled = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = addDays(today, 1);
      return date >= tomorrow;
    }
    return false;
  };

  const getTileClassName = ({ date, view }: { date: Date; view: string }) => {
    const classes = [styles['custom-tile']];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (view === 'month') {
      if (
        date instanceof Date &&
        date.toDateString() === today.toDateString()
      ) {
        classes.push(styles['custom-today']);
      }
      if (tileDisabled({ date, view })) {
        classes.push(styles['custom-disabled']);
      }
      if (
        selectedDate instanceof Date &&
        date instanceof Date &&
        date.toDateString() === selectedDate.toDateString()
      ) {
        classes.push(styles['custom-selected']);
      }
    }
    return classes.join(' ');
  };

  return (
    <div className='p-4'>
      <Calendar
        onChange={value => {
          handleDateChange(value);
        }}
        value={selectedDate}
        prev2Label={null}
        next2Label={null}
        tileDisabled={tileDisabled}
        className={styles['custom-calendar']}
        tileClassName={getTileClassName}
      />
    </div>
  );
}
