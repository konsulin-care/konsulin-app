import { IOrganizationEntry, IPractitionerRole } from '@/types/organization';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { API } from './api';

export type IUseClinicParams = {
  page?: number;
  pageSize?: number;
  start_date?: Date;
  end_date?: Date;
  start_time?: string;
  end_time?: string;
  city?: string;
  province_code?: string;
  // days?: String[];
};

export const useListClinics = (
  { searchTerm, cityFilter }: { searchTerm?: string; cityFilter?: string },
  delay: number = 500
) => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] =
    useState<string>(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, delay]);

  const url = useMemo(() => {
    let url = '/fhir/Organization?_elements=name,address';

    if (debouncedSearchTerm) {
      url += `&name:contains=${debouncedSearchTerm}`;
    }

    if (cityFilter) {
      url += `&address-city:contains=${cityFilter}`;
    }

    return url;
  }, [debouncedSearchTerm, cityFilter]);

  return useQuery({
    queryKey: ['list-clinics', url],
    queryFn: () => API.get(url),
    select: response => response.data.entry || []
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
