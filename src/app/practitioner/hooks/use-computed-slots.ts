import { parseISO } from 'date-fns';
import type { PractitionerRoleAvailableTime } from 'fhir/r4';
import { useMemo } from 'react';

interface FreeSlot {
  start: string;
  end: string;
}

/**
 * Compute free slots from busy-slot data and map them to pill format.
 *
 * @returns `{ computedFreeSlots, slotPills }` — both memoised.
 */
export function useComputedSlots({
  selectedDate,
  busySlots,
  effectiveAvailableTime,
  durationMinutes,
  practitionerTzOffset,
  computeFreeSlots
}: {
  selectedDate: Date | undefined;
  busySlots: Array<{ start: string; end: string }> | undefined;
  effectiveAvailableTime: PractitionerRoleAvailableTime[];
  durationMinutes: number;
  practitionerTzOffset: string;
  computeFreeSlots: (
    availableTime: PractitionerRoleAvailableTime[],
    busySlots: Array<{ start: string; end: string }>,
    selectedDate: Date,
    durationMinutes: number,
    practitionerTzOffset: string
  ) => FreeSlot[];
}) {
  const computedFreeSlots = useMemo(() => {
    if (!selectedDate || !busySlots) return [];
    return computeFreeSlots(
      effectiveAvailableTime,
      busySlots,
      selectedDate,
      durationMinutes,
      practitionerTzOffset
    );
  }, [
    selectedDate,
    busySlots,
    effectiveAvailableTime,
    durationMinutes,
    practitionerTzOffset
  ]);

  const slotPills = useMemo(() => {
    if (computedFreeSlots.length === 0) return [];
    return computedFreeSlots.map(fs => ({
      id: `free-${fs.start}-${fs.end}`,
      displayLabel: fs.start,
      value: fs.start,
      start: parseISO(`1970-01-01T${fs.start}:00`),
      end: parseISO(`1970-01-01T${fs.end}:00`),
      disabled: false,
      status: 'free'
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedFreeSlots]);

  return { computedFreeSlots, slotPills };
}
