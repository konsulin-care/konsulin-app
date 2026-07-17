import { useQuery } from '@tanstack/react-query';
import {
  Bundle,
  BundleEntry,
  HealthcareService,
  Location,
  Organization,
  Practitioner,
  PractitionerRole,
  Schedule
} from 'fhir/r4';
import { useMemo } from 'react';
import { getAPI } from './api';

/** Practitioner detail data type. */
export type DetailPractitionerData = Omit<BundleEntry, 'resource'> & {
  resource: PractitionerRole;
  location?: Location;
  organization?: Organization;
  practitioner?: Practitioner;
  schedule?: Schedule;
  healthcareServices: HealthcareService[];
};

/** Fetch practitioner detail including schedule, services, and location. */
export const useDetailPractitioner = (practitionerRoleId: string) => {
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['practitioner-detail', practitionerRoleId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/PractitionerRole?active=true&_id=${practitionerRoleId}&_include=PractitionerRole:organization&_include=PractitionerRole:location&_include=PractitionerRole:practitioner&_include=PractitionerRole:service&_revinclude=Schedule:actor`
      );
      return response;
    },
    select: response => response.data.entry ?? null,
    enabled: Boolean(practitionerRoleId)
  });

  let practitionerRole: BundleEntry | undefined;
  let organization: BundleEntry | undefined;
  let location: BundleEntry | undefined;
  let practitioner: BundleEntry | undefined;
  let schedules: BundleEntry | undefined;
  let newData: DetailPractitionerData | undefined;

  if (data) {
    practitionerRole = data.find(
      (item: BundleEntry) => item.resource?.resourceType === 'PractitionerRole'
    );
    organization = data.find(
      (item: BundleEntry) => item.resource?.resourceType === 'Organization'
    );
    location = data.find(
      (item: BundleEntry) => item.resource?.resourceType === 'Location'
    );
    practitioner = data.find(
      (item: BundleEntry) => item.resource?.resourceType === 'Practitioner'
    );
    schedules = data.find(
      (item: BundleEntry) => item.resource?.resourceType === 'Schedule'
    );

    const healthcareServices = data
      .filter(
        (item: BundleEntry) =>
          item.resource?.resourceType === 'HealthcareService'
      )
      .map((item: BundleEntry) => item.resource as HealthcareService);

    newData = {
      ...practitionerRole,
      location: location?.resource as Location | undefined,
      organization: organization?.resource as Organization | undefined,
      practitioner: practitioner?.resource as Practitioner | undefined,
      schedule: schedules?.resource as Schedule | undefined,
      healthcareServices
    } as DetailPractitionerData;
  }

  return { newData, isLoading, isError, isFetching };
};

/** Return type for usePractitionerListing. */
export type PractitionerListingEntry = {
  id: string;
  active: boolean;
  practitionerName: string;
  photoUrl: string | undefined;
  specialties: string[];
  healthcareServiceNames: string[];
  practitionerRoleId: string;
};

/**
 * Fetch HealthcareService resources linked to a practitioner role.
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
 * Fetch practitioners for a clinic, optionally scoped to a location.
 */
export function usePractitionerListing(clinicId: string, locationId?: string) {
  const url = useMemo(() => {
    const filter = locationId
      ? `location=Location/${locationId}`
      : `organization=${clinicId}`;

    return (
      `/fhir/PractitionerRole?${filter}` +
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
          active: role.resource.active ?? false,
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

export interface OrganizationLocation {
  id: string;
  name: string;
}

/**
 * Fetch Location resources for the current organization.
 */
export function useOrganizationLocations(clinicId: string) {
  const {
    data: locations,
    isLoading,
    isError,
    isFetching
  } = useQuery({
    queryKey: ['organization-locations', clinicId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle<Location>>(
        `/fhir/Location?organization=${clinicId}&_elements=name,id`
      );
      const entries = response.data.entry ?? [];
      return entries
        .filter((e: BundleEntry) => e.resource?.resourceType === 'Location')
        .map((e: BundleEntry) => {
          const loc = e.resource as Location;
          return { id: loc.id ?? '', name: loc.name ?? '' };
        });
    },
    enabled: Boolean(clinicId)
  });

  return { locations: locations ?? [], isLoading, isError, isFetching };
}
