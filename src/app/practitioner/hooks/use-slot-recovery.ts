import type { IStateBooking } from '@/context/booking/bookingTypes';
import { addDays } from 'date-fns';
import { useEffect } from 'react';
import { getNextAvailableDate, isDateAvailable } from '../booking-date-utils';

/**
 * Validate selected date/time and recover to the next valid slot when
 * the current selection becomes unavailable.
 */
export function useSlotRecovery({
  isOpenParam,
  bookingState,
  listAvailableDate,
  slotPills,
  handleFilterChange,
  router
}: {
  isOpenParam: string | null;
  bookingState: Pick<IStateBooking, 'date' | 'startTime'>;
  listAvailableDate: Date[];
  slotPills: ReadonlyArray<{ disabled: boolean; value: string }>;
  handleFilterChange: (
    label: string,
    value: string | Date | boolean | null | undefined
  ) => void;
  router: { push: (url: string, options?: { scroll?: boolean }) => void };
}) {
  /* validate the selected date and time:
   * if the selected date is unavailable, set the next available date and reset the time.
   * if the selected time is unavailable, set the next available time after the current selection.
   * if no time is available, move to the next valid date and reset the time.
   * dependencies: re-run when selected date/time, available time slots, or valid date list changes.
   * */
  useEffect(() => {
    if (slotPills.length === 0 || isOpenParam !== 'true') return;

    const params = new URLSearchParams(window.location.search);

    const isValidDate = isDateAvailable(bookingState.date, listAvailableDate);
    const validTimeSlots = slotPills.filter(p => !p.disabled).map(p => p.value);

    const isValidTime = validTimeSlots.includes(bookingState.startTime);

    if (isValidDate === false) {
      const nextValidDate = getNextAvailableDate(
        bookingState.date,
        listAvailableDate
      );
      handleFilterChange('date', nextValidDate);
      handleFilterChange('startTime', null);

      params.delete('isOpen');
      router.push(`?${params.toString()}`, { scroll: false });

      return;
    }

    if (isValidTime === false) {
      const nextAvailableTime = validTimeSlots.find(
        time => time > bookingState.startTime
      );

      if (nextAvailableTime) {
        handleFilterChange('startTime', nextAvailableTime);
      } else {
        const nextValidDate = getNextAvailableDate(
          addDays(bookingState.date, 1),
          listAvailableDate
        );
        handleFilterChange('date', nextValidDate);
        handleFilterChange('startTime', null);

        params.delete('isOpen');
        router.push(`?${params.toString()}`, { scroll: false });
        return;
      }
    }

    params.delete('isOpen');
    router.push(`?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingState.date, bookingState.startTime, slotPills, listAvailableDate]);
}
