'use client';

import { PROFILE_CACHE_STALE_MS } from '@/constants/profile';
import { useAuth } from '@/context/auth/authContext';
import { collapseHumanName } from '@/utils/fhir/human-name';
import { generateAvatarPlaceholder } from '@/utils/helper';
import { roleToFhirResource } from '@/utils/role-fhir';
import { format } from 'date-fns';
import type { CodeableConcept, Patient, Practitioner } from 'fhir/r4';
import { useEffect, useMemo } from 'react';

type ProfileResource = Patient | Practitioner;

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

/** True when every non-null role profile carries its full resource. */
function roleProfilesCarryResources(
  roleProfiles: Record<string, unknown> | undefined
): boolean {
  if (!roleProfiles) return false;
  return Object.values(roleProfiles).every(
    profile =>
      profile === null || Boolean((profile as { resource?: unknown }).resource)
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

/** Read the photo URL from a FHIR profile (always an Attachment array). */
function getPhotoUrl(profile: ProfileResource | undefined): string | undefined {
  return profile?.photo?.[0]?.url;
}

/**
 * Read the preferred communication language from Patient/Practitioner.
 * Patient wraps the language in `PatientCommunication.language` while
 * Practitioner stores the CodeableConcept directly.
 */
function getCommunicationLanguage(
  profile: ProfileResource | undefined
): string {
  if (!profile) return '-';
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
  seedId: string
): ProfileIdentity {
  const name = profile?.name?.[0];
  const displayName = collapseHumanName(name);
  const email = findTelecom(profile, 'email');
  const avatar = generateAvatarPlaceholder({
    id: seedId,
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

/** Personal-info rows; every role supports the language row. */
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
function buildSections(profile: ProfileResource | undefined): ProfileSection[] {
  return [
    {
      id: 'personal-info',
      title: 'Personal Information',
      rows: buildPersonalRows(profile, true)
    },
    { id: 'contact', title: 'Contact', rows: buildContactRows(profile) },
    { id: 'address', title: 'Address', rows: buildAddressRows(profile) }
  ];
}

/**
 * Read the current user's profile data straight from the auth cache.
 *
 * The auth bootstrap fetches the full profile bundle once and caches every
 * role resource in `userInfo.roleProfiles` (persisted to IndexedDB). This
 * hook renders from that cache — no per-visit query — and refreshes only
 * when the cache is stale or predates the full-resource cache shape.
 *
 * @param userId - The SuperTokens user ID.
 * @param roles - All roles of the user.
 * @param activeRole - The active role whose resource drives the shared cards.
 * @returns The active profile, the per-role profile map, identity block,
 *   display sections and the active role's resource type.
 */
export function useProfileData(
  userId: string,
  roles: string[],
  activeRole: string
) {
  const { state: authState, refreshProfiles } = useAuth();
  const userInfo = authState.userInfo;
  const roleProfiles = useMemo(
    () => userInfo?.roleProfiles ?? {},
    [userInfo?.roleProfiles]
  );
  const resourceType = roleToFhirResource(activeRole);

  const activeProfile = useMemo(
    () => roleProfiles[activeRole]?.resource ?? userInfo?.fullProfile,
    [roleProfiles, activeRole, userInfo?.fullProfile]
  );

  // Refresh the cache once when it is stale (>5 min) or carries no full
  // resources (old-shape cache from before the refactor).
  useEffect(() => {
    if (!userId) return;
    const cacheIsFresh =
      typeof userInfo?.cachedAt === 'number' &&
      Date.now() - userInfo.cachedAt <= PROFILE_CACHE_STALE_MS;
    if (!cacheIsFresh || !roleProfilesCarryResources(roleProfiles)) {
      // skipcq: JS-0098 - fire-and-forget cache refresh; errors handled in auth context
      void refreshProfiles?.();
    }
  }, [userId, userInfo?.cachedAt, roleProfiles, refreshProfiles]);

  const identity = useMemo(
    () => buildIdentity(activeProfile, activeProfile?.id ?? userId),
    [activeProfile, userId]
  );
  const sections = useMemo(() => buildSections(activeProfile), [activeProfile]);

  return {
    profileData: activeProfile,
    roleProfiles,
    identity,
    sections,
    resourceType
  };
}
