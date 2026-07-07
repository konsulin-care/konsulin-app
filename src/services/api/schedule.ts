import {
  MarkUnavailabilityRequest,
  MarkUnavailabilityResponse,
  MarkUnavailabilityResult
} from '@/types/schedule';
import { useMutation } from '@tanstack/react-query';
import { PractitionerRole, Schedule } from 'fhir/r4';
import { getAPI } from '../api';

interface AvailableTime {
  daysOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  allDay?: boolean;
  availableStartTime?: string;
  availableEndTime?: string;
}

/**
 *
 */
export async function postMarkUnavailability(
  payload: MarkUnavailabilityRequest
): Promise<MarkUnavailabilityResult> {
  const API = await getAPI();
  const res = await API.post('/api/v1/schedule/unavailable', payload, {
    validateStatus: s => [200, 201, 409].includes(s)
  });
  return { data: res.data as MarkUnavailabilityResponse, status: res.status };
}

/**
 *
 */
export function useMarkUnavailability() {
  return useMutation({
    mutationKey: ['schedule-unavailable'],
    mutationFn: postMarkUnavailability
  });
}

/**
 *
 */
export async function updateSchedule(payload: Schedule): Promise<Schedule> {
  if (!payload?.id) {
    throw new Error('Schedule id is required');
  }
  const API = await getAPI();
  const res = await API.put<Schedule>(`/fhir/Schedule/${payload.id}`, payload);
  return res.data;
}

/**
 * Compute an ISO 8601 datetime string with the browser's local timezone offset.
 * e.g. "2026-07-03T17:30:00+07:00"
 */
function getLocalTimezoneISO(): string {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  /** Pad a number with leading zero to 2 digits. */
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const tzHours = pad(offset / 60);
  const tzMinutes = pad(offset % 60);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${sign}${tzHours}:${tzMinutes}`;
}

/**
 * Update practitioner role availability
 */
export async function updatePractitionerRoleAvailability(
  practitionerRoleId: string,
  availableTime: AvailableTime[]
): Promise<PractitionerRole> {
  const API = await getAPI();

  // First, fetch the current PractitionerRole
  const getResponse = await API.get<PractitionerRole>(
    `/fhir/PractitionerRole/${practitionerRoleId}`
  );
  const currentRole = getResponse.data;

  // Update the availableTime and include period.start with browser timezone
  const updatedRole: PractitionerRole = {
    ...currentRole,
    period: { ...currentRole.period, start: getLocalTimezoneISO() },
    availableTime
  };

  // Put the updated role
  const response = await API.put<PractitionerRole>(
    `/fhir/PractitionerRole/${practitionerRoleId}`,
    updatedRole
  );

  return response.data;
}

/**
 * Hook for updating practitioner role availability
 */
export function useUpdateAvailability() {
  return useMutation({
    mutationKey: ['update-availability'],
    mutationFn: ({
      practitionerRoleId,
      availableTime
    }: {
      practitionerRoleId: string;
      availableTime: AvailableTime[];
    }) => {
      return updatePractitionerRoleAvailability(
        practitionerRoleId,
        availableTime
      );
    }
  });
}
