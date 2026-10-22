import {
  AppointmentPayload,
  isAppointmentPayload,
  matchesPractitionerFromPath
} from '@/app/practitioner/utils';
import { clearIntent, getIntent } from '@/utils/redirect-intent';
import { useEffect } from 'react';

interface UseBookingRestorationOptions {
  isPageMode: boolean;
  isOpenParam: string | null;
  practitionerRoleId: string | undefined;
  authUserId: string | undefined;
  onRestoreAppointment: (payload: AppointmentPayload) => void;
  onLoadTempBooking?: (userId: string) => void;
}

/**
 * Restore booking state from redirect intent or session storage.
 *
 * When both fail, calls `onLoadTempBooking` (if provided) to fall back
 * to IndexedDB. Only active in drawer mode (isPageMode=false) when
 * isOpenParam is "true".
 */
export function useBookingRestoration({
  isPageMode,
  isOpenParam,
  practitionerRoleId,
  authUserId,
  onRestoreAppointment,
  onLoadTempBooking
}: UseBookingRestorationOptions): void {
  /** Restore booking from sessionStorage (set by auth SPA after login). */
  function tryRestoreBookingFromSession(): boolean {
    const stored = sessionStorage.getItem('pending_booking');
    if (!stored) return false;
    try {
      const raw = JSON.parse(stored) as unknown;
      if (!isAppointmentPayload(raw)) {
        sessionStorage.removeItem('pending_booking');
        return false;
      }
      const payload: AppointmentPayload = raw;
      if (!matchesPractitionerFromPath(payload.path, practitionerRoleId ?? ''))
        return false;
      onRestoreAppointment(payload);
      sessionStorage.removeItem('pending_booking');
      return true;
    } catch {
      sessionStorage.removeItem('pending_booking');
      return false;
    }
  }

  /** Try to restore booking from redirect intent. */
  function tryRestoreFromIntent(): boolean {
    const intent = getIntent();
    if (intent?.kind !== 'appointment') return false;

    if (!isAppointmentPayload(intent.payload)) {
      clearIntent();
      return false;
    }

    const payload: AppointmentPayload = intent.payload;
    if (!matchesPractitionerFromPath(payload.path, practitionerRoleId ?? '')) {
      return false;
    }

    onRestoreAppointment(payload);
    clearIntent();
    return true;
  }

  useEffect(() => {
    if (isPageMode) return;
    if (isOpenParam !== 'true') return;
    if (tryRestoreFromIntent()) return;
    if (tryRestoreBookingFromSession()) return;
    if (authUserId && onLoadTempBooking) {
      onLoadTempBooking(authUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpenParam, authUserId]);
}
