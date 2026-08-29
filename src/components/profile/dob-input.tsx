'use client';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getDaysInMonth } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
] as const;

/** Map 3-letter month abbreviation to 0-indexed month number. */
const MONTH_INDEX = new Map<string, number>(MONTHS.map((m, i) => [m, i]));

/** Map 0-indexed month number to 3-letter abbreviation. */
const MONTH_ABBREV = new Map<number, string>(MONTHS.map((m, i) => [i, m]));

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
// Single combobox
// ---------------------------------------------------------------------------

interface DateComboboxProps {
  readonly items: readonly string[];
  readonly value: string;
  readonly placeholder: string;
  readonly width: string;
  readonly onSelect: (value: string) => void;
}

/** Single date-part combobox: Popover + Command with type-to-filter. */
function DateCombobox({
  items,
  value,
  placeholder,
  width,
  onSelect
}: DateComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn(
            'h-11 justify-between bg-white px-3 text-sm font-normal',
            width
          )}
        >
          <span className={cn(!value && 'text-muted-foreground', 'truncate')}>
            {value || placeholder}
          </span>
          <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[var(--radix-popover-trigger-width)] overflow-hidden p-0'>
        <Command>
          <CommandInput placeholder='Search...' />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            {items.map(item => (
              <CommandItem
                key={item}
                value={item}
                onSelect={() => {
                  onSelect(item);
                  setOpen(false);
                }}
              >
                {item}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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
 * Date-of-birth input with three comboboxes (Day / Month / Year).
 *
 * Supports type-to-filter search in each field. Automatically clamps
 * the day when month or year changes to prevent invalid dates
 * (e.g., Jan 31 → Feb → 28/29 depending on leap year).
 */
export default function DobInput({ value, onChange }: DobInputProps) {
  const parsed = useMemo(() => parseDob(value), [value]);

  const [day, setDay] = useState(parsed?.day ?? 0);
  const [month, setMonth] = useState(parsed?.month ?? -1);
  const [year, setYear] = useState(parsed?.year ?? 0);

  // Sync from外部 value on mount / prop change.
  useEffect(() => {
    const p = parseDob(value);
    if (p) {
      setDay(p.day);
      setMonth(p.month);
      setYear(p.year);
    }
  }, [value]);

  const currentYear = new Date().getFullYear();

  /** Items arrays (memoised). */
  const dayItems = useMemo(
    () => Array.from({ length: 31 }, (_, i) => String(i + 1)),
    []
  );

  const monthItems = useMemo(() => [...MONTHS], []);

  const yearItems = useMemo(
    () =>
      Array.from({ length: currentYear - 1899 }, (_, i) =>
        String(currentYear - i)
      ),
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

  const handleDayChange = (item: string) => {
    const next = Number(item);
    setDay(next);
    if (month >= 0 && year > 0) emit(next, month, year);
  };

  const handleMonthChange = (item: string) => {
    const next = MONTH_INDEX.get(item) ?? -1;
    setMonth(next);
    if (next >= 0 && year > 0) emit(day, next, year);
  };

  const handleYearChange = (item: string) => {
    const next = Number(item);
    setYear(next);
    if (month >= 0) emit(day, month, next);
  };

  const displayMonth = month >= 0 ? (MONTH_ABBREV.get(month) ?? '') : '';

  return (
    <div className='flex gap-2'>
      <DateCombobox
        items={dayItems}
        value={day > 0 ? String(day) : ''}
        placeholder='DD'
        width='w-[72px]'
        onSelect={handleDayChange}
      />
      <DateCombobox
        items={monthItems}
        value={displayMonth}
        placeholder='Month'
        width='w-[120px]'
        onSelect={handleMonthChange}
      />
      <DateCombobox
        items={yearItems}
        value={year > 0 ? String(year) : ''}
        placeholder='YYYY'
        width='w-[100px]'
        onSelect={handleYearChange}
      />
    </div>
  );
}
