import { getAPI } from '@/services/api';
import type { MergedAppointment } from '@/types/appointment';
import { parseMergedAppointments } from '@/utils/helper';
import { useQuery } from '@tanstack/react-query';
import type { Bundle } from 'fhir/r4';

/**
 * Fetch a single appointment by ID with included practitioner/role/slot data.
 *
 * @param appointmentId - FHIR Appointment ID
 * @returns Query result with parsed MergedAppointment or null
 */
export function useAppointment(appointmentId: string) {
  return useQuery<Bundle, Error, MergedAppointment | null>({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const API = await getAPI();
      const params = [
        `_id=${appointmentId}`,
        '_include=Appointment:slot',
        '_include=Appointment:actor:PractitionerRole',
        '_include:iterate=PractitionerRole:practitioner'
      ];
      const url = `/fhir/Appointment?${params.join('&')}`;
      const response = await API.get<Bundle>(url);
      return response.data;
    },
    select: data => {
      const parsed = parseMergedAppointments(data);
      return parsed.length > 0 ? parsed[0] : null;
    },
    enabled: Boolean(appointmentId)
  });
}
