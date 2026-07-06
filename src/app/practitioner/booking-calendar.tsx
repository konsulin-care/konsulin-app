import { Calendar } from '@/components/ui/calendar-temp';
import { DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import { format } from 'date-fns';
import type { PractitionerRoleAvailableTime } from 'fhir/r4';
import { DayButton, type CalendarDay } from 'react-day-picker';

import { createContext, useContext, useMemo } from 'react';

type ColorLegendEntry = {
  color: string;
  name: string;
};

type Props = {
  bookingState: IStateBooking;
  handleFilterChange: (
    label: string,
    value: string | Date | boolean | undefined
  ) => void;
  resetData: () => void;
  listAvailableDate: Date[];
  availableTime: PractitionerRoleAvailableTime[];
  today: Date;
  /** Skip DrawerTitle / DrawerDescription when used outside a drawer context. */
  hideHeader?: boolean;
  /** Per-day dot colors, keyed by YYYY-MM-DD date string. */
  dayDots?: Map<string, string[]>;
  /** Color legend entries for locations. */
  colorLegend?: ColorLegendEntry[];
  /** Called when the user navigates to a different month. */
  parentOnMonthChange?: (month: Date) => void;
  /**
   * When true, enables clicking ALL dates regardless of listAvailableDate.
   * Used by the practitioner dashboard where viewing any day's schedule
   * should be allowed. Defaults to false (booking flow).
   */
  showAllDates?: boolean;
};

/** Context for passing dayDots to DayButtonComp without nesting component definitions. */
const DayDotsContext = createContext<Map<string, string[]> | undefined>(
  undefined
);

/** DayButton wrapper that reads dayDots from context. */
function DayButtonComp(props: {
  readonly day: CalendarDay;
  readonly modifiers: Record<string, boolean>;
  readonly children?: React.ReactNode;
}) {
  const dayDots = useContext(DayDotsContext);
  return <DayButtonWithDots {...props} dayDots={dayDots ?? new Map()} />;
}

/** Dot indicators for a single day in the calendar. */
function DayDots({ dots }: { readonly dots: string[] }) {
  return (
    <ul className='flex justify-center gap-0.5'>
      {dots.slice(0, 3).map(color => (
        <li
          key={color}
          className='h-1 w-1 rounded-full'
          style={{ backgroundColor: color }}
        />
      ))}
    </ul>
  );
}

/** DayButton with colored dot indicators for location-based availability. */
function DayButtonWithDots({
  day,
  modifiers,
  children,
  dayDots,
  ...buttonProps
}: {
  readonly day: CalendarDay;
  readonly modifiers: Record<string, boolean>;
  readonly children?: React.ReactNode;
  readonly dayDots: Map<string, string[]>;
  // forwarded from react-day-picker: disabled, onClick, tabIndex, aria-label, onBlur, etc.
  [key: string]: unknown;
}) {
  const dateKey = format(day.date, 'yyyy-MM-dd');
  const dots = dayDots.get(dateKey);
  return (
    <DayButton day={day} modifiers={modifiers} {...buttonProps}>
      <div className='flex flex-col items-center gap-0.5'>
        <span>{children}</span>
        {dots && dots.length > 0 && <DayDots dots={dots} />}
      </div>
    </DayButton>
  );
}

/** Calendar-based date picker showing practitioner availability. */
export default function BookingCalendar({
  bookingState,
  handleFilterChange,
  resetData,
  listAvailableDate,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for Props API compatibility
  availableTime,
  today,
  hideHeader = false,
  dayDots,
  colorLegend,
  parentOnMonthChange,
  showAllDates = false
}: Readonly<Props>) {
  const customComponents = useMemo(() => {
    return dayDots ? { DayButton: DayButtonComp } : undefined;
  }, [dayDots]);

  return (
    <>
      {!hideHeader && (
        <DrawerTitle className='mx-auto text-[20px] font-bold'>
          See Availability
        </DrawerTitle>
      )}
      <div className='mt-4 flex w-full flex-col justify-center'>
        {!hideHeader && <DrawerDescription />}
        <DayDotsContext.Provider value={dayDots}>
          <Calendar
            defaultMonth={bookingState.date}
            mode='single'
            selected={bookingState.date}
            onSelect={date => {
              if (!date) return;
              handleFilterChange('date', date);
              handleFilterChange('hasUserChosenDate', true);
              resetData();
            }}
            onMonthChange={month => {
              if (!month) return;
              parentOnMonthChange?.(month);
              resetData();
            }}
            disabled={date =>
              date < today ||
              (!showAllDates &&
                !listAvailableDate.some(ad => ad.getTime() === date.getTime()))
            }
            components={customComponents}
          />
        </DayDotsContext.Provider>
        {colorLegend && colorLegend.length > 0 && (
          <div className='mt-4 flex flex-col gap-1'>
            {colorLegend.map(entry => (
              <div key={entry.name} className='flex items-center gap-2'>
                <div
                  className='h-2 w-2 rounded-full'
                  style={{ backgroundColor: entry.color }}
                />
                <span className='text-[11px] text-gray-600'>{entry.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
