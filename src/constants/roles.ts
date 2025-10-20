// all known roles must be defined here. This
// constant wasn't intended to be used to represent
// FHIR resources
export const Roles = {
  Practitioner: 'Practitioner',
  Patient: 'Patient',
  Guest: 'Guest'
} as const;
