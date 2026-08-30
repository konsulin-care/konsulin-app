import { STORES, dbDelete, dbGet } from '@/lib/indexeddb';
import { useCallback } from 'react';
import type { AppointmentPayload, TempBookingData } from '../utils';

/**
 * Create stable callbacks for restoring appointments and loading temp bookings.
 *
 * These are passed to `useBookingRestoration` and intentionally have empty
 * dependency arrays — the refs/ setters they close over are stable.
 */
export function useBookingRestoreCallbacks({
  setBookingInformation,
  handleFilterChange,
  setSelectedSlotId,
  setIsOpen
}: {
  setBookingInformation: (
    value: React.SetStateAction<{
      session_type: string;
      problem_brief: string;
    }>
  ) => void;
  handleFilterChange: (
    label: string,
    value: string | Date | boolean | undefined
  ) => void;
  setSelectedSlotId: (id: string | null) => void;
  setIsOpen: (open: boolean) => void;
}) {
  const onRestoreAppointment = useCallback((payload: AppointmentPayload) => {
    const { slot, formData } = payload;
    setBookingInformation(formData);
    handleFilterChange('date', new Date(slot.date));
    handleFilterChange('startTime', slot.startTime);
    handleFilterChange('hasUserChosenDate', true);
    if (slot.slotId) setSelectedSlotId(slot.slotId);
    setIsOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLoadTempBooking = useCallback((userId: string) => {
    setIsOpen(true);

    dbGet<TempBookingData>(STORES.tempBooking, userId)
      .then(parsed => {
        if (parsed) {
          setBookingInformation(() => ({
            schedule_id: parsed.scheduleId,
            session_type: parsed.sessionType,
            problem_brief: parsed.problemBrief,
            practitioner_role_id: parsed.practitionerRoleId,
            practitioner_available_time: parsed.practitionerAvailableTime
          }));

          handleFilterChange('date', new Date(parsed.date));
          handleFilterChange('startTime', parsed.startTime);
          handleFilterChange('hasUserChosenDate', parsed.hasUserChosenDate);
        }
        return parsed;
      })
      .then(() => {
        return userId ? dbDelete(STORES.tempBooking, userId) : undefined;
      })
      .catch(() => {
        // Best-effort load — ignore errors
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { onRestoreAppointment, onLoadTempBooking };
}
