import { IPractitionerRoleDetail } from '@/types/practitioner';
import { useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosResponse } from 'axios';
import {
  BundleEntry,
  Invoice,
  Organization,
  PractitionerRole,
  Schedule
} from 'fhir/r4';
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
    queryFn: () =>
      API.get(
        `/fhir/PractitionerRole?practitioner=${practitionerId}&_include=PractitionerRole:organization&_incude=PractitionerRole:practitioner&_revinclude=Invoice:participant&_revinclude=Schedule:actor`
      ),
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
