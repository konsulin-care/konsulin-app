import { mergeNames } from '@/utils/helper';
import { Patient, Practitioner } from 'fhir/r4';

export function isProfileComplete(
  profile?: Patient | Practitioner,
  email?: string
): boolean {
  if (!profile) return false;

  const hasFullName = !!mergeNames(profile.name);
  const hasDOB = !!profile.birthDate;
  const hasEmail = !!email;

  const hasWhatsapp = profile.telecom?.some(
    t => t.system === 'phone' && t.use === 'mobile' && !!t.value
  );

  return hasFullName && hasDOB && hasEmail && hasWhatsapp;
}
