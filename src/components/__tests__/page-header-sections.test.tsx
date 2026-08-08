import type { MergedAppointment } from '@/types/appointment';
import { addDays, format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  canShowResearchHeader,
  isSessionCardAvailable,
  isSessionWithinWindow,
  shouldShowSeeAll
} from '../page-header-sections';

/** Local naive ISO string offset by the given number of days from now. */
function slotOn(dayOffset: number): string {
  return format(addDays(new Date(), dayOffset), "yyyy-MM-dd'T'HH:mm:ss");
}

/** Minimal valid appointment fixture for predicate tests. */
function makeAppointment(slotStart: string | null): MergedAppointment {
  return {
    appointmentId: 'appt-1',
    slotStart,
    slotEnd: null,
    slotStatus: null,
    appointmentType: null,
    practitionerId: null,
    practitionerName: null,
    practitionerQualification: null,
    practitionerPhoto: null,
    practitionerEmail: null
  };
}

describe('isSessionWithinWindow', () => {
  it('is true for a session starting today', () => {
    expect(isSessionWithinWindow([makeAppointment(slotOn(0))])).toBe(true);
  });

  it('is true for a session starting tomorrow', () => {
    expect(isSessionWithinWindow([makeAppointment(slotOn(1))])).toBe(true);
  });

  it('is false for a session starting later than tomorrow', () => {
    expect(isSessionWithinWindow([makeAppointment(slotOn(5))])).toBe(false);
  });

  it('is false for a session that already started', () => {
    expect(isSessionWithinWindow([makeAppointment(slotOn(-1))])).toBe(false);
  });

  it('is false for null, empty, or slot-less data', () => {
    expect(isSessionWithinWindow(null)).toBe(false);
    expect(isSessionWithinWindow([])).toBe(false);
    expect(isSessionWithinWindow([makeAppointment(null)])).toBe(false);
  });
});

describe('isSessionCardAvailable', () => {
  const data = [makeAppointment('2026-08-01T09:00:00')];

  it('is true when session data exists and no gate applies', () => {
    expect(isSessionCardAvailable(data, false, false)).toBe(true);
  });

  it('is false for null, undefined, or empty data', () => {
    expect(isSessionCardAvailable(null, false, false)).toBe(false);
    expect(isSessionCardAvailable(undefined, false, false)).toBe(false);
    expect(isSessionCardAvailable([], false, false)).toBe(false);
  });

  it('is false for admins', () => {
    expect(isSessionCardAvailable(data, true, false)).toBe(false);
  });

  it('is false when the session block is hidden by the page', () => {
    expect(isSessionCardAvailable(data, false, true)).toBe(false);
  });
});

describe('shouldShowSeeAll', () => {
  it('is true when an urgent session wins over research', () => {
    expect(shouldShowSeeAll(true, true, true)).toBe(true);
  });

  it('is true when an urgent session shows for a research-ineligible role', () => {
    expect(shouldShowSeeAll(true, true, false)).toBe(true);
  });

  it('is false when research replaces a non-urgent session', () => {
    expect(shouldShowSeeAll(true, false, true)).toBe(false);
  });

  it('is true when a non-urgent session falls back for a research-ineligible role', () => {
    expect(shouldShowSeeAll(true, false, false)).toBe(true);
  });

  it('is false when there is no session card at all', () => {
    expect(shouldShowSeeAll(false, false, true)).toBe(false);
  });
});

describe('canShowResearchHeader', () => {
  const base = {
    isLoadingAuth: false,
    isAdmin: false,
    pathname: '/',
    isPatient: false,
    isAuthenticated: true
  };

  it('is true for an authenticated patient', () => {
    expect(
      canShowResearchHeader({ ...base, isPatient: true, isAuthenticated: true })
    ).toBe(true);
  });

  it('is true for a guest', () => {
    expect(canShowResearchHeader({ ...base, isAuthenticated: false })).toBe(
      true
    );
  });

  it('is false for a practitioner', () => {
    expect(canShowResearchHeader(base)).toBe(false);
  });

  it('is false for a clinic admin', () => {
    expect(canShowResearchHeader({ ...base, isAdmin: true })).toBe(false);
  });

  it('is false on the /research page', () => {
    expect(
      canShowResearchHeader({
        ...base,
        isPatient: true,
        pathname: '/research'
      })
    ).toBe(false);
  });

  it('is false while auth is loading', () => {
    expect(canShowResearchHeader({ ...base, isLoadingAuth: true })).toBe(false);
  });
});
