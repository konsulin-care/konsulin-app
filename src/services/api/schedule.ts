import { useMutation } from '@tanstack/react-query';
import { Bundle, PractitionerRole } from 'fhir/r4';
import { getAPI } from '../api';

interface AvailableTime {
  daysOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  allDay?: boolean;
  availableStartTime?: string;
  availableEndTime?: string;
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
 * Update practitioner role availability using FHIR Bundle transaction
 * This ensures atomic updates across multiple PractitionerRole resources
 *
 * Each entry is a version-aware update: `request.ifMatch` carries the
 * `meta.versionId` read just before the transaction, so if any role changed in
 * between, the FHIR server rejects the whole transaction with
 * `412 Precondition Failed` instead of silently overwriting that change.
 */
export async function updatePractitionerRoleAvailabilityBundle(
  updates: Array<{
    practitionerRoleId: string;
    availableTime: AvailableTime[];
  }>
): Promise<Bundle> {
  const API = await getAPI();

  // Fetch all current PractitionerRole resources
  const rolePromises = updates.map(async update => {
    const getResponse = await API.get<PractitionerRole>(
      `/fhir/PractitionerRole/${update.practitionerRoleId}`
    );
    return {
      practitionerRoleId: update.practitionerRoleId,
      role: getResponse.data,
      availableTime: update.availableTime
    };
  });

  const roles = await Promise.all(rolePromises);

  // Build FHIR Bundle entries
  const bundleEntries = roles.map(
    ({ practitionerRoleId, role, availableTime }) => {
      const versionId = role.meta?.versionId;
      return {
        request: {
          method: 'PUT' as const,
          url: `PractitionerRole/${practitionerRoleId}`,
          // Only overwrite the version that was read. Without a versionId the
          // server has nothing to compare against, so the check is skipped.
          ...(versionId ? { ifMatch: `W/"${versionId}"` } : {})
        },
        resource: {
          ...role,
          // Keep parity with the single-resource PUT path: stamp period.start
          // with the browser's local timezone offset.
          period: { ...role.period, start: getLocalTimezoneISO() },
          availableTime
        }
      };
    }
  );

  // Create FHIR Bundle transaction
  const bundle: Bundle = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: bundleEntries
  };

  // Post bundle transaction to FHIR server
  const response = await API.post<Bundle>('/fhir', bundle, {
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

/**
 * Hook for updating practitioner role availability using FHIR Bundle
 * Provides atomic updates across multiple PractitionerRole resources
 */
export function useUpdateAvailabilityBundle() {
  return useMutation({
    mutationKey: ['update-availability-bundle'],
    mutationFn: (
      updates: Array<{
        practitionerRoleId: string;
        availableTime: AvailableTime[];
      }>
    ) => {
      return updatePractitionerRoleAvailabilityBundle(updates);
    }
  });
}
