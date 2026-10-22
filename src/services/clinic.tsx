import { useQuery } from '@tanstack/react-query';
import { Bundle, BundleEntry, Organization, PractitionerRole } from 'fhir/r4';
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
  organization?: string;
  province?: string;
  // days?: String[];
};

/** List clinics with optional city/name filters. */
export const useListClinics = ({
  cityFilter,
  nameFilter
}: {
  cityFilter?: string;
  nameFilter?: string;
}) => {
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
      const response = await API.get<Bundle<Organization>>(url);
      return response;
    },
    select: response => response.data.entry ?? [],
    // Always run to get base clinic list, but only fetch when filters are meaningful
    enabled: true
  });
};

/** Fetch clinic details by FHIR Organization ID. */
export const useClinicById = (clinicId: string) => {
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['clinic', clinicId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/PractitionerRole?active=true&organization=${clinicId}&_include=PractitionerRole:organization&_include=PractitionerRole:practitioner`
      );
      return response;
    },
    select: response => response.data.entry ?? null,
    enabled: Boolean(clinicId)
  });

  let clinic: BundleEntry | undefined;
  let practitioners: BundleEntry[] = [];
  let practitionerRoles: BundleEntry[] = [];

  if (data) {
    clinic = data.find(
      (item: BundleEntry) => item.resource?.resourceType === 'Organization'
    );
    practitioners = data.filter(
      (item: BundleEntry) => item.resource?.resourceType === 'Practitioner'
    );
    practitionerRoles = data.filter(
      (item: BundleEntry) => item.resource?.resourceType === 'PractitionerRole'
    );
  }

  const newPractitionerData = practitioners.map((item: BundleEntry) => {
    const practitionerId = item.resource.id;

    const practitionerRoleData = (
      practitionerRoles as BundleEntry<PractitionerRole>[]
    ).find(
      item =>
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
