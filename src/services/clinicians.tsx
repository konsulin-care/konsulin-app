import { IPractitionerRoleDetail } from '@/types/practitioner';
import { getUtcDayRange } from '@/utils/helper';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosResponse } from 'axios';

import {
  Bundle,
  BundleEntry,
  Invoice,
  Organization,
  PractitionerRole,
  Schedule
} from 'fhir/r4';
import { getAPI } from './api';

/** Check if an invoice has a participant matching the given role. */
function hasParticipantForRole(
  invoice: BundleEntry<Invoice>,
  roleId: string
): boolean {
  return (
    invoice.resource?.participant?.some(
      p => p.actor?.reference === `PractitionerRole/${roleId}`
    ) ?? false
  );
}

/** Check if a schedule has an actor matching the given role. */
function hasActorForRole(
  schedule: BundleEntry<Schedule>,
  roleId: string
): boolean {
  return (
    schedule.resource?.actor?.some(
      actor => actor.reference === `PractitionerRole/${roleId}`
    ) ?? false
  );
}

/** Fetch practitioner availability for a given date range. */
export const useFindAvailability = ({
  practitionerRoleId,
  dateReference,
  startFrom,
  startTo,
  dayKey
}: {
  practitionerRoleId: string;
  dateReference?: string | Date | null;
  startFrom?: string; // ISO string boundary with offset, e.g., 2025-10-13T00:00:00+07:00
  startTo?: string; // ISO string boundary with offset, e.g., 2025-10-13T23:59:59+07:00
  dayKey?: string; // cache scoping key for day-level caching (e.g., YYYY-MM-DD+offset)
}) => {
  const computed = dateReference
    ? getUtcDayRange(new Date(dateReference))
    : null;
  const utcStart = computed?.utcStart;
  const utcEnd = computed?.utcEnd;

  const ge = startFrom || utcStart;
  const le = startTo || utcEnd;

  return useQuery({
    queryKey: [
      'find-availability',
      practitionerRoleId,
      dayKey || dateReference || ge
    ],
    queryFn: async () => {
      const API = await getAPI();
      // Encode datetimes so '+' in timezone is not interpreted as space
      const geParam = encodeURIComponent(ge);
      const leParam = encodeURIComponent(le);
      const response = await API.get<Bundle>(
        `/fhir/Slot?schedule.actor=PractitionerRole/${practitionerRoleId}&start=ge${geParam}&start=le${leParam}&_include=Slot:schedule`
      );
      return response;
    },
    select: response => response.data.entry ?? null,
    enabled: Boolean(practitionerRoleId) && Boolean(ge) && Boolean(le),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

/** Fetch detail for all roles belonging to a practitioner. */
export const useGetPractitionerRolesDetail = (
  practitionerId: string,
  onSuccess?: (data: BundleEntry<IPractitionerRoleDetail>[]) => void
) => {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  return useQuery<
    AxiosResponse,
    Error,
    BundleEntry<IPractitionerRoleDetail>[],
    [string, string]
  >(
    ['practitioner-roles', practitionerId],
    async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/PractitionerRole?practitioner=${practitionerId}&_include=PractitionerRole:organization&_include=PractitionerRole:practitioner&_revinclude=Invoice:participant&_revinclude=Schedule:actor`
      );
      return response;
    },
    {
      select: response => {
        const entries = (response.data as Bundle).entry || [];

        const practitionerRoles = entries.filter(
          (entry: BundleEntry) =>
            entry.resource?.resourceType === 'PractitionerRole'
        );

        const organizations = entries.filter(
          (entry: BundleEntry) =>
            entry.resource?.resourceType === 'Organization'
        );

        const schedules = entries.filter(
          (entry: BundleEntry) => entry.resource?.resourceType === 'Schedule'
        );

        const invoices = entries.filter(
          (entry: BundleEntry) => entry.resource?.resourceType === 'Invoice'
        );

        // map PractitionerRole entries
        return practitionerRoles.map((role: BundleEntry<PractitionerRole>) => {
          const roleId = role.resource.id;
          const orgRef = role.resource.organization?.reference?.split('/')[1];

          const organizationData = organizations.find(
            (org: BundleEntry<Organization>) => org.resource.id === orgRef
          )?.resource;

          const invoiceData = invoices.find((invoice: BundleEntry<Invoice>) =>
            hasParticipantForRole(invoice, roleId)
          )?.resource;

          const scheduleData = schedules
            .filter((schedule: BundleEntry<Schedule>) =>
              hasActorForRole(schedule, roleId)
            )
            .map((schedule: BundleEntry<Schedule>) => schedule.resource);

          const result = {
            ...role,
            resource: {
              ...role.resource,
              organizationData,
              invoiceData,
              scheduleData
            }
          };
          return result as unknown as BundleEntry<IPractitionerRoleDetail>;
        });
      },
      enabled: Boolean(practitionerId),
      onSuccess
    }
  );
};

/** Mutation hook to update practitioner role info via PATCH. */
export const useUpdatePractitionerInfo = () => {
  return useMutation({
    mutationKey: ['update-practitioner-role'],
    mutationFn: async (payload: PractitionerRole) => {
      const API = await getAPI();
      try {
        const response = await API.put(
          `/fhir/PractitionerRole/${payload.id}`,
          payload
        );
        return response.data; // eslint-disable-line @typescript-eslint/no-unsafe-return
      } catch (error) {
        console.error('Error when updating practitioner information :', error);
        throw error;
      }
    }
  });
};

/** Mutation hook to create a new invoice for a practitioner role. */
export const useCreateInvoice = () => {
  return useMutation({
    mutationKey: ['create-invoice'],
    mutationFn: async (payload: Invoice) => {
      const API = await getAPI();
      try {
        const response = await API.post<Invoice>('/fhir/Invoice', payload);
        return response.data;
      } catch (error) {
        console.error('Error when creating invoice :', error);
        throw error;
      }
    }
  });
};

/** Mutation hook to update an existing invoice for a practitioner role. */
export const useUpdateInvoice = () => {
  return useMutation({
    mutationKey: ['update-invoice'],
    mutationFn: async (payload: Invoice) => {
      const API = await getAPI();
      try {
        const response = await API.put<Invoice>(
          `/fhir/Invoice/${payload.id}`,
          payload
        );
        return response.data;
      } catch (error) {
        console.error('Error when updating invoice :', error);
        throw error;
      }
    }
  });
};

export {
  computeFreeSlots,
  usePractitionerSlots,
  useBusySlotsByPractitioner
} from './slots';
