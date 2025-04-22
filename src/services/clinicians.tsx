import { useQuery } from '@tanstack/react-query';
import { API } from './api';

// NOTE: hardcoded dateReference
export const useFindAvailability = ({ practitionerRoleId, dateReference }) => {
  return useQuery({
    queryKey: ['find-availability', practitionerRoleId, dateReference],
    queryFn: () =>
      API.get(
        `/fhir/Slot?schedule.actor=PractitionerRole/${practitionerRoleId}&start=2025-03-24&_include=Slot:schedule`
      ),
    select: response => response.data.entry || null
  });
};
