import { mergeNames } from '@/utils/helper';
import { roleToFhirResource } from '@/utils/role-fhir';
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

function buildBatchBody(
  userId: string,
  roles: string[]
): Record<string, unknown> {
  return {
    resourceType: 'Bundle',
    type: 'batch',
    entry: roles.map(role => ({
      request: {
        method: 'GET',
        url: `/${roleToFhirResource(role)}?identifier=https://login.konsulin.care/userid|${userId}`
      }
    }))
  };
}

function parseRoleProfileResponse(
  responseEntries: Bundle['entry'],
  roles: string[]
): RoleProfileMap {
  const result: RoleProfileMap = {};
  roles.forEach((role, index) => {
    const entry = responseEntries?.[index];
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
}

/**
 *
 */
export async function fetchRoleProfiles(
  userId: string,
  roles: string[]
): Promise<RoleProfileMap> {
  if (!userId || roles.length === 0) return {};

  try {
    const response = await apiRequest<Bundle>(
      'POST',
      '/fhir',
      buildBatchBody(userId, roles)
    );
    return parseRoleProfileResponse(response?.entry ?? [], roles);
  } catch (err) {
    console.error('Failed to fetch role profiles:', err);
    return {};
  }
}
