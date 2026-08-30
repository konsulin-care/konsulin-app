import type { PractitionerRoleAvailableTime } from 'fhir/r4';
import { useCallback } from 'react';
import { getAvailableDays } from '../utils';

/**
 * Auto-select the earliest available date when the calendar navigates to
 * a new month. Only active in page mode.
 */
export function useMonthChange({
  isPageMode,
  effectiveAvailableTime,
  today,
  setPageDate
}: {
  isPageMode: boolean;
  effectiveAvailableTime: PractitionerRoleAvailableTime[];
  today: Date;
  setPageDate: (date: Date) => void;
}) {
  return useCallback(
    (month: Date) => {
      if (!isPageMode || effectiveAvailableTime.length === 0) return;
      const daysInNewMonth = getAvailableDays(effectiveAvailableTime, month);
      const earliest = daysInNewMonth
        .filter(d => d >= today)
        .toSorted((a, b) => a.getTime() - b.getTime())[0];
      if (earliest) setPageDate(earliest);
    },
    [isPageMode, effectiveAvailableTime, today, setPageDate]
  );
}
