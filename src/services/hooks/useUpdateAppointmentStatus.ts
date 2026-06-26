import { getAPI } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import type { Appointment } from 'fhir/r4';

interface UpdateStatusParams {
  id: string;
  status: string;
}

/**
 * Update the status of an appointment.
 *
 * Sends a PUT request to `/fhir/Appointment/{id}` with the new status.
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
      const response = await API.put<Appointment>(`/fhir/Appointment/${id}`, {
        status
      });
      return response.data;
    }
  });
}
