import { useQuery } from '@tanstack/react-query';
import { type Bundle, type Location } from 'fhir/r4';
import { useMemo } from 'react';
import { getAPI } from './api';

// ---------------------------------------------------------------------------
// Work hours helper
// ---------------------------------------------------------------------------

/**
 * Determine today's operating hours from Location.hoursOfOperation.
 *
 * @param location - FHIR Location resource with optional hoursOfOperation
 * @returns "Open until {HH:mm}" if currently open, "Opens at {HH:mm}" if not yet open, or "Closed today"
 */
export function getTodayHours(location: Location): string {
  const hours = location.hoursOfOperation;
  if (!hours?.length) return 'Closed today';

  const todayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
  const todayName = todayNames[new Date().getDay()];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const entry = hours.find(h =>
    h.daysOfWeek?.some(d => d.toLowerCase() === todayName)
  );

  if (!entry?.openingTime || !entry?.closingTime) return 'Closed today';

  /** Parse HH:MM(:ss) to total minutes since midnight. */
  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const open = parseTime(entry.openingTime);
  const close = parseTime(entry.closingTime);
  const closingDisplay = entry.closingTime.split(':').slice(0, 2).join(':');
  const openingDisplay = entry.openingTime.split(':').slice(0, 2).join(':');

  if (currentMinutes >= open && currentMinutes < close) {
    return `Open until ${closingDisplay}`;
  }
  if (currentMinutes < open) {
    return `Opens at ${openingDisplay}`;
  }
  return 'Closed today';
}

// ---------------------------------------------------------------------------
// Role constants
// ---------------------------------------------------------------------------

const ROLE_PATIENT = 'Patient';
const ROLE_GUEST = 'Guest';
const ROLE_ADMIN = 'Clinic Admin';
const ROLE_PRACTITIONER = 'Practitioner';

// ---------------------------------------------------------------------------
// useListActiveOrganizations
// ---------------------------------------------------------------------------

/**
 * Fetch active organizations that have at least one active Location.
 * Returns data shaped as { code, name }[] for LocationCombobox compatibility.
 *
 * GET /fhir/Organization?active=true&_has:Location:organization:status=active&_elements=id,name
 */
export function useListActiveOrganizations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['active-organizations'],
    queryFn: async () => {
      const API = await getAPI();
      const url =
        '/fhir/Organization?active=true&_has:Location:organization:status=active&_elements=id,name';
      const response = await API.get<Bundle>(url);
      return (response.data.entry ?? []).map(e => ({
        code: (e.resource as { id: string }).id,
        name: (e.resource as { name?: string }).name ?? ''
      }));
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000
  });
}

// ---------------------------------------------------------------------------
// useClinicLocations
// ---------------------------------------------------------------------------

export type UseClinicLocationsParams = {
  role: string;
  fhirId?: string;
  orgId?: string;
  city?: string;
  organization?: string;
  province?: string;
};

/**
 * Fetch Location resources scoped to the user's role.
 *
 * Patient/Guest:  GET /fhir/Location
 * Clinic Admin:   GET /fhir/Location?organization=<orgId>
 * Practitioner:   GET /fhir/PractitionerRole?practitioner=<id>&_include=PractitionerRole:location
 */
export function useClinicLocations({
  role,
  fhirId,
  orgId,
  city,
  organization,
  province
}: UseClinicLocationsParams) {
  const url = useMemo(() => {
    let base: string;

    if (role === ROLE_ADMIN && orgId) {
      base = `/fhir/Location?organization=${orgId}`;
    } else if (role === ROLE_PRACTITIONER && fhirId) {
      base = `/fhir/PractitionerRole?practitioner=${fhirId}&_include=PractitionerRole:location`;
      return base;
    } else {
      base = '/fhir/Location';
    }

    // For non-Practitioner roles, append optional filters
    let sep = base.includes('?') ? '&' : '?';

    if (organization) {
      base += `${sep}organization=${encodeURIComponent(organization)}`;
      sep = '&';
    }

    if (province) {
      base += `${sep}address-state=${encodeURIComponent(province)}`;
      sep = '&';
    }

    if (city) {
      base += `${sep}address-city=${encodeURIComponent(city)}`;
    }

    return base;
  }, [role, fhirId, orgId, city, organization, province]);

  const enabled =
    role === ROLE_PATIENT ||
    role === ROLE_GUEST ||
    (role === ROLE_ADMIN && Boolean(orgId)) ||
    (role === ROLE_PRACTITIONER && Boolean(fhirId));

  return useQuery({
    queryKey: [
      'clinic-locations',
      role,
      fhirId,
      orgId,
      city,
      organization,
      province
    ],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(url);
      const entries = response.data.entry ?? [];

      return entries
        .filter(e => e.resource?.resourceType === 'Location')
        .map(e => e.resource as Location);
    },
    enabled
  });
}

// ---------------------------------------------------------------------------
// useClinicLocationPractitioners
// ---------------------------------------------------------------------------

/**
 * Fetch bundle entries for a given Location — two-step query.
 *
 * Step 1: GET /fhir/PractitionerRole?location=<id>&status=active
 *   &_include=PractitionerRole:practitioner
 *   &_include=PractitionerRole:service
 *   &_include=PractitionerRole:organization
 *   &_include=PractitionerRole:location
 *
 * Step 2 (fallback if step 1 returns nothing):
 *   GET /fhir/Location?_id=<id>&_include=Location:organization
 */
export function useClinicLocationPractitioners(locationId: string) {
  return useQuery({
    queryKey: ['clinic-location-practitioners', locationId],
    queryFn: async () => {
      const API = await getAPI();

      // Step 1: try PractitionerRole query with status=active
      const primaryResponse = await API.get<Bundle>(
        `/fhir/PractitionerRole?location=${encodeURIComponent(locationId)}&status=active` +
          '&_include=PractitionerRole:practitioner' +
          '&_include=PractitionerRole:service' +
          '&_include=PractitionerRole:organization' +
          '&_include=PractitionerRole:location'
      );
      const primaryEntries = primaryResponse.data.entry ?? [];
      if (primaryEntries.length > 0) {
        return primaryEntries;
      }

      // Step 2: fallback — fetch Location + Organization directly
      const fallbackResponse = await API.get<Bundle>(
        `/fhir/Location?_id=${encodeURIComponent(locationId)}&_include=Location:organization`
      );
      return fallbackResponse.data.entry ?? [];
    },
    enabled: Boolean(locationId)
  });
}
