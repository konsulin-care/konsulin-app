import { useQuery } from '@tanstack/react-query';
import { API } from './api';

// NOTE: hardcoded practitionerRoleId
export const useFindAvailability = ({ practitionerRoleId, dateReference }) => {
  return useQuery({
    queryKey: ['find-availability', practitionerRoleId, dateReference],
    queryFn: () =>
      API.get(
        `/fhir/Slot?schedule.actor=PractitionerRole/PractitionerRole-id&start=${dateReference}&_include=Slot:schedule`
      ),
    select: response => response.data.entry || null,
    enabled: !!dateReference && !!practitionerRoleId
  });
};
