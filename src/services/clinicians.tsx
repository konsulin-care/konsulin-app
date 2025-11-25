import { IPractitionerRoleDetail } from '@/types/practitioner';
import { getUtcDayRange } from '@/utils/helper';
import { useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosResponse } from 'axios';
import {
  BundleEntry,
  Invoice,
  Organization,
  PractitionerRole,
  Schedule
} from 'fhir/r4';
import { getAPI } from './api';

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
      const geParam = encodeURIComponent(ge as string);
      const leParam = encodeURIComponent(le as string);
      const response = await API.get(
        `/fhir/Slot?schedule.actor=PractitionerRole/${practitionerRoleId}&start=ge${geParam}&start=le${leParam}&_include=Slot:schedule`
      );
      return response;
    },
    select: response => response.data.entry || null,
    enabled: !!practitionerRoleId && !!ge && !!le,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

export const useGetPractitionerRolesDetail = (
  practitionerId: string,
  queryOptions?: UseQueryOptions<
    AxiosResponse,
    Error,
    BundleEntry<IPractitionerRoleDetail>[]
  >
) => {
  return useQuery({
    queryKey: ['practitioner-roles', practitionerId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        `/fhir/PractitionerRole?practitioner=${practitionerId}&_include=PractitionerRole:organization&_include=PractitionerRole:practitioner&_revinclude=Invoice:participant&_revinclude=Schedule:actor`
      );
      return response;
    },
    select: response => {
      const entries = response.data.entry || [];

      const practitionerRoles = entries.filter(
        (entry: BundleEntry) =>
          entry.resource.resourceType === 'PractitionerRole'
      );

      const organizations = entries.filter(
        (entry: BundleEntry) => entry.resource.resourceType === 'Organization'
      );

      const schedules = entries.filter(
        (entry: BundleEntry) => entry.resource.resourceType === 'Schedule'
      );

      const invoices = entries.filter(
        (entry: BundleEntry) => entry.resource.resourceType === 'Invoice'
      );

      // map PractitionerRole entries
      return practitionerRoles.map((role: BundleEntry<PractitionerRole>) => {
        const roleId = role.resource.id;
        const orgRef = role.resource.organization?.reference?.split('/')[1];

        const organizationData = organizations.find(
          (org: BundleEntry<Organization>) => org.resource.id === orgRef
        )?.resource;

        const invoiceData = invoices.find((invoice: BundleEntry<Invoice>) =>
          invoice.resource.participant?.some(
            p => p.actor?.reference === `PractitionerRole/${roleId}`
          )
        )?.resource;

        const scheduleData = schedules
          .filter((schedule: BundleEntry<Schedule>) =>
            schedule.resource.actor?.some(
              actor => actor.reference === `PractitionerRole/${roleId}`
            )
          )
          .map((schedule: BundleEntry<Schedule>) => schedule.resource);

        return {
          ...role,
          resource: {
            ...role.resource,
            organizationData,
            invoiceData,
            scheduleData
          }
        };
      });
    },
    enabled: !!practitionerId,
    ...queryOptions
  });
};

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
        return response.data;
      } catch (error) {
        console.error('Error when updating practitioner information :', error);
        throw error;
      }
    }
  });
};

export const useCreateInvoice = () => {
  return useMutation({
    mutationKey: ['create-invoice'],
    mutationFn: async (payload: Invoice) => {
      const API = await getAPI();
      try {
        const response = await API.post(`/fhir/Invoice`, payload);
        return response.data;
      } catch (error) {
        console.error('Error when creating invoice :', error);
        throw error;
      }
    }
  });
};

export const useUpdateInvoice = () => {
  return useMutation({
    mutationKey: ['update-invoice'],
    mutationFn: async (payload: Invoice) => {
      const API = await getAPI();
      try {
        const response = await API.put(`/fhir/Invoice/${payload.id}`, payload);
        return response.data;
      } catch (error) {
        console.error('Error when updating invoice :', error);
        throw error;
      }
    }
  });
};
