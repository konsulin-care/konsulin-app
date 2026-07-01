import { getAPI } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import type { Appointment } from 'fhir/r4';

interface UpdateStatusParams {
  id: string;
  status: Appointment['status'];
}

/**
 * Update the status of an appointment.
 *
 * Uses fetch-merge-PUT to comply with FHIR full-replacement semantics:
 * 1. GET the current Appointment resource
 * 2. Set the new status
 * 3. PUT the full resource back
 *
 * Supports all FHIR appointment statuses:
 * proposed | pending | booked | arrived | fulfilled | cancelled | noshow |
 * entered-in-error | checked-in | waitlist
 *
 * @returns Mutation result for updating appointment status
 */
export function useUpdateAppointmentStatus() {
  return useMutation({
    mutationKey: ['update-appointment-status'],
    mutationFn: async ({ id, status }: UpdateStatusParams) => {
      const API = await getAPI();

      // Fetch current appointment first (full-resource PUT semantics)
      const getResponse = await API.get<Appointment>(`/fhir/Appointment/${id}`);
      const current = getResponse.data;

      // Merge status into the full resource, preserving all other fields
      const updated: Appointment = { ...current, status };

      const response = await API.put<Appointment>(
        `/fhir/Appointment/${id}`,
        updated
      );
      return response.data;
    }
  });
}
