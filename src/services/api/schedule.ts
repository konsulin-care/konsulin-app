import {
  MarkUnavailabilityRequest,
  MarkUnavailabilityResponse,
  MarkUnavailabilityResult
} from '@/types/schedule';
import { useMutation } from '@tanstack/react-query';
import { PractitionerRole, Schedule } from 'fhir/r4';
import { getAPI } from '../api';

export async function postMarkUnavailability(
  payload: MarkUnavailabilityRequest
): Promise<MarkUnavailabilityResult> {
  const API = await getAPI();
  const res = await API.post('/api/v1/schedule/unavailable', payload, {
    validateStatus: s => [200, 201, 409].includes(s)
  });
  return { data: res.data as MarkUnavailabilityResponse, status: res.status };
}

export function useMarkUnavailability() {
  return useMutation({
    mutationKey: ['schedule-unavailable'],
    mutationFn: postMarkUnavailability
  });
}

export async function updateSchedule(payload: Schedule): Promise<Schedule> {
  if (!payload?.id) {
    throw new Error('Schedule id is required');
  }
  const API = await getAPI();
  const res = await API.put(`/fhir/Schedule/${payload.id}`, payload);
  return res.data as Schedule;
}

/**
 * Update practitioner role availability
 */
export async function updatePractitionerRoleAvailability(
  practitionerRoleId: string,
  availableTime: any[]
): Promise<PractitionerRole> {
  const API = await getAPI();

  // First, fetch the current PractitionerRole
  const getResponse = await API.get(
    `/fhir/PractitionerRole/${practitionerRoleId}`
  );
  const currentRole = getResponse.data as PractitionerRole;

  // Update the availableTime
  const updatedRole = {
    ...currentRole,
    availableTime
  };

  // Put the updated role
  const response = await API.put(
    `/fhir/PractitionerRole/${practitionerRoleId}`,
    updatedRole
  );

  return response.data as PractitionerRole;
}

/**
 * Hook for updating practitioner role availability
 */
export function useUpdateAvailability() {
  return useMutation({
    mutationKey: ['update-availability'],
    mutationFn: async ({
      practitionerRoleId,
      availableTime
    }: {
      practitionerRoleId: string;
      availableTime: any[];
    }) => {
      return updatePractitionerRoleAvailability(
        practitionerRoleId,
        availableTime
      );
    }
  });
}
