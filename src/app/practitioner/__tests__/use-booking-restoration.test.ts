import { clearIntent, getIntent } from '@/utils/redirect-intent';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBookingRestoration } from '../hooks/use-booking-restoration';

vi.mock('@/utils/redirect-intent', () => ({
  getIntent: vi.fn(),
  clearIntent: vi.fn()
}));

const mockPayload = {
  path: '/practitioner?id=role-123',
  slot: {
    date: '2026-07-10',
    startTime: '09:00',
    slotId: 'slot-456'
  },
  formData: {
    session_type: 'offline',
    problem_brief: 'Test issue'
  }
};

const onRestoreMock = vi.fn();
const onLoadTempMock = vi.fn();

describe('useBookingRestoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('does nothing in page mode', () => {
    renderHook(() =>
      useBookingRestoration({
        isPageMode: true,
        isOpenParam: 'true',
        practitionerRoleId: 'role-123',
        authUserId: 'user-1',
        onRestoreAppointment: onRestoreMock
      })
    );

    expect(onRestoreMock).not.toHaveBeenCalled();
    expect(onLoadTempMock).not.toHaveBeenCalled();
  });

  it('does nothing when isOpenParam is not true', () => {
    renderHook(() =>
      useBookingRestoration({
        isPageMode: false,
        isOpenParam: null,
        practitionerRoleId: 'role-123',
        authUserId: 'user-1',
        onRestoreAppointment: onRestoreMock
      })
    );

    expect(onRestoreMock).not.toHaveBeenCalled();
  });

  it('restores booking from redirect intent when available', () => {
    vi.mocked(getIntent).mockReturnValue({
      kind: 'appointment',
      createdAt: Date.now(),
      payload: mockPayload
    });

    renderHook(() =>
      useBookingRestoration({
        isPageMode: false,
        isOpenParam: 'true',
        practitionerRoleId: 'role-123',
        authUserId: 'user-1',
        onRestoreAppointment: onRestoreMock
      })
    );

    expect(onRestoreMock).toHaveBeenCalledWith(mockPayload);
    expect(clearIntent).toHaveBeenCalled();
  });

  it('restores booking from session storage when no intent', () => {
    vi.mocked(getIntent).mockReturnValue(null);
    sessionStorage.setItem('pending_booking', JSON.stringify(mockPayload));

    renderHook(() =>
      useBookingRestoration({
        isPageMode: false,
        isOpenParam: 'true',
        practitionerRoleId: 'role-123',
        authUserId: 'user-1',
        onRestoreAppointment: onRestoreMock
      })
    );

    expect(onRestoreMock).toHaveBeenCalled();
    expect(sessionStorage.getItem('pending_booking')).toBeNull();
  });

  it('does not restore when practitioner route does not match', () => {
    vi.mocked(getIntent).mockReturnValue(null);
    sessionStorage.setItem(
      'pending_booking',
      JSON.stringify({
        ...mockPayload,
        path: '/practitioner?id=other-role'
      })
    );

    renderHook(() =>
      useBookingRestoration({
        isPageMode: false,
        isOpenParam: 'true',
        practitionerRoleId: 'role-123',
        authUserId: 'user-1',
        onRestoreAppointment: onRestoreMock
      })
    );

    expect(onRestoreMock).not.toHaveBeenCalled();
  });

  it('falls back to IndexedDB when intent and session are empty', () => {
    vi.mocked(getIntent).mockReturnValue(null);

    renderHook(() =>
      useBookingRestoration({
        isPageMode: false,
        isOpenParam: 'true',
        practitionerRoleId: 'role-123',
        authUserId: 'user-1',
        onRestoreAppointment: onRestoreMock,
        onLoadTempBooking: onLoadTempMock
      })
    );

    expect(onRestoreMock).not.toHaveBeenCalled();
    expect(onLoadTempMock).toHaveBeenCalledWith('user-1');
  });

  it('skips IndexedDB fallback when authUserId is missing', () => {
    vi.mocked(getIntent).mockReturnValue(null);

    renderHook(() =>
      useBookingRestoration({
        isPageMode: false,
        isOpenParam: 'true',
        practitionerRoleId: 'role-123',
        authUserId: undefined,
        onRestoreAppointment: onRestoreMock,
        onLoadTempBooking: onLoadTempMock
      })
    );

    expect(onLoadTempMock).not.toHaveBeenCalled();
  });
});
