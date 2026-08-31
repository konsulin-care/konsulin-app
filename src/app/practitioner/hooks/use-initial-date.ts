import { useEffect, useRef } from 'react';
import { pickInitialDate } from '../booking-date-utils';

/**
 * Set the initial selected date on mount for both page and drawer modes.
 *
 * Page mode: sets `pageDate` once on mount.
 * Drawer mode: sets the booking date via `handleFilterChange` when the
 * drawer opens for the first time.
 */
export function useInitialDate({
  isPageMode,
  today,
  listAvailableDate,
  isOpenParam,
  bookingDate,
  hasUserChosenDate,
  handleFilterChange,
  pageDate,
  setPageDate
}: {
  isPageMode: boolean;
  today: Date;
  listAvailableDate: Date[];
  isOpenParam: string | null;
  bookingDate: Date;
  hasUserChosenDate: boolean;
  handleFilterChange: (
    label: string,
    value: string | Date | boolean | undefined
  ) => void;
  pageDate: Date;
  setPageDate: (date: Date) => void;
}) {
  const pageDateInitialized = useRef(false);

  /** Set initial date for page mode — runs only once on mount. */
  useEffect(() => {
    if (!isPageMode) return;
    if (pageDateInitialized.current) return;
    // Wait for availability data before finalizing initialization.
    if (listAvailableDate.length === 0) return;
    // Preserve user-selected date — only apply computed initial date otherwise.
    if (hasUserChosenDate) {
      pageDateInitialized.current = true;
      return;
    }
    pageDateInitialized.current = true;
    const initialDate = pickInitialDate(today, listAvailableDate);
    // Avoid unnecessary state update if pageDate already matches.
    if (pageDate.getTime() === initialDate.getTime()) return;
    setPageDate(initialDate);
    // pageDate, hasUserChosenDate intentionally excluded from deps to prevent
    // re-initialization when the user changes the selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPageMode, today, listAvailableDate]);

  useEffect(() => {
    if (isPageMode) return;
    if (isOpenParam !== 'true') {
      const initialDate = pickInitialDate(today, listAvailableDate);

      if (
        bookingDate.getTime() !== initialDate.getTime() &&
        !hasUserChosenDate
      ) {
        handleFilterChange('date', initialDate);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpenParam]);
}
