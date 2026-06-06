import { Roles } from '@/constants/roles';
import { mergeNames } from '@/utils/helper';
import { Bundle, HumanName } from 'fhir/r4';
import { apiRequest } from './api';

interface FhirEntry {
  id?: string;
  name?: HumanName[];
  photo?: { url?: string }[];
  telecom?: { system?: string; value?: string }[];
}

export type RoleProfile = {
  fhirId: string;
  profile_picture: string;
  fullname: string;
  email: string;
};

export type RoleProfileMap = Record<string, RoleProfile>;

const ROLE_TO_RESOURCE: Record<string, string> = {
  [Roles.Patient]: 'Patient',
  [Roles.Practitioner]: 'Practitioner',
  [Roles.ClinicAdmin]: 'Person'
};

function resourceForRole(role: string): string {
  return ROLE_TO_RESOURCE[role] || 'Patient';
}

function extractEmail(resource: FhirEntry): string {
  const telecom = resource?.telecom;
  if (!Array.isArray(telecom)) return '';
  const entry = telecom.find(t => t?.system === 'email');
  return entry?.value || '';
}

function extractPhoto(resource: FhirEntry): string {
  const photo = resource?.photo;
  if (!photo) return '';
  if (Array.isArray(photo)) return photo[0]?.url || '';
  return '';
}

export async function fetchRoleProfiles(
  userId: string,
  roles: string[]
): Promise<RoleProfileMap> {
  if (!userId || roles.length === 0) return {};

  const batchBody = {
    resourceType: 'Bundle',
    type: 'batch',
    entry: roles.map(role => ({
      request: {
        method: 'GET' as const,
        url: `/${resourceForRole(role)}?identifier=https://login.konsulin.care/userid|${userId}`
      }
    }))
  };

  try {
    const response = await apiRequest<Bundle>(
      'POST',
      '/fhir',
      batchBody as unknown as Record<string, unknown>
    );
    const responseEntries = response?.entry ?? [];
    const result: RoleProfileMap = {};

    roles.forEach((role, index) => {
      const entry = responseEntries[index];
      const resource = entry?.resource as FhirEntry | undefined;
      if (!resource?.id) {
        result[role] = {
          fhirId: '',
          profile_picture: '',
          fullname: '',
          email: ''
        };
        return;
      }
      result[role] = {
        fhirId: resource.id ?? '',
        profile_picture: extractPhoto(resource),
        fullname: resource.name ? mergeNames(resource.name) : '',
        email: extractEmail(resource)
      };
    });

    return result;
  } catch {
    return {};
  }
}
