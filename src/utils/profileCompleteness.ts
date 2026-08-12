import type { Patient, Person, Practitioner } from 'fhir/r4';

type ProfileResource = Patient | Practitioner | Person;

/** Check whether the profile has at least one non-empty name part. */
function hasName(profile: ProfileResource | undefined): boolean {
  return (
    Array.isArray(profile?.name) &&
    profile.name.some(
      n => (Array.isArray(n.given) && n.given.length > 0) || Boolean(n.family)
    )
  );
}

/**
 * Check whether a communication language is present. Patient wraps the
 * language in `PatientCommunication.language`; Practitioner stores the
 * CodeableConcept directly. Person has no language field.
 */
function hasLanguage(profile: ProfileResource | undefined): boolean {
  if (!profile) return false;
  if (profile.resourceType === 'Person') return true;
  if (profile.resourceType === 'Practitioner') {
    return Boolean(profile.communication?.[0]);
  }
  return Boolean(profile.communication?.[0]?.language);
}

/**
 * Check whether a FHIR profile is complete: a non-empty name (given or
 * family), gender and birthDate are required for every resource type.
 * Patient/Practitioner additionally require a communication language;
 * Person-based roles (Clinic Admin, Researcher) never fail on language.
 *
 * @param profile - The FHIR profile resource to evaluate.
 * @returns True when the profile passes the completeness rules.
 */
export const isProfileCompleteFromFHIR = (
  profile: ProfileResource | undefined
): boolean => {
  return (
    hasName(profile) &&
    Boolean(profile?.gender) &&
    Boolean(profile?.birthDate) &&
    hasLanguage(profile)
  );
};
