export type PatientProfile = {
  fullName?: string;
  dateOfBirth?: string;
  email?: string;
  whatsappNumber?: string;
};

export const REQUIRED_PROFILE_FIELDS: (keyof PatientProfile)[] = [
  'fullName',
  'dateOfBirth',
  'email',
  'whatsappNumber'
];

export function isProfileComplete(profile?: PatientProfile): boolean {
  if (!profile) return false;

  return REQUIRED_PROFILE_FIELDS.every(field => Boolean(profile[field]));
}
