import { getAPI } from '@/services/api';
import type { Bundle, Practitioner, PractitionerRole, Schedule } from 'fhir/r4';

type PractitionerName = {
  use: string;
  family: string;
  given: string[];
};

/**
 * Parse full name into FHIR HumanName parts.
 * Last space-separated token becomes family name, rest become given names.
 */
export function parseName(fullName: string): PractitionerName {
  const parts = fullName.trim().split(/\s+/);
  const given = parts.slice(0, -1);
  const family = parts.at(-1) ?? '';
  return {
    use: 'official',
    family,
    given: given.length > 0 ? given : [family]
  };
}

/** Extract first entry ID from a FHIR Bundle search response. */
export function extractFirstEntryId(data: Bundle | undefined): string | null {
  const entry = data?.entry?.[0]?.resource;
  return entry?.id ?? null;
}

/** Resolve existing Practitioner by email or create one. */
export async function resolveOrCreatePractitioner(
  API: Awaited<ReturnType<typeof getAPI>>,
  email: string,
  name: string
): Promise<{ id: string; created: boolean }> {
  const searchResponse = await API.get<Bundle>(
    `/fhir/Practitioner?email=${encodeURIComponent(email)}&_elements=name`
  );

  const existingId = extractFirstEntryId(searchResponse.data);
  if (existingId) return { id: existingId, created: false };

  const parsedName = parseName(name);
  const createResponse = await API.post<Practitioner>('/fhir/Practitioner', {
    resourceType: 'Practitioner',
    active: true,
    name: [parsedName],
    telecom: [
      {
        system: 'email',
        value: email,
        use: 'work'
      }
    ]
  });

  return { id: createResponse.data.id ?? '', created: true };
}

/** Resolve existing PractitionerRole or create one. */
export async function resolveOrCreatePractitionerRole(
  API: Awaited<ReturnType<typeof getAPI>>,
  practitionerId: string,
  orgId: string,
  locId: string
): Promise<string> {
  const params: string[] = [
    `organization=Organization/${orgId}`,
    `practitioner=Practitioner/${practitionerId}`
  ];

  if (locId) {
    params.push(`location=Location/${locId}`);
  }

  const searchResponse = await API.get<Bundle>(
    `/fhir/PractitionerRole?${params.join('&')}`
  );

  const existingId = extractFirstEntryId(searchResponse.data);
  if (existingId) return existingId;

  const payload: Record<string, unknown> = {
    resourceType: 'PractitionerRole',
    active: true,
    practitioner: {
      reference: `Practitioner/${practitionerId}`
    },
    organization: {
      reference: `Organization/${orgId}`
    }
  };

  if (locId) {
    payload.location = {
      reference: `Location/${locId}`
    };
  }

  const createResponse = await API.post<PractitionerRole>(
    '/fhir/PractitionerRole',
    payload
  );
  return createResponse.data.id ?? '';
}

/** Resolve existing Schedule or create one. */
export async function resolveOrCreateSchedule(
  API: Awaited<ReturnType<typeof getAPI>>,
  practitionerId: string,
  roleId: string
): Promise<string> {
  const searchResponse = await API.get<Bundle>(
    `/fhir/Schedule?actor=PractitionerRole/${roleId}`
  );

  const existingId = extractFirstEntryId(searchResponse.data);
  if (existingId) return existingId;

  const createResponse = await API.post<Schedule>('/fhir/Schedule', {
    resourceType: 'Schedule',
    actor: [
      { reference: `Practitioner/${practitionerId}` },
      { reference: `PractitionerRole/${roleId}` }
    ]
  });

  return createResponse.data.id ?? '';
}
