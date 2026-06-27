import { useQuery } from '@tanstack/react-query';
import {
  Bundle,
  BundleEntry,
  HealthcareService,
  Invoice,
  Organization,
  Practitioner,
  PractitionerRole,
  Schedule
} from 'fhir/r4';
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

export type DetailPractitionerData = Omit<BundleEntry, 'resource'> & {
  resource: PractitionerRole;
  invoice?: Invoice;
  organization?: Organization;
  schedule?: Schedule;
};

/** Fetch practitioner detail including schedule, invoice, and organization. */
export const useDetailPractitioner = (practitionerRoleId: string) => {
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['practitioner-detail', practitionerRoleId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/PractitionerRole?active=true&_id=${practitionerRoleId}&_include=PractitionerRole:organization&_include=PractitionerRole:practitioner&_revinclude=Invoice:participant&_revinclude=Schedule:actor`
      );
      return response;
    },
    select: response => response.data.entry ?? null,
    enabled: Boolean(practitionerRoleId)
  });

  let practitionerRole: BundleEntry | undefined;
  let organization: BundleEntry | undefined;
  let invoice: BundleEntry | undefined;
  let schedules: BundleEntry | undefined;
  let newData: DetailPractitionerData | undefined;

  if (data) {
    practitionerRole = data.find(
      (item: BundleEntry) => item.resource?.resourceType === 'PractitionerRole'
    );
    organization = data.find(
      (item: BundleEntry) => item.resource?.resourceType === 'Organization'
    );
    invoice = data.find(
      (item: BundleEntry) => item.resource?.resourceType === 'Invoice'
    );
    schedules = data.find(
      (item: BundleEntry) => item.resource?.resourceType === 'Schedule'
    );

    newData = {
      ...practitionerRole,
      invoice: invoice?.resource as Invoice | undefined,
      organization: organization?.resource as Organization | undefined,
      schedule: schedules?.resource as Schedule | undefined
    } as DetailPractitionerData;
  }

  return {
    newData,
    isLoading,
    isError,
    isFetching
  };
};

/**
 * Return type for usePractitionerListing.
 */
export type PractitionerListingEntry = {
  id: string;
  practitionerName: string;
  photoUrl: string | undefined;
  specialties: string[];
  healthcareServiceNames: string[];
  practitionerRoleId: string;
};

/**
 * Fetch HealthcareService resources linked to a practitioner role.
 *
 * Uses the `_include=PractitionerRole:service` search parameter to return
 * the HealthcareService entries referenced by the PractitionerRole.
 *
 * @param practitionerRoleId - PractitionerRole FHIR ID
 * @returns Query result with HealthcareService[] data
 */
export function usePractitionerRoleHealthcareServices(
  practitionerRoleId: string
) {
  return useQuery({
    queryKey: ['practitioner-healthcare-services', practitionerRoleId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/PractitionerRole?_id=${practitionerRoleId}&_include=PractitionerRole:service`
      );
      const entries = response.data.entry ?? [];
      return entries
        .filter(
          (e: BundleEntry) => e.resource?.resourceType === 'HealthcareService'
        )
        .map((e: BundleEntry) => e.resource as HealthcareService);
    },
    enabled: Boolean(practitionerRoleId)
  });
}

/**
 * Hook to fetch practitioners for a clinic, with healthcare service names.
 * Uses location filter when locationId is provided, otherwise falls back to
 * organization filter.
 *
 * @param clinicId - FHIR Organization ID
 * @param locationId - Optional FHIR Location ID for location-scoped query
 */
export function usePractitionerListing(clinicId: string, locationId?: string) {
  const url = useMemo(() => {
    const filter = locationId
      ? `location=Location/${locationId}`
      : `organization=${clinicId}`;

    return (
      `/fhir/PractitionerRole?active=true&${filter}` +
      '&_include=PractitionerRole:practitioner' +
      '&_include=PractitionerRole:service'
    );
  }, [clinicId, locationId]);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['practitioner-listing', clinicId, locationId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(url);
      return response;
    },
    select: response => response.data.entry ?? null,
    enabled: Boolean(clinicId)
  });

  const practitioners = useMemo(() => {
    if (!data) return [];

    const practitionerRoles = data.filter(
      (item: BundleEntry) => item.resource?.resourceType === 'PractitionerRole'
    ) as BundleEntry<PractitionerRole>[];

    const practitioners = data.filter(
      (item: BundleEntry) => item.resource?.resourceType === 'Practitioner'
    ) as BundleEntry<Practitioner>[];

    const healthcareServices = data.filter(
      (item: BundleEntry) => item.resource?.resourceType === 'HealthcareService'
    ) as BundleEntry<HealthcareService>[];

    const hsMap = new Map(
      healthcareServices
        .filter(hs => hs.resource?.id)
        .map(hs => [hs.resource.id, hs.resource.name ?? ''])
    );

    return practitioners
      .map((item): PractitionerListingEntry | null => {
        const practitionerId = item.resource.id;
        const role = practitionerRoles.find(
          r =>
            r.resource.practitioner.reference?.split('/')[1] === practitionerId
        );
        if (!role) return null;

        const name = item.resource.name?.[0];
        const practitionerName =
          [name?.given?.join(' '), name?.family].filter(Boolean).join(' ') ||
          '-';

        const photoUrl = item.resource.photo?.[0]?.url;

        const specialties: string[] = (
          role.resource.specialty?.map(s => s.text) ?? []
        ).filter(Boolean);

        const healthcareServiceNames =
          role.resource.healthcareService
            ?.map(ref => {
              const id = ref.reference?.split('/')[1];
              return id ? (hsMap.get(id) ?? '') : '';
            })
            .filter(Boolean) ?? [];

        return {
          id: practitionerId,
          practitionerName,
          photoUrl,
          specialties,
          healthcareServiceNames,
          practitionerRoleId: role.resource.id
        };
      })
      .filter((entry): entry is PractitionerListingEntry => entry !== null);
  }, [data]);

  return { practitioners, isLoading, isError, isFetching };
}
