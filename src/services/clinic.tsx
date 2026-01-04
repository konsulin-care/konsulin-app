import { useQuery } from '@tanstack/react-query';
import { BundleEntry, PractitionerRole } from 'fhir/r4';
import { useMemo } from 'react';
import { getAPI } from './api';

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
  { cityFilter, nameFilter }: { cityFilter?: string; nameFilter?: string },
  delay: number = 500
) => {
  const url = useMemo(() => {
    let url = '/fhir/Organization?_elements=name,address';

    if (cityFilter) {
      url += `&address-city:contains=${cityFilter}`;
    }

    if (nameFilter) {
      url += `&name:contains=${nameFilter}`;
    }

    return url;
  }, [cityFilter, nameFilter]);

  return useQuery({
    queryKey: ['list-clinics', cityFilter, nameFilter],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(url);
      return response;
    },
    select: response => response.data.entry || [],
    enabled: true
  });
};

export const useClinicById = (clinicId: string) => {
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['clinic', clinicId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        `/fhir/PractitionerRole?active=true&organization=${clinicId}&_include=PractitionerRole:organization&_include=PractitionerRole:practitioner`
      );
      return response;
    },
    select: response => response.data.entry || null,
    enabled: !!clinicId
  });

  let clinic: BundleEntry | undefined;
  let practitioners: BundleEntry[] = [];
  let practitionerRoles: BundleEntry[] = [];

  if (data) {
    clinic = data.find(
      (item: BundleEntry) => item.resource.resourceType === 'Organization'
    );
    practitioners = data.filter(
      (item: BundleEntry) => item.resource.resourceType === 'Practitioner'
    );
    practitionerRoles = data.filter(
      (item: BundleEntry) => item.resource.resourceType === 'PractitionerRole'
    );
  }

  const newPractitionerData = practitioners.map((item: BundleEntry) => {
    const practitionerId = item.resource.id;

    const practitionerRoleData = practitionerRoles.find(
      (item: BundleEntry<PractitionerRole>) =>
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
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        `/fhir/PractitionerRole?active=true&_id=${practitionerRoleId}&_include=PractitionerRole:organization&_include=PractitionerRole:practitioner&_revinclude=Invoice:participant&_revinclude=Schedule:actor`
      );
      return response;
    },
    select: response => response.data.entry || null,
    enabled: !!practitionerRoleId
  });

  let practitionerRole: BundleEntry | undefined;
  let organization: BundleEntry | undefined;
  let invoice: BundleEntry | undefined;
  let schedules: BundleEntry | undefined;
  let newData = undefined;

  if (data) {
    practitionerRole = data.find(
      (item: BundleEntry) => item.resource.resourceType === 'PractitionerRole'
    );
    organization = data.find(
      (item: BundleEntry) => item.resource.resourceType === 'Organization'
    );
    invoice = data.find(
      (item: BundleEntry) => item.resource.resourceType === 'Invoice'
    );
    schedules = data.find(
      (item: BundleEntry) => item.resource.resourceType === 'Schedule'
    );

    newData = {
      ...practitionerRole,
      invoice: invoice?.resource,
      organization: organization?.resource,
      schedule: schedules?.resource
    };
  }

  return {
    newData,
    isLoading,
    isError,
    isFetching
  };
};
