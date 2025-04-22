import { IOrganizationEntry, IPractitionerRole } from '@/types/organization';
import { useQuery } from '@tanstack/react-query';
import { API } from './api';

export type IUseClinicParams = {
  page?: number;
  pageSize?: number;
  start_date?: Date;
  end_date?: Date;
  start_time?: string;
  end_time?: string;
  location?: string;
  days?: String[];
};

export const useListClinics = () => {
  return useQuery({
    queryKey: ['list-clinics'],
    queryFn: () => API.get('/fhir/Organization?_elements=name,address'),
    select: response => response.data.entry || null
  });
};

export const useClinicById = (clinicId: string) => {
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['clinic', clinicId],
    queryFn: () =>
      API.get(
        `/fhir/PractitionerRole?active=true&organization=${clinicId}&_include=PractitionerRole:organization&_include=PractitionerRole:practitioner`
      ),
    select: response => response.data.entry || null,
    enabled: !!clinicId
  });

  let clinic: IOrganizationEntry | undefined;
  let practitioners: IOrganizationEntry[] = [];
  let practitionerRoles: IOrganizationEntry[] = [];

  if (data) {
    clinic = data.find(
      (item: IOrganizationEntry) =>
        item.resource.resourceType === 'Organization'
    );
    practitioners = data.filter(
      (item: IOrganizationEntry) =>
        item.resource.resourceType === 'Practitioner'
    );
    practitionerRoles = data.filter(
      (item: IOrganizationEntry) =>
        item.resource.resourceType === 'PractitionerRole'
    );
  }

  const newPractitionerData = practitioners.map((item: IOrganizationEntry) => {
    const practitionerId = item.resource.id;

    const practitionerRoleData = practitionerRoles.find(
      (item: IOrganizationEntry & { resource: IPractitionerRole }) =>
        item.resource.practitioner.reference.split('/')[1] === practitionerId
    );

    return {
      ...item.resource,
      practitionerRole: practitionerRoleData.resource
    };
  });

  return {
    clinic,
    newPractitionerData,
    isLoading,
    isFetching,
    isError
  };
};

export const useDetailPractitioner = (practitionerRoleId: string) => {
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['practitioner-detail', practitionerRoleId],
    queryFn: () =>
      API.get(
        `/fhir/PractitionerRole?active=true&_id=${practitionerRoleId}&_include=PractitionerRole:organization&_incude=PractitionerRole:practitioner&_revinclude=Invoice:participant`
      ),
    select: response => response.data.entry || null,
    enabled: !!practitionerRoleId
  });

  let practitionerRole: IOrganizationEntry | undefined;
  let organization: IOrganizationEntry | undefined;
  let invoice: IOrganizationEntry | undefined;
  let newData = undefined;

  if (data) {
    practitionerRole = data.find(
      (item: IOrganizationEntry) =>
        item.resource.resourceType === 'PractitionerRole'
    );
    organization = data.find(
      (item: IOrganizationEntry) =>
        item.resource.resourceType === 'Organization'
    );
    invoice = data.find(
      (item: IOrganizationEntry) => item.resource.resourceType === 'Invoice'
    );

    newData = {
      ...practitionerRole,
      invoice: invoice?.resource,
      organization: organization?.resource
    };
  }

  return {
    newData,
    isLoading,
    isError,
    isFetching
  };
};
