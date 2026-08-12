'use client';

import { getProfileById } from '@/services/profile';
import { collapseHumanName } from '@/utils/fhir/human-name';
import { generateAvatarPlaceholder } from '@/utils/helper';
import { roleToFhirResource, type FhirResourceType } from '@/utils/role-fhir';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { CodeableConcept, Patient, Person, Practitioner } from 'fhir/r4';
import { useMemo } from 'react';

type ProfileResource = Patient | Practitioner | Person;

export type ProfileRow = { id: string; key: string; value: string };
export type ProfileSection = { id: string; title: string; rows: ProfileRow[] };

export type ProfileIdentity = {
  photoUrl?: string;
  initials: string;
  backgroundColor: string;
  seed: string;
  displayName: string;
  given: string[];
  family?: string;
};

/** Narrow the profile union to Patient/Practitioner (both have communication). */
function isPatientOrPractitioner(
  profile: ProfileResource
): profile is Patient | Practitioner {
  return (
    profile.resourceType === 'Patient' ||
    profile.resourceType === 'Practitioner'
  );
}

/** Read a telecom value (email/phone) from a FHIR profile. */
function findTelecom(profile: ProfileResource | undefined, system: string) {
  if (!profile || !Array.isArray(profile.telecom)) return '-';
  return profile.telecom.find(item => item.system === system)?.value ?? '-';
}

/** Capitalize a FHIR gender code for display. */
function formatGender(gender?: string): string {
  if (!gender) return '-';
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
}

/** Format a FHIR birthDate for display, falling back to the raw value. */
function formatBirthDate(birthDate?: string): string {
  if (!birthDate) return '-';
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return birthDate;
  return format(date, 'dd MMM yyyy');
}

/**
 * Photo shape differs per resource: Patient/Practitioner store `photo[]`
 * while Person stores a single Attachment.
 */
function getPhotoUrl(profile: ProfileResource | undefined): string | undefined {
  if (!profile) return undefined;
  if (isPatientOrPractitioner(profile)) return profile.photo?.[0]?.url;
  return profile.photo?.url;
}

/**
 * Read the preferred communication language from Patient/Practitioner.
 * Patient wraps the language in `PatientCommunication.language` while
 * Practitioner stores the CodeableConcept directly.
 */
function getCommunicationLanguage(
  profile: ProfileResource | undefined
): string {
  if (!profile || !isPatientOrPractitioner(profile)) return '-';
  const concept =
    profile.resourceType === 'Practitioner'
      ? profile.communication?.[0]
      : profile.communication?.[0]?.language;
  return conceptDisplay(concept);
}

/** Render a CodeableConcept using its display, code, or text fallback. */
function conceptDisplay(concept?: CodeableConcept): string {
  if (!concept) return '-';
  const coding = concept.coding?.[0];
  if (coding?.display) return coding.display;
  if (coding?.code) return coding.code;
  return concept.text ?? '-';
}

/** Build the identity block (photo, initials, collapsed name parts). */
function buildIdentity(
  profile: ProfileResource | undefined,
  fhirId: string
): ProfileIdentity {
  const name = profile?.name?.[0];
  const displayName = collapseHumanName(name);
  const email = findTelecom(profile, 'email');
  const avatar = generateAvatarPlaceholder({
    id: fhirId,
    name: displayName,
    email: email === '-' ? undefined : email
  });
  return {
    photoUrl: getPhotoUrl(profile),
    initials: avatar.initials ?? '',
    backgroundColor: avatar.backgroundColor ?? '',
    seed: avatar.seed ?? '',
    displayName,
    given: name?.given ?? [],
    family: name?.family
  };
}

/** Personal-info rows; Person-based roles omit the language row. */
function buildPersonalRows(
  profile: ProfileResource | undefined,
  supportsLanguage: boolean
): ProfileRow[] {
  const rows: ProfileRow[] = [
    { id: 'gender', key: 'Gender', value: formatGender(profile?.gender) },
    {
      id: 'birthDate',
      key: 'Date of Birth',
      value: formatBirthDate(profile?.birthDate)
    }
  ];
  if (supportsLanguage) {
    rows.push({
      id: 'language',
      key: 'Language',
      value: getCommunicationLanguage(profile)
    });
  }
  return rows;
}

/** Contact rows from the telecom array. */
function buildContactRows(profile: ProfileResource | undefined): ProfileRow[] {
  return [
    { id: 'email', key: 'Email', value: findTelecom(profile, 'email') },
    { id: 'phone', key: 'Phone', value: findTelecom(profile, 'phone') }
  ];
}

/** Address rows from the first address entry. */
function buildAddressRows(profile: ProfileResource | undefined): ProfileRow[] {
  const address = profile?.address?.[0];
  return [
    { id: 'line', key: 'Line', value: address?.line?.join(', ') ?? '-' },
    { id: 'district', key: 'District', value: address?.district ?? '-' },
    { id: 'city', key: 'City', value: address?.city ?? '-' },
    { id: 'state', key: 'Province', value: address?.state ?? '-' },
    { id: 'postalCode', key: 'Postal Code', value: address?.postalCode ?? '-' }
  ];
}

/** Build the uniform section list shared by every role. */
function buildSections(
  profile: ProfileResource | undefined,
  resourceType: FhirResourceType
): ProfileSection[] {
  const supportsLanguage =
    resourceType === 'Patient' || resourceType === 'Practitioner';
  return [
    {
      id: 'personal-info',
      title: 'Personal Information',
      rows: buildPersonalRows(profile, supportsLanguage)
    },
    { id: 'contact', title: 'Contact', rows: buildContactRows(profile) },
    { id: 'address', title: 'Address', rows: buildAddressRows(profile) }
  ];
}

/**
 * Fetch and transform the current user's FHIR profile into a uniform shape
 * shared by every role. The resource type is derived from the active role,
 * and the query key stays `['profile-data', fhirId]` so existing cache
 * invalidation keeps working.
 *
 * @param fhirId - The active role's FHIR resource id.
 * @param roleName - The active role name (Patient, Practitioner, Clinic Admin, Researcher).
 * @returns Profile data, loading flag, identity block and display sections.
 */
export function useProfileData(fhirId: string, roleName: string) {
  const resourceType = roleToFhirResource(roleName);

  const { data: profileData, isLoading } = useQuery<ProfileResource>({
    queryKey: ['profile-data', fhirId],
    queryFn: () => getProfileById(fhirId, resourceType),
    enabled: Boolean(fhirId)
  });

  const identity = useMemo(
    () => buildIdentity(profileData, fhirId),
    [profileData, fhirId]
  );
  const sections = useMemo(
    () => buildSections(profileData, resourceType),
    [profileData, resourceType]
  );

  return { profileData, isLoading, identity, sections, resourceType };
}
