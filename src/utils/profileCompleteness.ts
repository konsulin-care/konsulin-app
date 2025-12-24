import { Patient, Practitioner } from 'fhir/r4';

export const isProfileCompleteFromFHIR = (
  profile: Patient | Practitioner
): boolean => {
  const hasName =
    Array.isArray(profile?.name) &&
    profile.name.some(n => Array.isArray(n.given) && n.given.length > 0);

  const hasDob = Boolean(profile?.birthDate);

  const hasWhatsapp =
    Array.isArray(profile?.telecom) &&
    profile.telecom.some(
      item => item.system === 'phone' && typeof item.value === 'string'
    );

  return hasName && hasDob && hasWhatsapp;
};
