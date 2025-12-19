import { Patient, Practitioner } from 'fhir/r4';

export function isProfileComplete(
  profile?: Patient | Practitioner,
  email?: string
): boolean {
  if (!profile) return false;

  const name = profile.name?.[0];
  const hasRealName = !!name?.family || !!name?.given?.some(Boolean);

  const hasDOB = !!profile.birthDate;
  const hasEmail = !!email;

  const hasWhatsapp = profile.telecom?.some(
    t => t.system === 'phone' && t.use === 'mobile' && !!t.value
  );

  return hasRealName && hasDOB && hasEmail && hasWhatsapp;
}
