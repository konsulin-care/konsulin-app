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
  availableTime: AvailableTime[]
): Promise<PractitionerRole> {
  const API = await getAPI();

  // First, fetch the current PractitionerRole
  const getResponse = await API.get(
    `/fhir/PractitionerRole/${practitionerRoleId}`
  );
  const currentRole = getResponse.data as PractitionerRole;

  // Update the availableTime
  const updatedRole: PractitionerRole = {
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
 * Update practitioner role availability using FHIR Bundle transaction
 * This ensures atomic updates across multiple PractitionerRole resources
 */
export async function updatePractitionerRoleAvailabilityBundle(
  updates: Array<{
    practitionerRoleId: string;
    availableTime: AvailableTime[];
  }>
): Promise<any> {
  const API = await getAPI();

  // Fetch all current PractitionerRole resources
  const rolePromises = updates.map(async update => {
    const getResponse = await API.get(
      `/fhir/PractitionerRole/${update.practitionerRoleId}`
    );
    return {
      role: getResponse.data as PractitionerRole,
      availableTime: update.availableTime
    };
  });

  const roles = await Promise.all(rolePromises);

  // Build FHIR Bundle entries
  const bundleEntries = roles.map(({ role, availableTime }) => ({
    request: {
      method: 'PUT',
      url: `PractitionerRole/${role.id}`
    },
    resource: {
      ...role,
      availableTime
    }
  }));

  // Create FHIR Bundle transaction
  const bundle = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: bundleEntries
  };

  // Post bundle transaction to FHIR server
  const response = await API.post('/fhir', bundle, {
    headers: {
      'Content-Type': 'application/fhir+json'
    }
  });

  return response.data;
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
      availableTime: AvailableTime[];
    }) => {
      return updatePractitionerRoleAvailability(
        practitionerRoleId,
        availableTime
      );
    }
  });
}

/**
 * Hook for updating practitioner role availability using FHIR Bundle
 * Provides atomic updates across multiple PractitionerRole resources
 */
export function useUpdateAvailabilityBundle() {
  return useMutation({
    mutationKey: ['update-availability-bundle'],
    mutationFn: async (
      updates: Array<{
        practitionerRoleId: string;
        availableTime: AvailableTime[];
      }>
    ) => {
      return updatePractitionerRoleAvailabilityBundle(updates);
    }
  });
}
