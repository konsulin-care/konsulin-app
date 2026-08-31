'use client';

import { getDaysInMonth } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

/** Map full month name to 0-indexed month number. */
const MONTH_INDEX = new Map<string, number>(MONTHS.map((m, i) => [m, i]));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a yyyy-MM-dd string into { year, month (0-indexed), day } or null. */
function parseDob(value: string): {
  year: number;
  month: number;
  day: number;
} | null {
  if (!value) return null;
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  return { year: y, month: m - 1, day: d };
}

/** Format date parts into yyyy-MM-dd. */
function formatDob(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Select styles
// ---------------------------------------------------------------------------

const SELECT_CLASS =
  'rounded-xl border border-[#E3E3E3] px-3 py-2.5 text-sm outline-none focus:border-[#13C2C2]';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DobInputProps {
  /** Current value in yyyy-MM-dd format. */
  readonly value: string;
  /** Called with updated yyyy-MM-dd string whenever any part changes. */
  readonly onChange: (date: string) => void;
}

/**
 * Date-of-birth input with three native `<select>` elements (Day / Month / Year).
 *
 * Automatically clamps the day when month or year changes to prevent
 * invalid dates (e.g., Jan 31 -> Feb -> 28/29 depending on leap year).
 */
export default function DobInput({ value, onChange }: DobInputProps) {
  const parsed = useMemo(() => parseDob(value), [value]);

  const [day, setDay] = useState(parsed?.day ?? 0);
  const [month, setMonth] = useState(parsed?.month ?? -1);
  const [year, setYear] = useState(parsed?.year ?? 0);

  // Sync from external value on mount / prop change.
  useEffect(() => {
    const parsedDob = parseDob(value);
    if (parsedDob) {
      setDay(parsedDob.day);
      setMonth(parsedDob.month);
      setYear(parsedDob.year);
    } else {
      setDay(0);
      setMonth(-1);
      setYear(0);
    }
  }, [value]);

  const currentYear = new Date().getFullYear();

  const dayItems = useMemo(
    () => Array.from({ length: 31 }, (_, i) => i + 1),
    []
  );

  const yearItems = useMemo(
    () => Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i),
    [currentYear]
  );

  /** Emit updated date string, clamping day to valid range. */
  const emit = useCallback(
    (nextDay: number, nextMonth: number, nextYear: number) => {
      if (nextMonth < 0 || nextYear === 0) return;
      const maxDays = getDaysInMonth(new Date(nextYear, nextMonth));
      const clampedDay = Math.min(Math.max(nextDay, 1), maxDays);
      onChange(formatDob(nextYear, nextMonth, clampedDay));
    },
    [onChange]
  );

  /** Emit the date when the day select changes. */
  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = Number(e.target.value);
    setDay(next);
    if (month >= 0 && year > 0) emit(next, month, year);
  };

  /** Emit the date when the month select changes. */
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = MONTH_INDEX.get(e.target.value) ?? -1;
    setMonth(next);
    if (next >= 0 && year > 0) emit(day, next, year);
  };

  /** Emit the date when the year select changes. */
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = Number(e.target.value);
    setYear(next);
    if (month >= 0) emit(day, month, next);
  };

  return (
    <div className='flex gap-2'>
      <select
        value={day > 0 ? String(day) : ''}
        onChange={handleDayChange}
        aria-label='Day'
        className={`${SELECT_CLASS} w-[72px]`}
      >
        <option value=''>DD</option>
        {dayItems.map(d => (
          <option key={d} value={String(d)}>
            {d}
          </option>
        ))}
      </select>

      <select
        value={month >= 0 ? MONTHS[month] : ''}
        onChange={handleMonthChange}
        aria-label='Month'
        className={`${SELECT_CLASS} w-[120px]`}
      >
        <option value=''>Month</option>
        {MONTHS.map(m => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select
        value={year > 0 ? String(year) : ''}
        onChange={handleYearChange}
        aria-label='Year'
        className={`${SELECT_CLASS} w-[100px]`}
      >
        <option value=''>YYYY</option>
        {yearItems.map(y => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
