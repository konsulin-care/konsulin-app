import { useQuery } from '@tanstack/react-query';
import { API } from './api';

export const useFindAvailability = ({ practitionerRoleId, dateReference }) => {
  return useQuery({
    queryKey: ['find-availability', practitionerRoleId, dateReference],
    queryFn: () =>
      API.get(
        `/fhir/Slot?schedule.actor=PractitionerRole/${practitionerRoleId}&start=${dateReference}&_include=Slot:schedule`
      ),
    select: response => response.data.entry || null,
    enabled: !!dateReference && !!practitionerRoleId
  });
};
