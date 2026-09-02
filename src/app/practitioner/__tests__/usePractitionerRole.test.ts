import { useDetailPractitioner } from '@/services/clinic-practitioners';
import { renderHook } from '@testing-library/react';
import type { PractitionerRole } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePractitionerRole } from '../hooks/usePractitionerRole';

vi.mock('@/services/clinic-practitioners', () => ({
  useDetailPractitioner: vi.fn()
}));

const mockRole = {
  id: 'role-1',
  practitioner: { reference: 'Practitioner/prac-1' },
  healthcareService: [
    { display: 'General Checkup' },
    { display: 'Dental Exam' }
  ],
  availableTime: [
    {
      daysOfWeek: ['mon'],
      availableStartTime: '09:00',
      availableEndTime: '17:00'
    }
  ],
  schedule: { id: 'schedule-1' },
  period: { start: '2026-01-01T00:00:00+07:00' }
} as unknown as PractitionerRole;

const mockDetail = {
  resource: {
    id: 'role-detail-1',
    availableTime: [
      {
        daysOfWeek: ['tue'],
        availableStartTime: '10:00',
        availableEndTime: '16:00'
      }
    ],
    period: { start: '2026-06-01T00:00:00Z' }
  },
  practitioner: {
    id: 'prac-detail-1',
    name: [{ given: ['John'] }],
    photo: [{ url: 'https://example.com/photo.jpg' }]
  },
  healthcareServices: [{ name: 'Specialist Consult' }],
  schedule: { id: 'schedule-detail-1' }
};

describe('usePractitionerRole', () => {
  beforeEach(() => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: undefined,
      isLoading: false,
      isError: false
    } as ReturnType<typeof useDetailPractitioner>);
  });

  it('returns drawer-mode data from props when isPageMode is false', () => {
    const { result } = renderHook(() =>
      usePractitionerRole(false, undefined, mockRole, 'schedule-1')
    );

    expect(result.current.practitionerId).toBe('prac-1');
    expect(result.current.practitionerGivenName).toBeUndefined();
    expect(result.current.practitionerDisplayName).toBeUndefined();
    expect(result.current.practitionerPhotoUrl).toBeUndefined();
    expect(result.current.healthcareServiceNames).toEqual([
      'General Checkup',
      'Dental Exam'
    ]);
    expect(result.current.effectiveRole).toEqual(mockRole);
    expect(result.current.effectiveScheduleId).toBe('schedule-1');
    expect(result.current.effectiveAvailableTime).toHaveLength(1);
  });

  it('returns page-mode data from useDetailPractitioner when isPageMode is true', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: mockDetail,
      isLoading: false,
      isError: false
    } as ReturnType<typeof useDetailPractitioner>);

    const { result } = renderHook(() =>
      usePractitionerRole(true, 'role-detail-1')
    );

    expect(useDetailPractitioner).toHaveBeenCalledWith('role-detail-1');
    expect(result.current.practitionerId).toBe('prac-detail-1');
    expect(result.current.practitionerGivenName).toBe('John');
    expect(result.current.practitionerDisplayName).toBe('John');
    expect(result.current.practitionerPhotoUrl).toBe(
      'https://example.com/photo.jpg'
    );
    expect(result.current.healthcareServiceNames).toEqual([
      'Specialist Consult'
    ]);
    expect(result.current.effectiveRole).toEqual(mockDetail.resource);
    expect(result.current.effectiveScheduleId).toBe('schedule-detail-1');
  });

  it('extracts timezone offset from role period', () => {
    const { result } = renderHook(() =>
      usePractitionerRole(false, undefined, mockRole, 'schedule-1')
    );

    expect(result.current.practitionerTzOffset).toBe('+07:00');
  });

  it('defaults timezone to Z when no period is set', () => {
    const roleNoPeriod = {} as PractitionerRole;
    const { result } = renderHook(() =>
      usePractitionerRole(false, undefined, roleNoPeriod, 'schedule-1')
    );

    expect(result.current.practitionerTzOffset).toBe('Z');
  });

  it('returns empty practitionerId in page mode when detail is undefined', () => {
    const { result } = renderHook(() =>
      usePractitionerRole(true, 'missing-id')
    );

    expect(result.current.practitionerId).toBe('');
    expect(result.current.healthcareServiceNames).toEqual([]);
    expect(result.current.practitionerDisplayName).toBeUndefined();
    expect(result.current.practitionerPhotoUrl).toBeUndefined();
  });
});
